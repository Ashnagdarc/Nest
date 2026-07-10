import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/app/api/_utils/route-auth";
import {
    buildReleaseNotesEmailHtml,
    buildReleaseNotesEmailSubject,
    formatReleaseNotesAsAnnouncement,
} from "@/lib/release-notes/format";
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

    const adminSupabase = await createSupabaseAdminClient();
    const { count, error } = await adminSupabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "Active")
        .not("email", "is", null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: adminProfile } = await adminSupabase
        .from("profiles")
        .select("full_name")
        .eq("id", authContext.user.id)
        .maybeSingle();

    const previewName = adminProfile?.full_name || "Admin";

    return NextResponse.json({
        announcementContent: formatReleaseNotesAsAnnouncement(draft),
        emailHtml: buildReleaseNotesEmailHtml(draft, previewName),
        emailSubject: buildReleaseNotesEmailSubject(draft),
        recipientCount: count ?? 0,
    });
}
