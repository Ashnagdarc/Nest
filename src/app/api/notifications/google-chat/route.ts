import { NextRequest, NextResponse } from 'next/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

export async function POST(req: NextRequest) {
    try {
        const { eventType, payload } = await req.json();
        if (!eventType || !payload) {
            return NextResponse.json({ error: 'eventType and payload are required' }, { status: 400 });
        }
        await notifyGoogleChat(eventType, payload);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
} 