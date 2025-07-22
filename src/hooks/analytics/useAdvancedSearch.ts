import { useMemo } from 'react';

export interface SearchFilter {
    query: string;
    [key: string]: unknown;
}

export function useAdvancedSearch<T>(data: T[], filter: SearchFilter, fields: (keyof T)[]) {
    return useMemo(() => {
        let filtered = data;
        if (filter.query) {
            const q = filter.query.toLowerCase();
            filtered = filtered.filter(row =>
                fields.some(field => {
                    const value = row[field];
                    return typeof value === 'string' && value.toLowerCase().includes(q);
                })
            );
        }
        // Add more field-based filtering here if needed
        return filtered;
    }, [data, filter, fields]);
} 