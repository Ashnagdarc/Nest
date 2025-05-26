import { NextRequest, NextResponse } from 'next/server';
import { sendApprovalEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    const { to, userName, gearList, dueDate } = await request.json();
    try {
        await sendApprovalEmail({ to, userName, gearList, dueDate });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
} 