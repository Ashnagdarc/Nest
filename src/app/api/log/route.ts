import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

type LogPayload = {
    level: 'error' | 'info' | 'debug';
    message: string;
    context: string;
    metadata?: any;
};

export async function POST(req: Request) {
    try {
        const body = await req.json() as LogPayload;
        const { level, message, context, metadata } = body;

        // Add request headers to metadata for debugging
        const headersList = headers();
        const userAgent = headersList.get('user-agent');
        const timestamp = new Date().toISOString();

        const logMetadata = {
            ...metadata,
            timestamp,
            userAgent,
        };

        // In production, you would implement server-side logging here
        // For now, we'll just use console methods
        switch (level) {
            case 'error':
                console.error(`[${context}] ${message}`, logMetadata);
                break;
            case 'info':
                console.log(`[${context}] ${message}`, logMetadata);
                break;
            case 'debug':
                console.debug(`[${context}] ${message}`, logMetadata);
                break;
            default:
                console.log(`[${context}] ${message}`, logMetadata);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in log API route:', error);
        return NextResponse.json(
            { error: 'Failed to process log' },
            { status: 500 }
        );
    }
} 