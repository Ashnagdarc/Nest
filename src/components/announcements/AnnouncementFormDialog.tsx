"use client";

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Announcement } from '@/components/announcements/types';

export interface AnnouncementFormValues {
    title: string;
    content: string;
    sendNotifications: boolean;
}

interface AnnouncementFormDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    announcement?: Announcement | null;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AnnouncementFormValues) => Promise<void>;
}

export function AnnouncementFormDialog({
    open,
    mode,
    announcement,
    isSubmitting,
    onOpenChange,
    onSubmit,
}: AnnouncementFormDialogProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [sendNotifications, setSendNotifications] = useState(true);

    useEffect(() => {
        if (!open) return;
        setTitle(announcement?.title ?? '');
        setContent(announcement?.content ?? '');
        setSendNotifications(mode === 'create');
    }, [open, announcement, mode]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!title.trim() || !content.trim()) return;
        await onSubmit({
            title: title.trim(),
            content: content.trim(),
            sendNotifications: mode === 'create' ? sendNotifications : false,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Create announcement' : 'Edit announcement'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create'
                            ? 'Share updates with everyone in the organization.'
                            : 'Update the title or message for this announcement.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="announcement-title">Title</Label>
                        <Input
                            id="announcement-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="e.g. New gear available"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="announcement-content">Message</Label>
                        <Textarea
                            id="announcement-content"
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Write the announcement details..."
                            rows={6}
                        />
                    </div>
                    {mode === 'create' ? (
                        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                            <Checkbox
                                id="send-notifications"
                                checked={sendNotifications}
                                onCheckedChange={(checked) => setSendNotifications(checked === true)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor="send-notifications" className="text-sm font-medium">
                                    Notify all users
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Send in-app notifications and emails when this is published.
                                </p>
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : mode === 'create' ? (
                                'Publish'
                            ) : (
                                'Save changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
