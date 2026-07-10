"use client";

import { useMemo, useState } from 'react';
import { Megaphone, Newspaper } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ListSkeleton } from '@/components/dashboard/ListSkeleton';
import ErrorDisplay from '@/components/ui/error-display';
import { AnnouncementCard, AnnouncementsEmptyState } from '@/components/announcements/AnnouncementCard';
import { AnnouncementFormDialog, type AnnouncementFormValues } from '@/components/announcements/AnnouncementFormDialog';
import { AnnouncementsPageHeader } from '@/components/announcements/AnnouncementsPageHeader';
import type { Announcement } from '@/components/announcements/types';
import { useAnnouncements } from '@/hooks/announcements/useAnnouncements';
import { createClient } from '@/lib/supabase/client';

export default function AnnouncementsPage() {
    const { toast } = useToast();
    const supabase = createClient();
    const {
        announcements,
        total,
        loading,
        isRefreshing,
        error,
        fetchAnnouncements,
    } = useAnnouncements(100);

    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredAnnouncements = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return announcements;
        return announcements.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query) ||
                item.authorName?.toLowerCase().includes(query)
        );
    }, [announcements, search]);

    const openCreateDialog = () => {
        setFormMode('create');
        setSelectedAnnouncement(null);
        setFormOpen(true);
    };

    const openEditDialog = (announcement: Announcement) => {
        setFormMode('edit');
        setSelectedAnnouncement(announcement);
        setFormOpen(true);
    };

    const handleSubmit = async (values: AnnouncementFormValues) => {
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('You must be logged in to manage announcements.');

            if (formMode === 'create') {
                const response = await fetch('/api/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: values.title,
                        content: values.content,
                        author_id: user.id,
                        send_notifications: values.sendNotifications,
                    }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to create announcement');

                let description = 'Announcement published successfully.';
                if (values.sendNotifications && result.stats) {
                    description += ` Sent ${result.stats.notificationsSent} notifications and ${result.stats.emailsSent} emails.`;
                }
                toast({ title: 'Published', description });
            } else if (selectedAnnouncement) {
                const response = await fetch(`/api/announcements/${selectedAnnouncement.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: values.title,
                        content: values.content,
                    }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to update announcement');
                toast({ title: 'Updated', description: 'Announcement saved successfully.' });
            }

            setFormOpen(false);
            setSelectedAnnouncement(null);
            await fetchAnnouncements({ silent: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Action failed';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/announcements/${deleteTarget.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete announcement');
            toast({ title: 'Deleted', description: 'Announcement removed.' });
            setDeleteTarget(null);
            await fetchAnnouncements({ silent: true });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete announcement';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-4xl space-y-6">
            <AnnouncementsPageHeader
                title="Announcements"
                description="Publish updates and keep everyone informed."
                isRefreshing={isRefreshing}
                onRefresh={() => void fetchAnnouncements({ silent: true })}
                onCreate={openCreateDialog}
                createLabel="New announcement"
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Card className="border-border/50">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Newspaper className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total published</p>
                            <p className="text-2xl font-semibold">{loading ? '—' : total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 sm:col-span-2">
                    <CardContent className="p-4">
                        <Input
                            placeholder="Search by title, message, or author..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </CardContent>
                </Card>
            </div>

            {error ? (
                <ErrorDisplay error={error} onRetry={() => void fetchAnnouncements()} />
            ) : loading ? (
                <ListSkeleton rows={4} />
            ) : filteredAnnouncements.length === 0 ? (
                <AnnouncementsEmptyState onCreate={announcements.length === 0 ? openCreateDialog : undefined} />
            ) : (
                <div className="space-y-4">
                    {filteredAnnouncements.map((announcement) => (
                        <AnnouncementCard
                            key={announcement.id}
                            announcement={announcement}
                            showAdminActions
                            expanded
                            onEdit={() => openEditDialog(announcement)}
                            onDelete={() => setDeleteTarget(announcement)}
                        />
                    ))}
                </div>
            )}

            <AnnouncementFormDialog
                open={formOpen}
                mode={formMode}
                announcement={selectedAnnouncement}
                isSubmitting={isSubmitting}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setSelectedAnnouncement(null);
                }}
                onSubmit={handleSubmit}
            />

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete announcement</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                void handleDelete();
                            }}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
