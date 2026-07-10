const DEFAULT_SITE_URL = "https://www.nestbyeden.app";

/** Canonical public site origin (no trailing slash). */
export function getSiteUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        DEFAULT_SITE_URL;
    return raw.replace(/\/+$/, "");
}

/** Build an absolute URL for a path on the public site. */
export function sitePath(path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${getSiteUrl()}${normalized}`;
}
