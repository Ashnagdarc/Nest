type ProfileRole = {
    role?: string | null;
};

/**
 * Accept only an in-app path that matches the signed-in role.
 * External and protocol-relative URLs are ignored.
 */
export function getSafeReturnPath(
    raw: string | null | undefined,
    profile: ProfileRole | null | undefined,
): string | null {
    if (!raw) return null;
    const value = raw.trim();
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
        return null;
    }

    let pathname = value;
    let search = "";
    try {
        const url = new URL(value, "http://nest.local");
        if (url.origin !== "http://nest.local") return null;
        pathname = url.pathname;
        search = url.search;
    } catch {
        return null;
    }

    if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;

    const isAdmin = profile?.role === "Admin";
    if (isAdmin && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
        return `${pathname}${search}`;
    }
    if (!isAdmin && (pathname === "/user" || pathname.startsWith("/user/"))) {
        return `${pathname}${search}`;
    }

    return null;
}
