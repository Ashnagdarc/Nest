import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireActiveAdminRoute } from '@/lib/api/route-auth';

export async function GET() {
  try {
    const authContext = await requireActiveAdminRoute();
    if ('errorResponse' in authContext) {
      return authContext.errorResponse;
    }

    const supabase = await createSupabaseServerClient(true);
    const { data, error } = await supabase
      .from('gears')
      .select('category, quantity, available_quantity, status');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const grouped = new Map<string, { category: string; total: number; available: number; checked_out: number; maintenance: number }>();

    (data || []).forEach((row) => {
      const category = String(row.category || 'Other');
      if (!grouped.has(category)) {
        grouped.set(category, { category, total: 0, available: 0, checked_out: 0, maintenance: 0 });
      }
      const item = grouped.get(category)!;
      const qty = Math.max(0, Number(row.quantity ?? 1));
      const available = Math.max(0, Number(row.available_quantity ?? 0));
      const checkedOut = Math.max(0, qty - available);
      item.total += qty;
      item.available += available;
      item.checked_out += checkedOut;
      if (String(row.status || '').toLowerCase().includes('maintenance')) {
        item.maintenance += 1;
      }
    });

    return NextResponse.json(Array.from(grouped.values()));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
