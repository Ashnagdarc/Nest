import { NextRequest, NextResponse } from 'next/server';
import { createSystemNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
    try {
        const { userId, title, message } = await req.json();

        if (!userId || !title || !message) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: userId, title, message'
            }, { status: 400 });
        }

        // Test creating a notification
        await createSystemNotification(
            userId,
            title,
            message
        );

        return NextResponse.json({
            success: true,
            message: 'Test notification created successfully'
        });
    } catch (error: any) {
        console.error('[Test Notification Error]:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error occurred'
        }, { status: 500 });
    }
} 