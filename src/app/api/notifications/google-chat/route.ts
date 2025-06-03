import { NextRequest, NextResponse } from 'next/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        console.log('[GoogleChat API] Raw request body:', body);
        let eventType, payload;
        try {
            const parsed = JSON.parse(body);
            eventType = parsed.eventType;
            payload = parsed.payload;
        } catch (parseError) {
            console.error('[GoogleChat API] Failed to parse JSON:', parseError);
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }
        console.log('[GoogleChat API] eventType:', eventType);
        console.log('[GoogleChat API] payload:', payload);
        if (!eventType || !payload) {
            console.error('[GoogleChat API] Missing eventType or payload');
            return NextResponse.json({ error: 'eventType and payload are required' }, { status: 400 });
        }
        console.log('[GoogleChat API] Calling notifyGoogleChat...');
        const result = await notifyGoogleChat(eventType, payload);
        console.log('[GoogleChat API] notifyGoogleChat result:', result);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[GoogleChat API] Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
} 