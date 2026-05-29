"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone } from 'lucide-react';
import { format } from 'date-fns';

// Type for announcements
type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    created_by: string | null;
};

export default function UserAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    async function fetchAnnouncements() {
        setLoading(true);
        console.log("User: Fetching announcements...");

        try {
            const res = await fetch('/api/announcements?limit=50&page=1', { cache: 'no-store' });
            if (!res.ok) {
                setLoading(false);
                return;
            }
            const payload = await res.json();
            const rows = Array.isArray(payload?.announcements) ? payload.announcements : [];
            if (rows.length) {
                setAnnouncements(rows.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    content: a.content,
                    createdAt: new Date(a.created_at),
                    created_by: a.created_by || null,
                })));
            }
            setLoading(false);
        } catch (e) {
            console.error("Unexpected error in fetchAnnouncements:", e);
            setLoading(false);
        }
    }

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
            className="space-y-6 container mx-auto py-6"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-foreground">Company Announcements</h1>
            </div>

            {loading ? (
                <div className="py-10 text-center">
                    <p className="text-muted-foreground">Loading announcements...</p>
                </div>
            ) : (
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
                                        <div className="flex items-start">
                                            <div className="flex items-center gap-2">
                                                <Megaphone className="h-5 w-5 text-primary" />
                                                <CardTitle>{announcement.title}</CardTitle>
                                            </div>
                                        </div>
                                        <CardDescription className="text-xs">
                                            Posted on {format(announcement.createdAt, 'PPP')}
                                        </CardDescription>
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
                                    <p className="text-muted-foreground">No announcements have been posted yet.</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
} 
