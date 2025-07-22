import { useState } from 'react';

export function useBulkSelection<T extends { id: string | number }>(rows: T[]) {
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

    const isSelected = (id: string | number) => selectedIds.includes(id);

    const toggleSelect = (id: string | number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(_id => _id !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSelectedIds(rows.map(row => row.id));
    const deselectAll = () => setSelectedIds([]);

    return {
        selectedIds,
        isSelected,
        toggleSelect,
        selectAll,
        deselectAll,
        allSelected: selectedIds.length === rows.length && rows.length > 0,
        someSelected: selectedIds.length > 0 && selectedIds.length < rows.length,
    };
} 