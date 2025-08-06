"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload } from 'lucide-react';
import { useGears } from '@/hooks/use-manage-gears/useGears';
import { useMaintenance } from '@/hooks/use-manage-gears/useMaintenance';
import { GearList } from '@/components/admin/manage-gears/GearList';
import { AddGearModal } from '@/components/admin/manage-gears/AddGearModal';
import { EditGearModal } from '@/components/admin/manage-gears/EditGearModal';
import { MaintenanceModal } from '@/components/admin/manage-gears/MaintenanceModal';
import { GearDetailsModal } from '@/components/admin/manage-gears/GearDetailsModal';
import { FilterControls } from '@/components/admin/manage-gears/FilterControls';
import { BatchActionsToolbar } from '@/components/admin/manage-gears/BatchActionsToolbar';
import { Pagination } from '@/components/ui/Pagination';
import { Gear } from '@/types/supabase';
import Papa from 'papaparse';

export default function ManageGearsPage() {
  const {
    gears,
    total,
    isLoading,
    isError,
    error,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    pageSize,
    setPageSize,
    addGear,
    updateGear,
    deleteGear,
  } = useGears();

  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<Gear | null>(null);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
  const [isGearDetailsOpen, setIsGearDetailsOpen] = useState(false);

  const {
    maintenanceRecords,
    isLoading: loadingMaintenance,
    addMaintenance,
  } = useMaintenance(selectedGear?.id || null);

  const filteredGears = gears.filter(gear => {
    const statusMatch = filterStatus === 'all' || gear.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || gear.category === filterCategory;
    const searchMatch = gear.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gear.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGearIds(filteredGears.map(g => g.id));
    } else {
      setSelectedGearIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedGearIds(prev => checked ? [...prev, id] : prev.filter(gid => gid !== id));
  };

  const handleOpenEditDialog = (gear: Gear) => {
    setEditingGear(gear);
    setIsEditModalOpen(true);
  };

  const handleOpenMaintenance = (gear: Gear) => {
    setSelectedGear(gear);
    setMaintenanceModalOpen(true);
  };

  const handleOpenGearDetails = (gear: Gear) => {
    setSelectedGear(gear);
    setIsGearDetailsOpen(true);
  };

  const handleExport = () => {
    const csv = Papa.unparse(gears);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gears_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchDelete = () => {
    selectedGearIds.forEach(id => deleteGear(id));
    setSelectedGearIds([]);
  };

  const handleBatchUpdateStatus = (status: string) => {
    selectedGearIds.forEach(id => {
      const gear = gears.find(g => g.id === id);
      if (gear) {
        updateGear({ ...gear, status });
      }
    });
    setSelectedGearIds([]);
  };

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterCategory !== 'all';
  const filterChips = [
    searchTerm && {
      label: `Search: "${searchTerm}"`,
      onRemove: () => setSearchTerm(''),
    },
    filterStatus !== 'all' && {
      label: `Status: ${filterStatus}`,
      onRemove: () => setFilterStatus('all'),
    },
    filterCategory !== 'all' && {
      label: `Category: ${filterCategory}`,
      onRemove: () => setFilterCategory('all'),
    },
  ].filter(Boolean);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategory('all');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-[1400px] mx-auto pb-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card rounded-lg p-4 border shadow-sm">
        <h1 className="text-3xl font-bold text-foreground">Manage Gears</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport} className="text-xs sm:text-sm bg-background hover:bg-accent">
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button variant="outline" onClick={() => {}} className="text-xs sm:text-sm bg-background hover:bg-accent">
            <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <AddGearModal
            isAddModalOpen={isAddModalOpen}
            setIsAddModalOpen={setIsAddModalOpen}
            handleAddGear={addGear}
          />
        </div>
      </div>

      <BatchActionsToolbar
        selectedGearIds={selectedGearIds}
        handleBatchDelete={handleBatchDelete}
        handleBatchUpdateStatus={handleBatchUpdateStatus}
      />

      <Card className="shadow-md border-muted">
        <CardHeader className="bg-card pb-0">
          <div className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
            <div>
              <CardTitle className="text-xl">Gear List</CardTitle>
              <CardDescription>View, filter, and manage all equipment.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Total: {total} items</span>
              {isLoading && <span className="text-primary animate-pulse">● Refreshing</span>}
            </div>
          </div>
          <FilterControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            handleClearAllFilters={handleClearAllFilters}
            hasActiveFilters={hasActiveFilters}
            filterChips={filterChips as { label: string; onRemove: () => void; }[]}
          />
        </CardHeader>
        <CardContent className="px-2 pt-4 md:px-6">
          {isError && <p className="text-red-500">{error?.message}</p>}
          <GearList
            gears={gears}
            loading={isLoading}
            selectedGearIds={selectedGearIds}
            handleSelectAll={handleSelectAll}
            handleSelectOne={handleSelectOne}
            handleOpenGearDetails={handleOpenGearDetails}
            handleOpenEditDialog={handleOpenEditDialog}
            handleDeleteGear={(gear) => deleteGear(gear.id)}
            handleOpenMaintenance={handleOpenMaintenance}
            filteredGears={filteredGears}
          />
          <div className="flex justify-center mt-6">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize)}
              onPageChange={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <EditGearModal
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        editingGear={editingGear}
        handleSubmitEdits={updateGear}
        isSubmitting={false}
      />

      <MaintenanceModal
        maintenanceModalOpen={maintenanceModalOpen}
        setMaintenanceModalOpen={setMaintenanceModalOpen}
        selectedGear={selectedGear}
        maintenanceRecords={maintenanceRecords}
        loadingMaintenance={loadingMaintenance}
        handleAddMaintenance={addMaintenance}
      />

      <GearDetailsModal
        isGearDetailsOpen={isGearDetailsOpen}
        setIsGearDetailsOpen={setIsGearDetailsOpen}
        selectedGear={selectedGear}
        handleOpenMaintenance={handleOpenMaintenance}
        handleOpenEditDialog={handleOpenEditDialog}
      />
    </motion.div>
  );
}
