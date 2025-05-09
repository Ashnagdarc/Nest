import { LRUCache } from 'lru-cache';
import type { NextRequest } from 'next/server';

type RateLimitOptions = {
    interval: number;
    uniqueTokenPerInterval: number;
};

export class RateLimit {
    private tokenCache: LRUCache<string, number[]>;
    private interval: number;

    constructor({ interval, uniqueTokenPerInterval }: RateLimitOptions) {
        this.interval = interval;
        this.tokenCache = new LRUCache({
            max: uniqueTokenPerInterval,
            ttl: interval,
        });
    }

    async check(request: NextRequest, limit: number): Promise<void> {
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'anonymous';
        const tokenCount = (this.tokenCache.get(ip) || []).length;

        if (tokenCount >= limit) {
            throw new Error('Rate limit exceeded');
        }

        const currentTimestamp = Date.now();
        const tokens = this.tokenCache.get(ip) || [];
        const newTokens = [...tokens, currentTimestamp].filter(
            token => token > currentTimestamp - this.interval
        );

        this.tokenCache.set(ip, newTokens);
    }
}

export default function rateLimit(options: RateLimitOptions) {
    return new RateLimit(options);
} 