/**
 * Inventory Management Component
 * 
 * Administrative interface for equipment inventory management.
 * Provides filtering, search, and CRUD operations for equipment.
 * 
 * @component
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorDisplay from '@/components/ui/error-display';
import { ViewItemModal } from './ViewItemModal';
import { EditItemModal } from './EditItemModal';
import { InventoryFilters, InventoryActions, InventoryTable } from './inventory';
import { useInventoryData } from '@/hooks/inventory/use-inventory-data';

export function InventoryManagement() {
    // Data management
    const {
        inventory,
        categories,
        isLoading,
        error,
        filter,
        categoryFilter,
        searchTerm,
        setFilter,
        setCategoryFilter,
        setSearchTerm,
        fetchInventory,
    } = useInventoryData();

    // Modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    // Modal handlers
    const handleViewItem = (item: any) => {
        setSelectedItem(item);
        setViewModalOpen(true);
    };

    const handleEditItem = (item: any) => {
        setSelectedItemId(item.id);
        setEditModalOpen(true);
    };

    const handleAddEquipment = () => {
        // TODO: Implement add equipment functionality
        console.log('Add equipment clicked');
    };

    return (
        <div className="space-y-4">
            {/* Filter and Control Panel */}
            <div className="flex flex-wrap gap-2 justify-between">
                <InventoryFilters
                    filter={filter}
                    onFilterChange={setFilter}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    categories={categories}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />

                <InventoryActions
                    onRefresh={fetchInventory}
                    onAddEquipment={handleAddEquipment}
                />
            </div>

            {/* Content Display */}
            {error ? (
                <ErrorDisplay
                    error={error}
                    onRetry={fetchInventory}
                />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading inventory...</span>
                </div>
            ) : (
                <InventoryTable
                    items={inventory}
                    onViewItem={handleViewItem}
                    onEditItem={handleEditItem}
                />
            )}

            {/* View Modal */}
            <ViewItemModal
                item={selectedItem}
                open={viewModalOpen}
                onOpenChange={setViewModalOpen}
            />

            {/* Edit Modal */}
            <EditItemModal
                itemId={selectedItemId}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                onSaved={fetchInventory}
            />
        </div>
    );
} 