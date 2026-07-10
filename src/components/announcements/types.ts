export interface AnnouncementAuthor {
    full_name: string | null;
    avatar_url: string | null;
}

export interface AnnouncementRecord {
    id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at?: string | null;
    created_by: string | null;
    profiles?: AnnouncementAuthor | AnnouncementAuthor[] | null;
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date | null;
    createdBy: string | null;
    authorName: string | null;
    authorAvatar: string | null;
}

export function mapAnnouncementRecord(record: AnnouncementRecord): Announcement {
    const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;

    return {
        id: record.id,
        title: record.title,
        content: record.content,
        createdAt: new Date(record.created_at),
        updatedAt: record.updated_at ? new Date(record.updated_at) : null,
        createdBy: record.created_by,
        authorName: profile?.full_name ?? null,
        authorAvatar: profile?.avatar_url ?? null,
    };
}

export function getAuthorInitials(name: string | null | undefined): string {
    if (!name?.trim()) return 'A';
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
