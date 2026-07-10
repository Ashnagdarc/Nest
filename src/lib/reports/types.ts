export interface ReportDateRange {
    from: string;
    to: string;
    label: string;
}

export interface ReportSummary {
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
    completedRequests: number;
    totalCheckins: number;
    totalCheckouts: number;
    damageReports: number;
    activeUsers: number;
    totalUsers: number;
    inventoryTotal: number;
    inventoryAvailable: number;
    inventoryCheckedOut: number;
    utilizationRate: number;
}

export interface ReportTrendPoint {
    date: string;
    label: string;
    requests: number;
    checkins: number;
    checkouts: number;
    damages: number;
}

export interface PopularGearRow {
    name: string;
    category: string | null;
    requestCount: number;
    unitsRequested: number;
}

export interface ReportActivityRow {
    id: string;
    type: string;
    timestamp: string;
    userName: string;
    gearName: string;
    status: string;
    detail: string;
}

/** Top-line KPIs for the export cover sheet */
export interface ReportExportKpis {
    gearsUsed: number;
    gearUnitsRequested: number;
    gearReturns: number;
    damagedGears: number;
    maintenanceDone: number;
    gearInMaintenance: number;
    carsBooked: number;
    carsReturned: number;
    carsNotReturned: number;
    carsInMaintenance: number;
    activeCarTrips: number;
    pendingCarBookings: number;
    uniqueCarBookers: number;
    fleetTotal: number;
    fleetAvailable: number;
}

export interface GearUsageExportRow {
    name: string;
    category: string;
    unitsRequested: number;
    requestLines: number;
    returns: number;
    checkouts: number;
    damageReports: number;
}

export interface DamagedGearExportRow {
    date: string;
    gearName: string;
    category: string;
    reportedBy: string;
    source: string;
    notes: string;
}

export interface MaintenanceExportRow {
    date: string;
    gearName: string;
    type: string;
    status: string;
    description: string;
}

export interface DailyOperationsRow {
    date: string;
    label: string;
    gearRequests: number;
    gearReturns: number;
    gearCheckouts: number;
    damages: number;
    carBookings: number;
    carReturns: number;
}

export interface CarBookingExportRow {
    date: string;
    timeSlot: string;
    employee: string;
    car: string;
    destination: string;
    purpose: string;
    status: string;
    returned: string;
}

export interface CarFrequencyRow {
    car: string;
    plate: string;
    bookings: number;
    completed: number;
    active: number;
    notReturned: number;
    currentStatus: string;
}

export interface CarNotReturnedRow {
    employee: string;
    car: string;
    dateOfUse: string;
    timeSlot: string;
    destination: string;
    daysOverdue: number;
}

export interface ReportExportSections {
    kpis: ReportExportKpis;
    dailyOperations: DailyOperationsRow[];
    gearUsage: GearUsageExportRow[];
    damagedGears: DamagedGearExportRow[];
    maintenance: MaintenanceExportRow[];
    carBookings: CarBookingExportRow[];
    carFrequency: CarFrequencyRow[];
    carsNotReturned: CarNotReturnedRow[];
}

export interface AdminReportData {
    range: ReportDateRange;
    summary: ReportSummary;
    trends: ReportTrendPoint[];
    requestStatus: Array<{ status: string; count: number }>;
    popularGear: PopularGearRow[];
    activity: ReportActivityRow[];
    export: ReportExportSections;
}
