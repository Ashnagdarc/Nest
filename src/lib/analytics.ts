export type AuthEventName = 'login_success' | 'login_failure' | 'signup_success' | 'signup_failure';

function safeDomain(email?: string): string | undefined {
    if (!email || !email.includes('@')) return undefined;
    try {
        return email.split('@')[1];
    } catch {
        return undefined;
    }
}

export async function trackAuthEvent(event: AuthEventName, meta?: { email?: string; method?: string; error?: string }) {
    try {
        const payload = {
            event,
            method: meta?.method || 'password',
            // Non‑PII: only include domain, never the full email
            email_domain: safeDomain(meta?.email),
            error: meta?.error,
            ts: new Date().toISOString(),
            source: 'web',
            category: 'auth'
        };

        // Best‑effort fire‑and‑forget
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => { });
    } catch (_) {
        // Swallow — analytics should never break UX
    }
}
