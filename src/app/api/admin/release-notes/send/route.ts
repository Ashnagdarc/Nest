import { NextRequest, NextResponse } from "next/server";
import { requireActiveAdmin } from "@/app/api/_utils/route-auth";
import { AnnouncementService } from "@/services/announcement-service";
import {
    buildReleaseNotesEmailHtml,
    buildReleaseNotesEmailSubject,
    formatReleaseNotesAsAnnouncement,
} from "@/lib/release-notes/format";
import { sendGearRequestEmail } from "@/lib/email";
import type { ReleaseNotesDraft } from "@/lib/release-notes/types";

export async function POST(request: NextRequest) {
    const authContext = await requireActiveAdmin();
    if ("errorResponse" in authContext) {
        return authContext.errorResponse;
    }

    const draft = (await request.json()) as ReleaseNotesDraft;

    if (!draft?.title?.trim() || !draft?.intro?.trim()) {
        return NextResponse.json({ error: "Title and intro are required." }, { status: 400 });
    }

    const content = formatReleaseNotesAsAnnouncement(draft);
    const emailSubject = buildReleaseNotesEmailSubject(draft);
    const announcementService = new AnnouncementService();

    const createResult = await announcementService.createAnnouncementWithNotifications(
        draft.title.trim(),
        content,
        authContext.user.id,
    );

    if (!createResult.success || !createResult.announcement) {
        return NextResponse.json(
            { error: "Failed to publish release notes.", details: createResult.errors },
            { status: 500 },
        );
    }

    const users = await announcementService.getActiveUsers();
    const { data: author } = await authContext.adminSupabase
        .from("profiles")
        .select("full_name")
        .eq("id", authContext.user.id)
        .maybeSingle();

    const authorName = author?.full_name || "Nest team";
    const errors: string[] = [...(createResult.errors ?? [])];
    let emailsSent = 0;

    const emailResults = await Promise.all(
        users.map(async (user) => {
            try {
                const html = buildReleaseNotesEmailHtml(draft, user.full_name || "there");
                const result = await sendGearRequestEmail({
                    to: user.email,
                    subject: emailSubject,
                    html,
                });
                if (!result.success) {
                    errors.push(`Email to ${user.email}: ${result.error}`);
                    return false;
                }
                return true;
            } catch (err) {
                errors.push(
                    `Email to ${user.email}: ${err instanceof Error ? err.message : String(err)}`,
                );
                return false;
            }
        }),
    );

    emailsSent = emailResults.filter(Boolean).length;

    return NextResponse.json({
        success: true,
        announcement: createResult.announcement,
        stats: {
            notificationsSent: createResult.notificationsSent ?? 0,
            emailsSent,
            recipientCount: users.length,
            authorName,
            errors: errors.length ? errors : undefined,
        },
    });
}
