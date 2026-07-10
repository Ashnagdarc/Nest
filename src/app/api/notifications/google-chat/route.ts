import { NextRequest, NextResponse } from 'next/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';
import { getRouteAuthContext } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
    try {
        const authContext = await getRouteAuthContext();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const body = await req.text();
        console.log('[GoogleChat API] Raw request body:', body);
        let eventType: NotificationEventType | undefined;
        let payload: Record<string, unknown> | undefined;
        try {
            const parsed = JSON.parse(body);
            const parsedEventType = parsed.eventType;
            payload = parsed.payload;
            if (Object.values(NotificationEventType).includes(parsedEventType)) {
                eventType = parsedEventType as NotificationEventType;
            }
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
        if (eventType.startsWith('ADMIN_') && !authContext.isActiveAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
