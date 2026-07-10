import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAdminRoute } from '@/lib/api/route-auth';
import { buildAdminReport } from '@/lib/reports/build-report-data';

export async function GET(request: NextRequest) {
    try {
        const authContext = await requireActiveAdminRoute();
        if ('errorResponse' in authContext) {
            return authContext.errorResponse;
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!from || !to) {
            return NextResponse.json({ data: null, error: 'Missing date range parameters' }, { status: 400 });
        }

        const data = await buildAdminReport(authContext.adminSupabase, { from, to });
        return NextResponse.json({ data, error: null });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to build report';
        return NextResponse.json({ data: null, error: message }, { status: 500 });
    }
}
