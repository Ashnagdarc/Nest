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

type AnnouncementInsert = {
    title: string;
    content: string;
    created_at?: string;
    created_by: string;
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

            // Step 3: Use direct RPC call to bypass schema cache issue
            // This uses a Postgres function call instead of the REST API that's having schema cache issues
            const { data, error } = await supabase.rpc('create_announcement', {
                p_title: newTitle,
                p_content: newContent,
                p_user_id: user.id
            });

            // Enhanced error logging
            console.log("Complete response from RPC call:", { data, error });

            // Detailed error logging
            if (error) {
                console.error("Error posting announcement:", {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    fullError: JSON.stringify(error, null, 2)
                });
                throw new Error(error.message || 'Unknown error');
            } else if (!data) {
                // Handle the case where there's no error but also no data
                console.error("No data returned from insert operation");
                throw new Error('No data returned');
            }

            console.log("Announcement posted successfully:", data);

            // Reset form and update UI on success
            setNewTitle('');
            setNewContent('');
            setIsModalOpen(false);
            showSuccessFeedback({ toast: { title: "Success", description: "Announcement posted successfully." }, onSuccess: () => setTimeout(() => { fetchAnnouncements(); }, 500) });
        } catch (e: any) {
            showErrorFeedback({ toast: { title: "Error", description: e.message || "Failed to post announcement." } });
        } finally {
            setLoading(false);
        }
    };

    // Correct single declaration for handleDeleteAnnouncement
    const handleDeleteAnnouncement = async (announcementId: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', announcementId);

            if (error) {
                showErrorFeedback({ toast: { title: "Error", description: "Failed to delete announcement." } });
                return;
            }

            showSuccessFeedback({ toast: { title: "Success", description: "Announcement deleted successfully." }, onSuccess: () => fetchAnnouncements() });
        } catch (e: any) {
            showErrorFeedback({ toast: { title: "Error", description: e.message || "Failed to delete announcement." } });
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
            transition={{ duration: 0.5 }}
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
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Posting...' : 'Post Announcement'}
                                </Button>
                            </DialogFooter>
                        </form>
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
