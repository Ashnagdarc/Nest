import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        data: null,
        error: 'Disabled in production',
        enabled: false
    }, { status: 410 });
}
