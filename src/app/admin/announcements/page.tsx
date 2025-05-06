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

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    author_id: string | null;
};

export default function AnnouncementsPage() {
    const supabase = createClient();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    async function fetchAnnouncements() {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAnnouncements(data.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                createdAt: new Date(a.created_at),
                author_id: a.author_id || null,
            })));
        }
    }

    const handleAddAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newContent) {
            toast({ title: "Error", description: "Title and content cannot be empty.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to post announcements.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        const { error } = await supabase
            .from('announcements')
            .insert([{
                title: newTitle,
                content: newContent,
                author_id: user.id,
                created_at: new Date().toISOString(),
            }]);

        if (error) {
            toast({ title: "Error", description: "Failed to post announcement.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        setNewTitle('');
        setNewContent('');
        setIsSubmitting(false);
        setIsModalOpen(false);
        toast({ title: "Success", description: "Announcement posted successfully." });
        fetchAnnouncements();
    };

    const handleDeleteAnnouncement = async (announcementId: string) => {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcementId);

        if (error) {
            toast({ title: "Error", description: "Failed to delete announcement.", variant: "destructive" });
            return;
        }

        toast({ title: "Success", description: "Announcement deleted." });
        fetchAnnouncements();
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
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Posting...' : 'Post Announcement'}
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
                                                Posted by {announcement.author_id || 'Unknown'} on {format(announcement.createdAt, 'PPP')}
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
