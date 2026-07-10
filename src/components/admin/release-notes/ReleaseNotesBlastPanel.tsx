"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    Eye,
    GripVertical,
    Loader2,
    Mail,
    Megaphone,
    Plus,
    RotateCcw,
    Send,
    Smartphone,
    Trash2,
    Users,
} from "lucide-react";
import { PENDING_RELEASE_NOTES } from "@/data/pending-release-notes";
import { AnnouncementCard } from "@/components/announcements/AnnouncementCard";
import type { Announcement } from "@/components/announcements/types";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { ReleaseNoteSection, ReleaseNotesDraft } from "@/lib/release-notes/types";
import { cn } from "@/lib/utils";

const DRAFT_STORAGE_KEY = "nest-release-notes-draft-v2";

function loadDraft(): ReleaseNotesDraft {
    if (typeof window === "undefined") return PENDING_RELEASE_NOTES;
    try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!raw) return PENDING_RELEASE_NOTES;
        return JSON.parse(raw) as ReleaseNotesDraft;
    } catch {
        return PENDING_RELEASE_NOTES;
    }
}

function saveDraft(draft: ReleaseNotesDraft) {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function sanitizeDraft(draft: ReleaseNotesDraft): ReleaseNotesDraft {
    return {
        ...draft,
        title: draft.title.trim(),
        intro: draft.intro.trim(),
        version: draft.version.trim(),
        sections: draft.sections
            .map((section) => ({
                ...section,
                title: section.title.trim(),
                items: section.items.map((item) => item.trim()).filter(Boolean),
            }))
            .filter((section) => section.title && section.items.length > 0),
    };
}

function countItems(draft: ReleaseNotesDraft): number {
    return draft.sections.reduce((sum, section) => sum + section.items.filter((i) => i.trim()).length, 0);
}

export function ReleaseNotesBlastPanel() {
    const { toast } = useToast();
    const [draft, setDraft] = useState<ReleaseNotesDraft>(PENDING_RELEASE_NOTES);
    const [previewTab, setPreviewTab] = useState<"email" | "inapp">("email");
    const [emailHtml, setEmailHtml] = useState("");
    const [announcementContent, setAnnouncementContent] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [recipientCount, setRecipientCount] = useState<number | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [hasPreview, setHasPreview] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);

    useEffect(() => {
        setDraft(loadDraft());
    }, []);

    const itemCount = useMemo(() => countItems(draft), [draft]);
    const sectionCount = draft.sections.length;

    const updateDraft = useCallback((next: ReleaseNotesDraft) => {
        setDraft(next);
        saveDraft(next);
        setHasPreview(false);
    }, []);

    const updateSection = (index: number, section: ReleaseNoteSection) => {
        const sections = [...draft.sections];
        sections[index] = section;
        updateDraft({ ...draft, sections });
    };

    const addSection = () => {
        updateDraft({
            ...draft,
            sections: [...draft.sections, { title: "More updates", items: [""] }],
        });
    };

    const removeSection = (index: number) => {
        updateDraft({
            ...draft,
            sections: draft.sections.filter((_, i) => i !== index),
        });
    };

    const resetToTemplate = () => {
        updateDraft(PENDING_RELEASE_NOTES);
        toast({ title: "Template loaded", description: "Draft reset from the latest codebase template." });
    };

    const handlePreview = async () => {
        const cleaned = sanitizeDraft(draft);
        if (!cleaned.title || !cleaned.intro || cleaned.sections.length === 0) {
            toast({
                title: "Draft incomplete",
                description: "Add a title, intro, and at least one section with items.",
                variant: "destructive",
            });
            return;
        }

        setIsPreviewing(true);
        try {
            const response = await fetch("/api/admin/release-notes/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleaned),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Preview failed");

            setEmailHtml(result.emailHtml);
            setAnnouncementContent(result.announcementContent);
            setEmailSubject(result.emailSubject);
            setRecipientCount(result.recipientCount);
            setHasPreview(true);
        } catch (error) {
            toast({
                title: "Preview failed",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsPreviewing(false);
        }
    };

    const handleSend = async () => {
        const cleaned = sanitizeDraft(draft);
        setIsSending(true);
        try {
            const response = await fetch("/api/admin/release-notes/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cleaned),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Send failed");

            setSendDialogOpen(false);
            toast({
                title: "Release notes sent",
                description: `In-app: ${result.stats.notificationsSent} users · Email: ${result.stats.emailsSent} inboxes`,
            });
        } catch (error) {
            toast({
                title: "Send failed",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    const previewAnnouncement: Announcement | null = useMemo(() => {
        if (!hasPreview) return null;
        return {
            id: "preview",
            title: draft.title,
            content: announcementContent,
            createdAt: new Date(),
            createdBy: null,
            authorName: "Nest team",
            authorAvatar: null,
        };
    }, [announcementContent, draft.title, hasPreview]);

    return (
        <>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,1fr)] lg:items-start 2xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,1fr)]">
                {/* —— Left: compose —— */}
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Card className="border-border/50">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Megaphone className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Sections</p>
                                    <p className="text-lg font-semibold">{sectionCount}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Bullet points</p>
                                    <p className="text-lg font-semibold">{itemCount}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50">
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                                    <Users className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Recipients</p>
                                    <p className="text-lg font-semibold">
                                        {recipientCount ?? "—"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-base">1. Compose</CardTitle>
                                    <CardDescription className="mt-1">
                                        Draft auto-saves in this browser. Reset after each deploy to load
                                        the repo template.
                                    </CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={resetToTemplate}>
                                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                    Load template
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                                <div className="space-y-2">
                                    <Label htmlFor="release-version">Version</Label>
                                    <Input
                                        id="release-version"
                                        value={draft.version}
                                        onChange={(e) => updateDraft({ ...draft, version: e.target.value })}
                                        placeholder="2026.07.10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="release-title">Title</Label>
                                    <Input
                                        id="release-title"
                                        value={draft.title}
                                        onChange={(e) => updateDraft({ ...draft, title: e.target.value })}
                                        placeholder="Nest platform update — July 2026"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="release-intro">Intro</Label>
                                <Textarea
                                    id="release-intro"
                                    value={draft.intro}
                                    onChange={(e) => updateDraft({ ...draft, intro: e.target.value })}
                                    rows={2}
                                    className="resize-none"
                                />
                            </div>

                            <Separator />

                            <Accordion
                                type="multiple"
                                defaultValue={draft.sections.slice(0, 2).map((_, i) => `section-${i}`)}
                                className="space-y-2"
                            >
                                {draft.sections.map((section, sectionIndex) => {
                                    const filledCount = section.items.filter((i) => i.trim()).length;
                                    return (
                                        <AccordionItem
                                            key={`section-${sectionIndex}`}
                                            value={`section-${sectionIndex}`}
                                            className="rounded-lg border border-border/60 px-3"
                                        >
                                            <AccordionTrigger className="py-3 hover:no-underline">
                                                <div className="flex flex-1 items-center gap-2 text-left">
                                                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                                                    <span className="truncate font-medium">
                                                        {section.title || "Untitled section"}
                                                    </span>
                                                    <Badge variant="secondary" className="ml-auto mr-2 shrink-0">
                                                        {filledCount}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="space-y-2 pb-3">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={section.title}
                                                        onChange={(e) =>
                                                            updateSection(sectionIndex, {
                                                                ...section,
                                                                title: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Section title"
                                                        className="h-8 text-sm"
                                                    />
                                                    {draft.sections.length > 1 ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0"
                                                            onClick={() => removeSection(sectionIndex)}
                                                            aria-label="Remove section"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                                {section.items.map((item, itemIndex) => (
                                                    <div
                                                        key={`item-${sectionIndex}-${itemIndex}`}
                                                        className="flex gap-2"
                                                    >
                                                        <Textarea
                                                            value={item}
                                                            onChange={(e) => {
                                                                const items = [...section.items];
                                                                items[itemIndex] = e.target.value;
                                                                updateSection(sectionIndex, { ...section, items });
                                                            }}
                                                            rows={2}
                                                            className="min-h-0 resize-y text-sm"
                                                            placeholder="One improvement or fix…"
                                                        />
                                                        {section.items.length > 1 ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 shrink-0 self-start"
                                                                onClick={() => {
                                                                    const items = section.items.filter(
                                                                        (_, i) => i !== itemIndex,
                                                                    );
                                                                    updateSection(sectionIndex, {
                                                                        ...section,
                                                                        items: items.length ? items : [""],
                                                                    });
                                                                }}
                                                                aria-label="Remove item"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() =>
                                                        updateSection(sectionIndex, {
                                                            ...section,
                                                            items: [...section.items, ""],
                                                        })
                                                    }
                                                >
                                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                    Add bullet
                                                </Button>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>

                            <Button type="button" variant="outline" size="sm" onClick={addSection}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add section
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* —— Right: preview + send (sticky) —— */}
                <div className="space-y-4 lg:sticky lg:top-4">
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">2. Preview & send</CardTitle>
                            <CardDescription>
                                {hasPreview ? (
                                    <span className="flex flex-col gap-1">
                                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Preview ready
                                        </span>
                                        <span className="truncate text-xs">
                                            {emailSubject} · {recipientCount ?? 0} recipients
                                        </span>
                                    </span>
                                ) : (
                                    "Generate a preview before sending to all active users."
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!hasPreview ? (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                        <Eye className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Preview the email and in-app announcement here.
                                    </p>
                                </div>
                            ) : (
                                <Tabs
                                    value={previewTab}
                                    onValueChange={(v) => setPreviewTab(v as "email" | "inapp")}
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm">
                                            <Mail className="h-3.5 w-3.5" />
                                            Email
                                        </TabsTrigger>
                                        <TabsTrigger value="inapp" className="gap-1.5 text-xs sm:text-sm">
                                            <Smartphone className="h-3.5 w-3.5" />
                                            In-app
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="email" className="mt-3">
                                        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
                                            <iframe
                                                title="Release notes email preview"
                                                srcDoc={emailHtml}
                                                className="h-[min(480px,55vh)] w-full bg-white 2xl:h-[min(600px,62vh)]"
                                                sandbox=""
                                            />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="inapp" className="mt-3 max-h-[min(480px,55vh)] overflow-y-auto 2xl:max-h-[min(600px,62vh)]">
                                        {previewAnnouncement ? (
                                            <AnnouncementCard announcement={previewAnnouncement} expanded />
                                        ) : null}
                                    </TabsContent>
                                </Tabs>
                            )}

                            <div className="flex flex-col gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handlePreview}
                                    disabled={isPreviewing}
                                >
                                    {isPreviewing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating…
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="mr-2 h-4 w-4" />
                                            {hasPreview ? "Refresh preview" : "Preview blast"}
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={() => setSendDialogOpen(true)}
                                    disabled={isSending || !hasPreview}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    Send to all users
                                </Button>
                            </div>

                            <p className="text-center text-xs text-muted-foreground">
                                Sends in-app announcement + email to every active user.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-muted/20">
                        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">After each deploy</p>
                            <ol className="list-inside list-decimal space-y-1">
                                <li>Load template (pulls from repo)</li>
                                <li>Edit bullets if needed</li>
                                <li>Preview → Send</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send release notes blast?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    This will publish an announcement and email{" "}
                                    <strong className="text-foreground">
                                        {recipientCount ?? "all"} active users
                                    </strong>
                                    .
                                </p>
                                <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                                    <span className="font-medium text-foreground">Subject: </span>
                                    {emailSubject || draft.title}
                                </p>
                                <p>This cannot be unsent. Only proceed if the preview looks correct.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSending}
                            onClick={(e) => {
                                e.preventDefault();
                                void handleSend();
                            }}
                            className={cn(isSending && "pointer-events-none opacity-70")}
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                "Confirm send"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
