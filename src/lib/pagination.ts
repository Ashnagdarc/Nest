export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function getTotalPages(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

export function getPageRange(page: number, pageSize: number, total: number) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const safeTotal = Math.max(0, total);
    const totalPages = getTotalPages(safeTotal, safePageSize);
    const from = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
    const to = Math.min(safePage * safePageSize, safeTotal);

    return { from, to, totalPages };
}

export function formatPageSummary(page: number, pageSize: number, total: number, itemLabel = "item") {
    const { from, to } = getPageRange(page, pageSize, total);
    if (total === 0) return `No ${itemLabel}s`;
    const plural = total === 1 ? itemLabel : `${itemLabel}s`;
    return `Showing ${from}–${to} of ${total} ${plural}`;
}
