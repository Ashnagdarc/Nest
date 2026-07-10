import { minimalEmailLayout } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import type { ReleaseNotesDraft } from "@/lib/release-notes/types";

export function formatReleaseNotesAsAnnouncement(draft: ReleaseNotesDraft): string {
    const lines = [draft.intro, ""];

    for (const section of draft.sections) {
        if (section.items.length === 0) continue;
        lines.push(`${section.title}`);
        for (const item of section.items) {
            lines.push(`• ${item}`);
        }
        lines.push("");
    }

    lines.push(`Version ${draft.version}`);
    return lines.join("\n").trim();
}

export function buildReleaseNotesEmailSubject(draft: ReleaseNotesDraft): string {
    return `Nest update: ${draft.title}`;
}

export function buildReleaseNotesEmailHtml(
    draft: ReleaseNotesDraft,
    userName = "there",
): string {
    const siteUrl = getSiteUrl();

    return minimalEmailLayout({
        title: draft.title,
        preheader: `What's new in Nest — ${draft.version}`,
        greeting: `Hello ${userName},`,
        message: draft.intro,
        sections: draft.sections
            .filter((section) => section.items.length > 0)
            .map((section) => ({
                heading: section.title,
                rows: section.items.map((item) => ({
                    label: "•",
                    value: item,
                })),
            })),
        listItems: [`Release version: ${draft.version}`],
        ctaLabel: "Open Nest",
        ctaHref: siteUrl,
        footerNote: `Nest by Eden Oasis · ${siteUrl}`,
    });
}
