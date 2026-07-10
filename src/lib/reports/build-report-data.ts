import { format } from 'date-fns';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeGearInventoryStats } from '@/lib/gear/inventory-stats';
import {
    buildDailyTrendBuckets,
    incrementTrendBucket,
    isCheckinAction,
    isCheckoutAction,
    isDamagedCondition,
    normalizeRequestStatus,
} from '@/lib/reports/aggregate';
import type { AdminReportData, ReportActivityRow, PopularGearRow } from '@/lib/reports/types';
import { buildExportSections } from '@/lib/reports/build-export-sections';

interface BuildReportOptions {
    from: string;
    to: string;
}

type RequestRow = {
    id: string;
    status: string | null;
    created_at: string | null;
    user_id: string | null;
    profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

type CheckinRow = {
    id: string;
    action: string | null;
    checkin_date: string | null;
    status: string | null;
    condition: string | null;
    damage_notes: string | null;
    notes: string | null;
    user_id: string | null;
    profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
    gears?: { name?: string | null; category?: string | null } | Array<{ name?: string | null; category?: string | null }> | null;
};

type GearLineRow = {
    gear_request_id: string;
    gear_id: string;
    quantity: number | null;
    gears?: { name?: string | null; category?: string | null } | Array<{ name?: string | null; category?: string | null }> | null;
};

type MaintenanceRow = {
    id: number;
    performed_at: string | null;
    created_at: string | null;
    maintenance_type: string | null;
    description: string | null;
    status: string | null;
    gears?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

function profileName(profile: RequestRow['profiles']): string {
    const row = Array.isArray(profile) ? profile[0] : profile;
    return row?.full_name?.trim() || 'Unknown user';
}

function gearInfo(gear: CheckinRow['gears']): { name: string; category: string | null } {
    const row = Array.isArray(gear) ? gear[0] : gear;
    return {
        name: row?.name?.trim() || 'Unknown gear',
        category: row?.category?.trim() || null,
    };
}

function maintenanceTimestamp(row: MaintenanceRow): string {
    return row.performed_at || row.created_at || new Date(0).toISOString();
}

function isDamageMaintenance(row: MaintenanceRow): boolean {
    const text = `${row.maintenance_type || ''} ${row.description || ''} ${row.status || ''}`;
    return /damage|repair/i.test(text);
}

export async function buildAdminReport(
    supabase: SupabaseClient,
    options: BuildReportOptions
): Promise<AdminReportData> {
    const fromDate = new Date(options.from);
    const toDate = new Date(options.to);
    const rangeLabel = `${format(fromDate, 'MMM d, yyyy')} – ${format(toDate, 'MMM d, yyyy')}`;
    const trends = buildDailyTrendBuckets(fromDate, toDate);

    const [
        requestsResult,
        checkinsResult,
        maintenanceResult,
        gearsResult,
        usersResult,
        carBookingsResult,
        fleetCarsResult,
        carAssignmentsResult,
    ] = await Promise.all([
        supabase
            .from('gear_requests')
            .select('id, status, created_at, user_id, profiles!gear_requests_user_id_fkey(full_name)')
            .gte('created_at', options.from)
            .lte('created_at', options.to),
        supabase
            .from('checkins')
            .select('id, action, checkin_date, status, condition, damage_notes, notes, user_id, profiles!checkins_user_id_fkey(full_name), gears(name, category)')
            .gte('checkin_date', options.from)
            .lte('checkin_date', options.to)
            .order('checkin_date', { ascending: false })
            .limit(500),
        supabase
            .from('gear_maintenance')
            .select('id, performed_at, created_at, maintenance_type, description, status, gears(name)')
            .gte('performed_at', options.from)
            .lte('performed_at', options.to)
            .order('performed_at', { ascending: false })
            .limit(200),
        supabase
            .from('gears')
            .select('name, quantity, available_quantity, status, category'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
            .from('car_bookings')
            .select('id, employee_name, date_of_use, time_slot, destination, purpose, status, requester_id, updated_at')
            .gte('date_of_use', options.from.slice(0, 10))
            .lte('date_of_use', options.to.slice(0, 10))
            .order('date_of_use', { ascending: false }),
        supabase
            .from('cars')
            .select('id, label, plate, status'),
        supabase
            .from('car_assignment')
            .select('booking_id, car_id, cars(label, plate)'),
    ]);

    if (requestsResult.error) throw new Error(requestsResult.error.message);
    if (checkinsResult.error) throw new Error(checkinsResult.error.message);
    if (gearsResult.error) throw new Error(gearsResult.error.message);

    const requests = (requestsResult.data || []) as RequestRow[];
    const checkins = (checkinsResult.data || []) as CheckinRow[];
    const maintenance = maintenanceResult.error ? [] : ((maintenanceResult.data || []) as MaintenanceRow[]);

    const requestIds = requests.map((request) => request.id);
    let gearLines: GearLineRow[] = [];
    if (requestIds.length > 0) {
        const gearLinesResult = await supabase
            .from('gear_request_gears')
            .select('gear_request_id, gear_id, quantity, gears(name, category)')
            .in('gear_request_id', requestIds);
        if (!gearLinesResult.error) {
            gearLines = (gearLinesResult.data || []) as GearLineRow[];
        }
    }

    const statusCounts = new Map<string, number>();
    const activeUserIds = new Set<string>();

    for (const request of requests) {
        const status = normalizeRequestStatus(request.status);
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
        incrementTrendBucket(trends, request.created_at, 'requests');
        if (request.user_id) activeUserIds.add(request.user_id);
    }

    let totalCheckins = 0;
    let totalCheckouts = 0;
    let damageFromCheckins = 0;

    for (const checkin of checkins) {
        if (checkin.user_id) activeUserIds.add(checkin.user_id);

        if (isCheckoutAction(checkin.action)) {
            totalCheckouts += 1;
            incrementTrendBucket(trends, checkin.checkin_date, 'checkouts');
        } else if (isCheckinAction(checkin.action)) {
            totalCheckins += 1;
            incrementTrendBucket(trends, checkin.checkin_date, 'checkins');
        }

        if (isDamagedCondition(checkin.condition, checkin.damage_notes)) {
            damageFromCheckins += 1;
            incrementTrendBucket(trends, checkin.checkin_date, 'damages');
        }
    }

    const damageFromMaintenance = maintenance.filter(isDamageMaintenance).length;
    for (const row of maintenance.filter(isDamageMaintenance)) {
        incrementTrendBucket(trends, maintenanceTimestamp(row), 'damages');
    }

    const inventory = computeGearInventoryStats(gearsResult.data || []);
    const utilizationRate = inventory.total > 0
        ? Math.round((inventory.checkedOut / inventory.total) * 100)
        : 0;

    const popularMap = new Map<string, PopularGearRow>();
    for (const line of gearLines) {
        const gear = gearInfo(line.gears);
        const key = gear.name;
        const existing = popularMap.get(key) || {
            name: gear.name,
            category: gear.category,
            requestCount: 0,
            unitsRequested: 0,
        };
        existing.requestCount += 1;
        existing.unitsRequested += line.quantity ?? 1;
        popularMap.set(key, existing);
    }

    const popularGear = Array.from(popularMap.values())
        .sort((a, b) => b.unitsRequested - a.unitsRequested || b.requestCount - a.requestCount)
        .slice(0, 10);

    const gearNamesByRequest = new Map<string, string[]>();
    for (const line of gearLines) {
        const gear = gearInfo(line.gears);
        const names = gearNamesByRequest.get(line.gear_request_id) || [];
        names.push(gear.name);
        gearNamesByRequest.set(line.gear_request_id, names);
    }

    const activity: ReportActivityRow[] = [];

    for (const request of requests) {
        const names = gearNamesByRequest.get(request.id) || [];
        const gearName = names.length === 0
            ? 'No items listed'
            : names.length === 1
                ? names[0]
                : `${names[0]} +${names.length - 1} more`;

        activity.push({
            id: `request-${request.id}`,
            type: 'Request',
            timestamp: request.created_at || new Date(0).toISOString(),
            userName: profileName(request.profiles),
            gearName,
            status: normalizeRequestStatus(request.status),
            detail: names.length > 0 ? names.join(', ') : 'Gear request submitted',
        });
    }

    for (const checkin of checkins) {
        const gear = gearInfo(checkin.gears);
        const action = String(checkin.action || 'Activity');
        activity.push({
            id: `checkin-${checkin.id}`,
            type: action,
            timestamp: checkin.checkin_date || new Date(0).toISOString(),
            userName: profileName(checkin.profiles),
            gearName: gear.name,
            status: checkin.status || 'Unknown',
            detail: checkin.damage_notes?.trim() || checkin.notes?.trim() || '',
        });
    }

    for (const row of maintenance) {
        const gear = gearInfo(row.gears);
        activity.push({
            id: `maintenance-${row.id}`,
            type: row.maintenance_type || 'Maintenance',
            timestamp: maintenanceTimestamp(row),
            userName: 'System',
            gearName: gear.name,
            status: row.status || 'Recorded',
            detail: row.description?.trim() || 'Maintenance record',
        });
    }

    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const summary = {
        totalRequests: requests.length,
        approvedRequests: statusCounts.get('Approved') || 0,
        pendingRequests: statusCounts.get('Pending') || 0,
        rejectedRequests: statusCounts.get('Rejected') || 0,
        completedRequests: statusCounts.get('Completed') || 0,
        totalCheckins,
        totalCheckouts,
        damageReports: damageFromCheckins + damageFromMaintenance,
        activeUsers: activeUserIds.size,
        totalUsers: usersResult.count || 0,
        inventoryTotal: inventory.total,
        inventoryAvailable: inventory.available,
        inventoryCheckedOut: inventory.checkedOut,
        utilizationRate,
    };

    const exportSections = buildExportSections({
        from: options.from,
        to: options.to,
        trends,
        gearLines,
        checkins,
        maintenance,
        carBookings: carBookingsResult.error ? [] : (carBookingsResult.data || []),
        carAssignments: carAssignmentsResult.error ? [] : (carAssignmentsResult.data || []),
        fleetCars: fleetCarsResult.error ? [] : (fleetCarsResult.data || []),
        gearCatalog: gearsResult.data || [],
    });

    return {
        range: {
            from: options.from,
            to: options.to,
            label: rangeLabel,
        },
        summary,
        trends,
        requestStatus: Array.from(statusCounts.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count),
        popularGear,
        activity: activity.slice(0, 100),
        export: exportSections,
    };
}
