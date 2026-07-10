export type Checkin = {
    id: string;
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    gearId: string;
    quantity: number;
    gearName: string;
    checkinDate: Date | null;
    notes: string;
    status: string;
    condition: string;
    damageNotes: string | null;
    requestId: string | null;
};

export type RequestLineSummary = {
    requestId: string;
    gearId: string;
    gearName: string;
    requestedQty: number;
    completedQty: number;
    pendingQty: number;
    outstandingQty: number;
};

export type RequestSummary = {
    requestId: string;
    totalRequestedQty: number;
    totalCompletedQty: number;
    totalPendingQty: number;
    totalOutstandingQty: number;
    lines: RequestLineSummary[];
};
