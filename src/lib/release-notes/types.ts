export interface ReleaseNoteSection {
    title: string;
    items: string[];
}

export interface ReleaseNotesDraft {
    version: string;
    title: string;
    intro: string;
    sections: ReleaseNoteSection[];
}

export interface ReleaseNotesPreview {
    announcementContent: string;
    emailHtml: string;
    emailSubject: string;
    recipientCount: number;
}
