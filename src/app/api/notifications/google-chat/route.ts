import { NextRequest, NextResponse } from 'next/server';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }
        await notifyGoogleChat(NotificationEventType.USER_REQUEST, { message });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
} 