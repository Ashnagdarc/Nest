"use client";

import { Edit, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import AddGearForm from "@/components/admin/add-gear-form";
import EditGearForm from "@/components/admin/edit-gear-form";
import { getCategoryIcon } from "@/lib/utils/category";
import { getGearStatusClass } from "@/components/admin/manage-gears/gear-status";
import type { ManageGearsPageState } from "@/hooks/admin/useManageGearsPage";
import type { Gear } from "@/types/supabase";

import type { ManageGearsPageState } from "@/hooks/admin/useManageGearsPage";

interface GearInventoryDialogsProps {
    state: ManageGearsPageState;
}

export function GearInventoryDialogs({ state }: GearInventoryDialogsProps) {
    const {
        profile,
        importDialogOpen,
        setImportDialogOpen,
        importFile,
        isAddModalOpen,
        setIsAddModalOpen,
        isGearDetailsOpen,
        setIsGearDetailsOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        maintenanceModalOpen,
        setMaintenanceModalOpen,
        showSqlDialog,
        setShowSqlDialog,
        sqlToRun,
        selectedGear,
        editingGear,
        isSubmitting,
        maintenanceRecords,
        loadingMaintenance,
        maintenanceForm,
        toast,
        handleAddGear,
        handleImportDialogClose,
        handleImportFileChange,
        handleImport,
        handleOpenMaintenance,
        handleOpenEditDialog,
        handleSubmitEdits,
        handleCloseMaintenance,
        handleAddMaintenance,
    } = state;
    return (
        <>
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Import gear CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file to import gear data. Existing records with matching IDs will be
                            updated.
                        </DialogDescription>
                    </DialogHeader>
                    <Input type="file" accept=".csv" onChange={handleImportFileChange} className="bg-background" />
                    <DialogFooter>
                        <Button variant="secondary" onClick={handleImportDialogClose}>
                            Cancel
                        </Button>
                        <Button disabled={!importFile} onClick={handleImport}>
                            Import
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {profile?.role === "Admin" ? (
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="flex max-h-[min(90dvh,820px)] w-[95vw] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
                        <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
                            <DialogTitle>Add new equipment</DialogTitle>
                            <DialogDescription>
                                Create an inventory record. Required fields are marked in each section.
                            </DialogDescription>
                        </DialogHeader>
                        <AddGearForm onSubmit={handleAddGear} isSubmitting={isSubmitting} />
                    </DialogContent>
                </Dialog>
            ) : null}

            <GearDetailsDialog
                open={isGearDetailsOpen}
                onOpenChange={setIsGearDetailsOpen}
                gear={selectedGear}
                onOpenMaintenance={handleOpenMaintenance}
                onOpenEditDialog={handleOpenEditDialog}
            />

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="w-[95vw] max-w-full sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>Edit Gear</DialogTitle>
                        <DialogDescription>Update the details for {editingGear?.name}.</DialogDescription>
                    </DialogHeader>
                    {editingGear && (
                        <EditGearForm gear={editingGear} onSubmit={handleSubmitEdits} isSubmitting={isSubmitting} />
                    )}
                </DialogContent>
            </Dialog>

            <MaintenanceDialog
                open={maintenanceModalOpen}
                onOpenChange={setMaintenanceModalOpen}
                gear={selectedGear}
                records={maintenanceRecords}
                loading={loadingMaintenance}
                form={maintenanceForm}
                onClose={handleCloseMaintenance}
                onSubmit={handleAddMaintenance}
            />

            <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
                <DialogContent className="w-[90vw] max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Database Setup Required</DialogTitle>
                        <DialogDescription>
                            To enable gear deletion, a database administrator needs to run the following SQL commands
                            in the Supabase SQL Editor:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 rounded-md bg-muted p-4">
                        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">{sqlToRun}</pre>
                    </div>
                    <DialogFooter className="mt-6 flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => {
                                navigator.clipboard.writeText(sqlToRun);
                                toast({
                                    title: "Copied!",
                                    description: "SQL commands copied to clipboard",
                                });
                            }}
                        >
                            Copy SQL
                        </Button>
                        <Button onClick={() => setShowSqlDialog(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

interface GearDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gear: Gear | null;
    onOpenMaintenance: (gear: Gear) => void;
    onOpenEditDialog: (gear: Gear) => void;
}

function GearDetailsDialog({ open, onOpenChange, gear, onOpenMaintenance, onOpenEditDialog }: GearDetailsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent key={gear?.id ?? "no-gear"} className="w-[95vw] max-w-full sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>Gear Details - {gear?.name ?? "Loading..."}</DialogTitle>
                    <DialogDescription>View complete information for {gear?.name ?? "Loading..."}.</DialogDescription>
                </DialogHeader>
                {gear && (
                    <div className="grid gap-6 py-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border bg-muted shadow-sm">
                                {gear.image_url ? (
                                    <img src={gear.image_url} alt={gear.name} className="h-full w-full object-cover" />
                                ) : (
                                    getCategoryIcon(gear.category, 36)
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">{gear.name || "No Name"}</h3>
                                <div className="mt-1 flex items-center gap-2">
                                    {getCategoryIcon(gear.category, 16)}
                                    <p className="text-sm text-muted-foreground">{gear.category || "No Category"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                                <span
                                    className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${getGearStatusClass(gear.status)}`}
                                >
                                    {gear.status}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Serial Number</h4>
                                <p className="mt-1 font-mono text-sm">{gear.serial_number || "N/A"}</p>
                            </div>
                            {gear.description && (
                                <div className="col-span-1 sm:col-span-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                                    <p className="mt-1 text-sm">{gear.description}</p>
                                </div>
                            )}
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Added On</h4>
                                <p className="mt-1 text-sm">
                                    {gear.created_at ? new Date(gear.created_at).toLocaleDateString() : "N/A"}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground">Last Updated</h4>
                                <p className="mt-1 text-sm">
                                    {gear.updated_at ? new Date(gear.updated_at).toLocaleDateString() : "N/A"}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => onOpenMaintenance(gear)}>
                                <Wrench className="mr-2 h-4 w-4 text-yellow-600" />
                                Maintenance
                            </Button>
                            <Button
                                onClick={() => {
                                    onOpenEditDialog(gear);
                                    onOpenChange(false);
                                }}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Gear
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

interface MaintenanceRecord {
    id: string;
    status: string;
    date: string;
    description: string;
}

function getMaintenanceStatusClass(status: string): string {
    switch (status) {
        case "Completed":
        case "Maintenance Completed":
            return "bg-green-100 text-green-800";
        case "Scheduled":
        case "Scheduled Maintenance":
            return "bg-blue-100 text-blue-800";
        case "In Progress":
        case "Under Repair":
            return "bg-yellow-100 text-yellow-800";
        case "Needs Repair":
            return "bg-orange-100 text-orange-800";
        case "Damaged":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

interface MaintenanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    gear: Gear | null;
    records: MaintenanceRecord[];
    loading: boolean;
    form: ManageGearsPageState["maintenanceForm"];
    onClose: () => void;
    onSubmit: ManageGearsPageState["handleAddMaintenance"];
}

function MaintenanceDialog({ open, onOpenChange, gear, records, loading, form, onClose, onSubmit }: MaintenanceDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-full sm:max-w-[625px]">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-yellow-600" />
                        Maintenance for {gear?.name}
                    </DialogTitle>
                    <DialogDescription>View and log maintenance events for this gear.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Maintenance History</h4>
                        <span className="text-xs text-muted-foreground">{records.length} records</span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                                <p className="text-xs text-muted-foreground">Loading records...</p>
                            </div>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 py-8 text-muted-foreground">
                            <Wrench className="mb-2 h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm">No maintenance records found.</p>
                            <p className="mt-1 text-xs">Add your first maintenance record below.</p>
                        </div>
                    ) : (
                        <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border bg-muted/10 p-3 pr-1">
                            {records.map((rec) => (
                                <div key={rec.id} className="rounded-md border bg-card p-3 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-sm font-medium ${getMaintenanceStatusClass(rec.status)}`}
                                        >
                                            {rec.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(rec.date).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-sm">{rec.description}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 border-t pt-4">
                        <h4 className="mb-3 text-sm font-semibold">Add New Maintenance Record</h4>
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <div className="flex flex-col gap-4 sm:flex-row">
                                <div className="flex-1">
                                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                                    <select
                                        className={`mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm ${form.formState.errors.status ? "border-red-500" : ""}`}
                                        {...form.register("status", { required: "Status is required" })}
                                    >
                                        <option value="">Select status...</option>
                                        <option value="Scheduled">Scheduled Maintenance</option>
                                        <option value="In Progress">Under Repair</option>
                                        <option value="Completed">Maintenance Completed</option>
                                        <option value="Needs Repair">Needs Repair</option>
                                        <option value="Damaged">Mark as Damaged</option>
                                    </select>
                                    {form.formState.errors.status && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {form.formState.errors.status.message}
                                        </p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                                    <Input
                                        type="datetime-local"
                                        className={`mt-1 w-full bg-background text-sm ${form.formState.errors.date ? "border-red-500" : ""}`}
                                        {...form.register("date", { required: "Date is required" })}
                                    />
                                    {form.formState.errors.date && (
                                        <p className="mt-1 text-xs text-red-500">{form.formState.errors.date.message}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                                <Textarea
                                    className={`mt-1 w-full bg-background text-sm ${form.formState.errors.description ? "border-red-500" : ""}`}
                                    rows={3}
                                    {...form.register("description", {
                                        required: "Description is required",
                                        minLength: { value: 5, message: "Description must be at least 5 characters" },
                                    })}
                                    placeholder="Describe the maintenance performed..."
                                />
                                {form.formState.errors.description && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {form.formState.errors.description.message}
                                    </p>
                                )}
                            </div>
                            <DialogFooter className="gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={onClose} className="mt-2">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || form.formState.isSubmitting}
                                    className="mt-2"
                                >
                                    {loading ? "Saving..." : "Log Maintenance"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
