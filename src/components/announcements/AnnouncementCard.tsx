"use client";

import { format, formatDistanceToNow } from 'date-fns';
import { ChevronDown, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getAuthorInitials, type Announcement } from '@/components/announcements/types';

interface AnnouncementCardProps {
    announcement: Announcement;
    isRead?: boolean;
    expanded?: boolean;
    onToggleExpand?: () => void;
    onMarkRead?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showAdminActions?: boolean;
}

export function AnnouncementCard({
    announcement,
    isRead = true,
    expanded = false,
    onToggleExpand,
    onMarkRead,
    onEdit,
    onDelete,
    showAdminActions = false,
}: AnnouncementCardProps) {
    const authorLabel = announcement.authorName || 'Admin team';
    const isLong = announcement.content.length > 220;
    const showFullContent = expanded || !isLong;

    return (
        <Card className={cn('border-border/60 transition-colors', !isRead && 'border-primary/30 bg-primary/5')}>
            <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={announcement.authorAvatar || undefined} />
                            <AvatarFallback className="text-xs">
                                {getAuthorInitials(announcement.authorName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold leading-tight">{announcement.title}</h3>
                                {!isRead ? (
                                    <Badge variant="secondary" className="border-0 bg-primary/15 text-primary">
                                        New
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {authorLabel} · {format(announcement.createdAt, 'MMM d, yyyy')} ·{' '}
                                {formatDistanceToNow(announcement.createdAt, { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                    {showAdminActions ? (
                        <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={onDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                            </Button>
                        </div>
                    ) : null}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                <p className={cn('whitespace-pre-wrap text-sm text-foreground/90', !showFullContent && 'line-clamp-3')}>
                    {announcement.content}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {isLong && onToggleExpand ? (
                        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={onToggleExpand}>
                            {expanded ? 'Show less' : 'Read more'}
                            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                        </Button>
                    ) : null}
                    {!showAdminActions && !isRead && onMarkRead ? (
                        <Button variant="outline" size="sm" className="h-8" onClick={onMarkRead}>
                            Mark as read
                        </Button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
}

export function AnnouncementsEmptyState({ onCreate }: { onCreate?: () => void }) {
    return (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Megaphone className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                    <p className="font-medium">No announcements yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {onCreate ? 'Publish the first update for your team.' : 'Check back later for company updates.'}
                    </p>
                </div>
                {onCreate ? (
                    <Button size="sm" onClick={onCreate}>
                        Create announcement
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    );
}
