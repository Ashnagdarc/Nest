import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type {
    AdminReportData,
    CarBookingExportRow,
    CarFrequencyRow,
    CarNotReturnedRow,
    DailyOperationsRow,
    DamagedGearExportRow,
    GearUsageExportRow,
    MaintenanceExportRow,
    ReportExportKpis,
    ReportExportSections,
} from '@/lib/reports/types';

type CarBookingRow = {
    id: string;
    employee_name: string;
    date_of_use: string;
    time_slot: string;
    destination: string | null;
    purpose: string | null;
    status: string;
    requester_id: string | null;
    updated_at: string | null;
};

type CarRow = {
    id: string;
    label: string;
    plate: string | null;
    status: string | null;
};

type CarAssignmentRow = {
    booking_id: string;
    car_id: string;
    cars?: { label?: string | null; plate?: string | null } | Array<{ label?: string | null; plate?: string | null }> | null;
};

type GearSnapshotRow = {
    name: string | null;
    category: string | null;
    status: string | null;
    quantity: number | null;
};

type CheckinExportRow = {
    action: string | null;
    checkin_date: string | null;
    condition: string | null;
    damage_notes: string | null;
    notes: string | null;
    profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
    gears?: { name?: string | null; category?: string | null } | Array<{ name?: string | null; category?: string | null }> | null;
};

type MaintenanceInputRow = {
    performed_at: string | null;
    created_at: string | null;
    maintenance_type: string | null;
    description: string | null;
    status: string | null;
    gears?: { name?: string | null; category?: string | null } | Array<{ name?: string | null; category?: string | null }> | null;
};

type GearLineInput = {
    quantity: number | null;
    gears?: { name?: string | null; category?: string | null } | Array<{ name?: string | null; category?: string | null }> | null;
};

function rel<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

function gearName(gear: GearLineInput['gears']): string {
    return rel(gear)?.name?.trim() || 'Unknown gear';
}

function gearCategory(gear: GearLineInput['gears']): string {
    return rel(gear)?.category?.trim() || 'Uncategorized';
}

function profileName(profile: CheckinExportRow['profiles']): string {
    return rel(profile)?.full_name?.trim() || 'Unknown user';
}

function isCheckout(action: string | null | undefined): boolean {
    return /check\s*out/i.test(String(action || ''));
}

function isCheckin(action: string | null | undefined): boolean {
    const value = String(action || '');
    return /check\s*in/i.test(value) || /return/i.test(value);
}

function isDamaged(condition: string | null | undefined, notes?: string | null): boolean {
    if (notes?.trim()) return true;
    return /damage/i.test(String(condition || ''));
}

function isDamageMaintenance(row: MaintenanceInputRow): boolean {
    const text = `${row.maintenance_type || ''} ${row.description || ''} ${row.status || ''}`;
    return /damage|repair/i.test(text);
}

function maintenanceDate(row: MaintenanceInputRow): string {
    return row.performed_at || row.created_at || '';
}

function carLabel(assignment: CarAssignmentRow | undefined): string {
    if (!assignment) return 'Unassigned';
    const car = rel(assignment.cars);
    return car?.label?.trim() || 'Unknown car';
}

function carPlate(assignment: CarAssignmentRow | undefined): string {
    if (!assignment) return '';
    return rel(assignment.cars)?.plate?.trim() || '';
}

function returnedLabel(status: string, dateOfUse: string, today: string): string {
    if (status === 'Completed') return 'Yes';
    if (status === 'Approved' && dateOfUse < today) return 'No';
    if (status === 'Approved') return 'Out';
    return '-';
}

interface BuildExportInput {
    from: string;
    to: string;
    trends: AdminReportData['trends'];
    gearLines: GearLineInput[];
    checkins: CheckinExportRow[];
    maintenance: MaintenanceInputRow[];
    carBookings: CarBookingRow[];
    carAssignments: CarAssignmentRow[];
    fleetCars: CarRow[];
    gearCatalog: GearSnapshotRow[];
}

export function buildExportSections(input: BuildExportInput): ReportExportSections {
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const assignmentByBooking = new Map(input.carAssignments.map((row) => [row.booking_id, row]));

    const gearUsageMap = new Map<string, GearUsageExportRow>();
    const ensureGear = (name: string, category: string): GearUsageExportRow => {
        const existing = gearUsageMap.get(name) || {
            name,
            category,
            unitsRequested: 0,
            requestLines: 0,
            returns: 0,
            checkouts: 0,
            damageReports: 0,
        };
        gearUsageMap.set(name, existing);
        return existing;
    };

    for (const line of input.gearLines) {
        const row = ensureGear(gearName(line.gears), gearCategory(line.gears));
        row.requestLines += 1;
        row.unitsRequested += line.quantity ?? 1;
    }

    for (const checkin of input.checkins) {
        const name = gearName(checkin.gears);
        const row = ensureGear(name, gearCategory(checkin.gears));
        if (isCheckout(checkin.action)) row.checkouts += 1;
        if (isCheckin(checkin.action)) row.returns += 1;
        if (isDamaged(checkin.condition, checkin.damage_notes)) row.damageReports += 1;
    }

    const damagedGears: DamagedGearExportRow[] = [];
    for (const checkin of input.checkins) {
        if (!isDamaged(checkin.condition, checkin.damage_notes)) continue;
        damagedGears.push({
            date: checkin.checkin_date ? formatExportDate(checkin.checkin_date) : '-',
            gearName: gearName(checkin.gears),
            category: gearCategory(checkin.gears),
            reportedBy: profileName(checkin.profiles),
            source: 'Check-in',
            notes: checkin.damage_notes?.trim() || checkin.notes?.trim() || checkin.condition || '',
        });
    }

    const maintenanceRows: MaintenanceExportRow[] = input.maintenance.map((row) => ({
        date: maintenanceDate(row) ? formatExportDate(maintenanceDate(row)) : '-',
        gearName: gearName(row.gears),
        type: row.maintenance_type || 'Maintenance',
        status: row.status || 'Recorded',
        description: row.description?.trim() || '-',
    }));

    for (const row of input.maintenance.filter(isDamageMaintenance)) {
        damagedGears.push({
            date: maintenanceDate(row) ? formatExportDate(maintenanceDate(row)) : '-',
            gearName: gearName(row.gears),
            category: gearCategory(row.gears),
            reportedBy: 'Maintenance log',
            source: 'Maintenance',
            notes: row.description?.trim() || row.maintenance_type || '',
        });
    }

    damagedGears.sort((a, b) => b.date.localeCompare(a.date));

    const carBookings: CarBookingExportRow[] = input.carBookings
        .map((booking) => {
            const assignment = assignmentByBooking.get(booking.id);
            return {
                date: booking.date_of_use,
                timeSlot: booking.time_slot,
                employee: booking.employee_name,
                car: carLabel(assignment),
                destination: booking.destination?.trim() || '-',
                purpose: booking.purpose?.trim() || '-',
                status: booking.status,
                returned: returnedLabel(booking.status, booking.date_of_use, today),
            };
        })
        .sort((a, b) => b.date.localeCompare(a.date) || a.timeSlot.localeCompare(b.timeSlot));

    const carsNotReturned: CarNotReturnedRow[] = input.carBookings
        .filter((booking) => booking.status === 'Approved' && booking.date_of_use < today)
        .map((booking) => {
            const assignment = assignmentByBooking.get(booking.id);
            return {
                employee: booking.employee_name,
                car: carLabel(assignment),
                dateOfUse: booking.date_of_use,
                timeSlot: booking.time_slot,
                destination: booking.destination?.trim() || '-',
                daysOverdue: differenceInCalendarDays(startOfDay(new Date()), parseISO(booking.date_of_use)),
            };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const carFrequencyMap = new Map<string, CarFrequencyRow>();
    for (const car of input.fleetCars) {
        carFrequencyMap.set(car.id, {
            car: car.label,
            plate: car.plate || '-',
            bookings: 0,
            completed: 0,
            active: 0,
            notReturned: 0,
            currentStatus: car.status || 'Unknown',
        });
    }

    for (const booking of input.carBookings) {
        const assignment = assignmentByBooking.get(booking.id);
        const carId = assignment?.car_id;
        if (!carId) continue;
        const row = carFrequencyMap.get(carId);
        if (!row) continue;
        row.bookings += 1;
        if (booking.status === 'Completed') row.completed += 1;
        if (booking.status === 'Approved' && booking.date_of_use >= today) row.active += 1;
        if (booking.status === 'Approved' && booking.date_of_use < today) row.notReturned += 1;
    }

    const carFrequency = Array.from(carFrequencyMap.values())
        .filter((row) => row.bookings > 0 || /maintenance|repair|service/i.test(row.currentStatus))
        .sort((a, b) => b.bookings - a.bookings || a.car.localeCompare(b.car));

    const carDaily = new Map<string, { bookings: number; returns: number }>();
    for (const booking of input.carBookings) {
        const bucket = carDaily.get(booking.date_of_use) || { bookings: 0, returns: 0 };
        bucket.bookings += 1;
        if (booking.status === 'Completed') bucket.returns += 1;
        carDaily.set(booking.date_of_use, bucket);
    }

    const dailyOperations: DailyOperationsRow[] = input.trends
        .map((trend) => {
            const car = carDaily.get(trend.date) || { bookings: 0, returns: 0 };
            return {
                date: trend.date,
                label: trend.label,
                gearRequests: trend.requests,
                gearReturns: trend.checkins,
                gearCheckouts: trend.checkouts,
                damages: trend.damages,
                carBookings: car.bookings,
                carReturns: car.returns,
            };
        })
        .filter((row) =>
            row.gearRequests > 0
            || row.gearReturns > 0
            || row.gearCheckouts > 0
            || row.damages > 0
            || row.carBookings > 0
            || row.carReturns > 0
        );

    const gearUsage = Array.from(gearUsageMap.values())
        .filter((row) => row.unitsRequested > 0 || row.returns > 0 || row.checkouts > 0)
        .sort((a, b) => b.unitsRequested - a.unitsRequested || b.returns - a.returns);

    const uniqueGearNames = new Set(gearUsage.map((row) => row.name));
    const gearInMaintenance = input.gearCatalog
        .filter((gear) => /damage|repair|maintenance/i.test(String(gear.status || '')))
        .reduce((sum, gear) => sum + (gear.quantity ?? 1), 0);

    const fleetTotal = input.fleetCars.filter((car) => car.status !== 'Retired').length;
    const fleetAvailable = input.fleetCars.filter((car) => car.status === 'Available').length;
    const carsInMaintenance = input.fleetCars.filter((car) => /maintenance|repair/i.test(String(car.status || ''))).length;

    const kpis: ReportExportKpis = {
        gearsUsed: uniqueGearNames.size,
        gearUnitsRequested: gearUsage.reduce((sum, row) => sum + row.unitsRequested, 0),
        gearReturns: input.checkins.filter((row) => isCheckin(row.action)).length,
        damagedGears: damagedGears.length,
        maintenanceDone: maintenanceRows.length,
        gearInMaintenance,
        carsBooked: input.carBookings.length,
        carsReturned: input.carBookings.filter((row) => row.status === 'Completed').length,
        carsNotReturned: carsNotReturned.length,
        carsInMaintenance,
        activeCarTrips: input.carBookings.filter((row) => row.status === 'Approved' && row.date_of_use >= today).length,
        pendingCarBookings: input.carBookings.filter((row) => row.status === 'Pending').length,
        uniqueCarBookers: new Set(input.carBookings.map((row) => row.requester_id).filter(Boolean)).size,
        fleetTotal,
        fleetAvailable,
    };

    return {
        kpis,
        dailyOperations,
        gearUsage,
        damagedGears,
        maintenance: maintenanceRows,
        carBookings,
        carFrequency,
        carsNotReturned,
    };
}

function formatExportDate(iso: string): string {
    return format(new Date(iso), 'dd/MM/yy');
}
