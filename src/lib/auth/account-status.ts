export type BlockedAccountStatus = 'suspended' | 'inactive';

export function normalizeAccountStatus(
    status: string | null | undefined
): BlockedAccountStatus | null {
    switch (String(status || '').toLowerCase()) {
        case 'suspended':
            return 'suspended';
        case 'inactive':
            return 'inactive';
        case 'active':
            return null;
        default:
            return 'inactive';
    }
}

export function isAccountActive(status: string | null | undefined): boolean {
    return normalizeAccountStatus(status) === null;
}

export function getBlockedAccountMessage(
    status: BlockedAccountStatus,
    fullName?: string | null
): { title: string; description: string } {
    const displayName = fullName?.trim() || 'Your account';

    if (status === 'suspended') {
        return {
            title: 'Account suspended',
            description: `${displayName} has been suspended. Please contact your administrator or HR to restore access.`,
        };
    }

    return {
        title: 'Account inactive',
        description: `${displayName} is inactive. Please contact your administrator or HR to restore access.`,
    };
}

export function parseBlockedAccountFromSearchParams(
    searchParams: URLSearchParams
): { status: BlockedAccountStatus; fullName?: string } | null {
    const rawStatus = searchParams.get('accountStatus');
    if (rawStatus !== 'suspended' && rawStatus !== 'inactive') {
        return null;
    }

    const fullName = searchParams.get('name')?.trim();
    return {
        status: rawStatus,
        fullName: fullName || undefined,
    };
}
