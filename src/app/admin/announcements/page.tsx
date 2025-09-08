"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Megaphone, PlusCircle, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
// import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabase = createClient();

// Temporary type definitions since supabase.ts isn't available
type AnnouncementRow = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    created_by: string | null;
    updated_at?: string;
};


// Original type definition using the Database type
// type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];
// type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert'];

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    created_by: string | null;
};

export default function AnnouncementsPage() {
    const { toast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [sendNotifications, setSendNotifications] = useState(true);
    const { showSuccessFeedback, showErrorFeedback, loading, setLoading } = useSuccessFeedback();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    async function fetchAnnouncements() {
        console.log("Admin: Fetching announcements...");
        try {
            // Get announcements directly with SQL query for most reliable results
            const { data, error } = await supabase.rpc('get_all_announcements');

            // If RPC fails, fall back to regular query
            if (error) {
                console.error("Error using RPC to fetch announcements:", error);
                console.log("Falling back to direct query...");

                const { data: directData, error: directError } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (directError) {
                    console.error("Error fetching announcements:", directError);
                    toast({
                        title: "Error",
                        description: "Failed to fetch announcements. Please refresh the page.",
                        variant: "destructive"
                    });
                    return;
                }

                console.log("Admin: Announcements fetched via direct query:", directData);
                if (directData) {
                    setAnnouncements(directData.map((a: AnnouncementRow) => ({
                        id: a.id,
                        title: a.title,
                        content: a.content,
                        createdAt: new Date(a.created_at),
                        created_by: a.created_by || null,
                    })));
                }
                return;
            }

            console.log("Admin: Announcements fetched via RPC:", data);
            if (data) {
                setAnnouncements(data.map((a: AnnouncementRow) => ({
                    id: a.id,
                    title: a.title,
                    content: a.content,
                    createdAt: new Date(a.created_at),
                    created_by: a.created_by || null,
                })));
            }
        } catch (e) {
            console.error("Unexpected error in fetchAnnouncements:", e);
            toast({
                title: "Error",
                description: "An unexpected error occurred while fetching announcements.",
                variant: "destructive"
            });
        }
    }

    const handleAddAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newContent) {
            showErrorFeedback({ toast: { title: "Error", description: "Title and content cannot be empty." } });
            return;
        }
        setLoading(true);
        try {
            // Step 1: Check user auth status (for debugging)
            const { data: { user } } = await supabase.auth.getUser();
            console.log("Current user:", user);

            if (!user) {
                toast({ title: "Error", description: "You must be logged in to post announcements.", variant: "destructive" });
                setLoading(false);
                return;
            }

            // Step 2: Get the user profile info with role (for debugging)
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role, id')
                .eq('id', user.id)
                .single();

            console.log("User profile:", profileData, "Error:", profileError);

            // Step 3: Use the new API with notification support
            const response = await fetch('/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newTitle,
                    content: newContent,
                    author_id: user.id,
                    send_notifications: sendNotifications
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create announcement');
            }

            console.log("Announcement posted successfully:", result);

            // Reset form and update UI on success
            setNewTitle('');
            setNewContent('');
            setIsModalOpen(false);

            // Show success message with notification stats
            let successMessage = "Announcement posted successfully.";
            if (sendNotifications && result.stats) {
                successMessage += ` Sent ${result.stats.notificationsSent} notifications and ${result.stats.emailsSent} emails.`;
                if (result.stats.errors && result.stats.errors.length > 0) {
                    successMessage += ` (${result.stats.errors.length} errors occurred)`;
                }
            }

            showSuccessFeedback({
                toast: {
                    title: "Success",
                    description: successMessage
                },
                onSuccess: () => setTimeout(() => { fetchAnnouncements(); }, 500)
            });
        } catch (e: any) {
            showErrorFeedback({ toast: { title: "Error", description: e.message || "Failed to post announcement." } });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAnnouncement = async (announcementId: string) => {
        // Optimistic UI update
        setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
        setLoading(true);
        try {
            const response = await fetch(`/api/announcements/${announcementId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            const result = await response.json();
            if (!response.ok || result?.error) {
                throw new Error(result?.details || result?.error || 'Failed to delete announcement');
            }
            showSuccessFeedback({ toast: { title: 'Deleted', description: 'Announcement deleted successfully.' } });
            // Re-fetch after a short delay to account for DB replication lag
            setTimeout(() => { fetchAnnouncements(); }, 300);
        } catch (e: any) {
            // Revert optimistic update on error
            await fetchAnnouncements();
            showErrorFeedback({ toast: { title: 'Error', description: e.message || 'Failed to delete announcement.' } });
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Announcement
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                        <div className="max-h-[100dvh] overflow-y-auto px-1 pb-32 sm:pb-8">
                            <DialogHeader>
                                <DialogTitle>Create New Announcement</DialogTitle>
                                <DialogDescription>
                                    Write and post a new announcement for all users.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddAnnouncement} className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="announcement-title">Title</Label>
                                    <Input
                                        id="announcement-title"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="Announcement Title"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="announcement-content">Content</Label>
                                    <Textarea
                                        id="announcement-content"
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="Write your announcement here..."
                                        rows={5}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="send-notifications"
                                        checked={sendNotifications}
                                        onChange={(e) => setSendNotifications(e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    />
                                    <Label htmlFor="send-notifications" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Send notifications and emails to all users
                                    </Label>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Posting...' : 'Post Announcement'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List of Existing Announcements */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
            >
                {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                        <motion.div key={announcement.id} variants={itemVariants}>
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Megaphone className="h-5 w-5 text-primary" />
                                                {announcement.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs mt-1">
                                                Posted by {announcement.created_by || 'Unknown'} on {format(announcement.createdAt, 'PPP')}
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" disabled> {/* TODO: Implement Edit */}
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="text-center py-10">
                            <CardContent>
                                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No announcements posted yet.</p>
                                <Button variant="link" className="mt-2" onClick={() => setIsModalOpen(true)}>
                                    Create your first announcement
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}
