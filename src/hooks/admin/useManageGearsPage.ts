"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { createGearNotification } from '@/lib/notifications';
import Papa from 'papaparse';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiGet } from '@/lib/apiClient';
import { Gear } from '@/types/supabase';
import { gearQueries } from '@/lib/api/queries';
import { useDebounce } from '@/hooks/useDebounce';
import { isFileList, isFile } from '@/lib/utils/browser-safe';
import { useGearInventorySummary } from '@/hooks/admin/useGearInventorySummary';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function useManageGearsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [gears, setGears] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<Gear | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGearIds, setSelectedGearIds] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedGear, setSelectedGear] = useState<Gear | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [isGearDetailsOpen, setIsGearDetailsOpen] = useState(false);
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [sqlToRun, setSqlToRun] = useState('');
  const [isDatabaseFixed, setIsDatabaseFixed] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manageGearsPageSize');
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });
  const [total, setTotal] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const { summary: inventorySummary, loading: summaryLoading } = useGearInventorySummary(summaryRefreshKey);

  // --- UI State Preservation ---
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  // Maintenance form state and logic
  const maintenanceForm = useForm({
    defaultValues: {
      status: 'Maintenance Completed',
      description: '',
      date: new Date().toISOString().slice(0, 16), // yyyy-MM-ddTHH:mm
    },
    resolver: zodResolver(
      z.object({
        status: z.string().min(1, { message: "Status is required" }),
        description: z.string().min(5, { message: "Description must be at least 5 characters" }),
        date: z.string().min(1, { message: "Date is required" })
      })
    )
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterStatus, filterCategory, pageSize]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('manageGearsPageSize', String(pageSize));
    }
  }, [pageSize]);

  useEffect(() => {
    fetchGears(page, pageSize);
    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gears' }, () => fetchGears())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gears' }, () => fetchGears())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gears' }, () => fetchGears())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [page, pageSize, filterStatus, filterCategory, debouncedSearch]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  async function fetchGears(p = page, ps = pageSize) {
    if (listContainerRef.current) {
      scrollPositionRef.current = listContainerRef.current.scrollTop;
    }
    setLoading(true);
    setApiError(null);
    try {
      const result = await gearQueries.getGearsWithPagination(
        p,
        ps,
        { status: filterStatus, category: filterCategory, search: debouncedSearch }
      );
      const { data, total: newTotal, error } = result as { data: Gear[]; total?: number; error: string | null };
      if (error) {
        setApiError(error);
        setGears([]);
        setTotal(0);
      } else {
        setGears(data || []);
        setTotal(newTotal || 0);
        setSummaryRefreshKey((key) => key + 1);
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      setGears([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (listContainerRef.current) {
          listContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 0);
    }
  }

  const handleAddGear = async (data: Gear) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add gear",
          variant: "destructive",
        });
        return;
      }
      // Ensure user has Admin/SuperAdmin role before proceeding (matches RLS)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || (profile.role !== 'Admin' && profile.role !== 'SuperAdmin')) {
        toast({
          title: 'Permission denied',
          description: 'Only Admins can add gear.',
          variant: 'destructive',
        });
        return;
      }

      // Generate a unique ID for the new gear
      const gearId = crypto.randomUUID();

      // Log the file received from the form
      console.log("[AddGear] Received image_url:", data.image_url);

      // Handle image upload if there is one
      let imageUrl = null;
      if (data.image_url instanceof File) {
        const fileExt = data.image_url.name.split('.')?.pop();
        const filePath = `gears/${gearId}/${Date.now()}.${fileExt}`;
        // Upload to the gear_images bucket
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('gear_images')
          .upload(filePath, data.image_url, { upsert: true });
        if (uploadError || !uploadData) {
          console.error("[AddGear] Error uploading gear image:", uploadError);
          toast({
            title: "Warning",
            description: "Gear added but image upload failed. Try updating the gear later.",
            variant: "destructive",
          });
        } else {
          // Retrieve the public URL from the correct bucket
          const { data: urlData } = supabase.storage
            .from('gear_images')
            .getPublicUrl(uploadData.path);
          if (!urlData?.publicUrl) {
            console.error("[AddGear] Error getting public URL for uploaded image.");
            toast({
              title: "Warning",
              description: "Gear added but image URL could not be retrieved.",
              variant: "destructive",
            });
          } else {
            imageUrl = urlData.publicUrl;
            console.log("[AddGear] Gear image URL:", imageUrl);
          }
        }
      } else {
        toast({
          title: "No Image Provided",
          description: "Gear will be added without an image. You can update it later.",
          variant: "default",
        });
        if (data.image_url !== undefined) {
          console.warn("[AddGear] image_url is not a File:", data.image_url);
        }
      }

      // Map form fields to DB columns
      const gearToInsert = {
        id: gearId,
        name: data.name,
        category: data.category,
        description: data.description,
        serial_number: data.serial_number,
        purchase_date: data.purchase_date || null,
        condition: (data as { condition?: string }).condition || null,
        status: data.status,
        quantity: data.quantity || 1,
        available_quantity: data.quantity || 1,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        image_url: imageUrl,
      };
      console.log("[AddGear] Inserting gear:", gearToInsert);

      const { error: insertError } = await supabase
        .from('gears')
        .insert([gearToInsert]);

      if (insertError) {
        console.error("Error adding gear (PostgrestError):", insertError);
        toast({
          title: "Error",
          description: (insertError as any)?.message || "Failed to add gear",
          variant: "destructive",
        });
        throw insertError;
      }

      // Create notification (non-blocking)
      try {
        await createGearNotification(user.id, data.name || '', 'add');
      } catch (e) {
        console.warn('[AddGear] Non-blocking notification failed:', e);
      }

      // Refresh gear list
      fetchGears();

      toast({
        title: "Success",
        description: "Gear added successfully",
      });
      setIsAddModalOpen(false);

      // Send Google Chat notification for gear add (non-blocking, isolated)
      try {
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user?.id)
          .single();
        await fetch('/api/notifications/google-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'ADMIN_ADD_GEAR',
            payload: {
              adminName: adminProfile?.full_name || 'Unknown Admin',
              adminEmail: adminProfile?.email || 'Unknown Email',
              gearNames: [data.name],
              category: data.category,
              action: 'add',
            }
          })
        });
      } catch (chatErr) {
        console.warn('[AddGear] Google Chat notification failed:', chatErr);
      }
    } catch (error: unknown) {
      const desc = typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error || {});
      console.error("Error adding gear:", error);
      toast({
        title: "Error",
        description: desc || "Failed to add gear",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add function to fix database permissions
  const fixDatabasePermissions = async () => {
    try {
      setLoading(true);
      console.log("Attempting to fix database permissions...");

      const response = await fetch('/api/admin/fix-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Database permission fix failed:", result);

        if (result.sql) {
          // If we have SQL to run, show it in a dialog
          setShowSqlDialog(true);
          setSqlToRun(result.sql);
        }

        toast({
          title: "Permission Setup Failed",
          description: "Could not automatically set up database permissions. See console for details.",
          variant: "destructive",
        });
        return false;
      }

      console.log("Database permissions fixed successfully");
      setIsDatabaseFixed(true);

      toast({
        title: "Success",
        description: "Database permissions have been updated to allow gear deletion",
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fixing database permissions:", error);
        toast({
          title: "Error",
          description: "Failed to update database permissions",
          variant: "destructive",
        });
      } else {
        console.error("Error fixing database permissions:", error);
        toast({
          title: "Error",
          description: "Failed to update database permissions",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update the handleDeleteGear function
  const handleDeleteGear = async (gear: Gear) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete gear",
        variant: "destructive",
      });
      return;
    }

    // Confirm deletion first
    if (!window.confirm(`Are you sure you want to delete ${gear.name}?`)) {
      return;
    }

    setLoading(true);

    try {
      console.log("DELETION - Attempting to delete gear with ID:", gear.id);

      // Try hard deletion first
      let deletionSucceeded = false;

      try {
        // If we've already fixed the database permissions, try using the admin function
        if (isDatabaseFixed) {
          console.log("Using admin deletion function...");
          const response = await fetch('/api/admin/delete-gear', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gearId: gear.id }),
          });

          if (response.ok) {
            console.log("Admin deletion function succeeded!");
            deletionSucceeded = true;
          } else {
            console.log("Admin deletion function failed");
          }
        }

        // If admin function didn't work or we haven't fixed permissions yet, try standard deletion
        if (!deletionSucceeded) {
          const { error: deleteError } = await supabase
            .from('gears')
            .delete()
            .eq('id', gear.id);

          if (!deleteError) {
            console.log("Standard deletion succeeded!");
            deletionSucceeded = true;
          } else {
            console.log("Standard deletion failed:", deleteError);

            // If we have a foreign key constraint error, respect it
            if (deleteError.message?.includes('foreign key constraint')) {
              throw new Error("Cannot delete gear because it's being used in bookings or other records");
            }
          }
        }
      } catch (e) {
        console.log("Initial deletion attempt failed:", e);
      }

      // Check if the gear was actually deleted
      const { data: checkData } = await supabase
        .from('gears')
        .select('id')
        .eq('id', gear.id)
        .maybeSingle();

      // If gear still exists and we haven't tried fixing database permissions yet
      if (checkData && !isDatabaseFixed) {
        console.log("Gear still exists and permissions aren't fixed. Attempting to fix database permissions...");

        const permissionFixed = await fixDatabasePermissions();

        if (permissionFixed) {
          console.log("Permissions fixed, trying deletion again...");

          // Try deletion again with the new permissions
          const response = await fetch('/api/admin/delete-gear', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gearId: gear.id }),
          });

          if (response.ok) {
            console.log("Admin deletion after permission fix succeeded!");
            deletionSucceeded = true;
          } else {
            console.log("Admin deletion after permission fix failed");
          }
        }
      }

      // Verify one more time if deletion succeeded
      const { data: finalCheck } = await supabase
        .from('gears')
        .select('id')
        .eq('id', gear.id)
        .maybeSingle();

      if (finalCheck) {
        console.log("Gear still exists after all deletion attempts. Falling back to soft deletion...");

        // Fall back to soft deletion
        const deletedName = `${gear.name} [DELETED ${new Date().toISOString().slice(0, 10)}]`;
        const deletedGear = {
          name: deletedName,
          status: 'Deleted',
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('gears')
          .update(deletedGear)
          .eq('id', gear.id);

        if (updateError) {
          console.error("Soft deletion failed:", updateError);
          throw new Error(`Failed to delete gear: ${updateError.message}`);
        } else {
          console.log("Soft deletion successful");
        }
      } else {
        console.log("Gear successfully deleted from database!");
        deletionSucceeded = true;
      }

      // Update UI to remove the gear
      setGears(prevGears => prevGears.filter(g => g.id !== gear.id));

      // Create notification
      try {
        await createGearNotification(user.id, gear.name, 'delete');
      } catch (notifyErr) {
        console.log("Notification error (non-critical):", notifyErr);
      }

      // Show success toast
      toast({
        title: "Success",
        description: deletionSucceeded
          ? "Gear permanently deleted from database"
          : "Gear has been removed from the listing",
      });

      // Refresh gear list
      setTimeout(() => fetchGears(), 1000);

    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error deleting gear:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete gear",
          variant: "destructive",
        });
      } else {
        console.error("Error deleting gear:", error);
        toast({
          title: "Error",
          description: "Failed to delete gear",
          variant: "destructive",
        });
      }

      // Refresh data to ensure UI is in sync with backend
      fetchGears();
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = Boolean(searchTerm || filterStatus !== 'all' || filterCategory !== 'all');
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
  ].filter(Boolean) as Array<{ label: string; onRemove: () => void }>;

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterCategory('all');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGearIds(gears.map(g => g.id));
    } else {
      setSelectedGearIds([]);
    }
  };

  // Handle select one
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedGearIds(prev => checked ? [...prev, id] : prev.filter(gid => gid !== id));
  };

  // Export gears as CSV
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

  // Import dialog handlers (logic to be implemented)
  const handleImportDialogOpen = () => setImportDialogOpen(true);
  const handleImportDialogClose = () => {
    setImportDialogOpen(false);
    setImportFile(null);
  };
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  // Import CSV logic
  const handleImport = async () => {
    if (!importFile) return;
    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<any>) => {
        const parsedData = results.data;
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          toast({ title: 'Import Error', description: 'No data found in CSV.', variant: 'destructive' });
          return;
        }
        setLoading(true);
        // Upsert (insert or update by primary key)
        const { error } = await supabase.from('gears').upsert(parsedData, { onConflict: 'id' });
        setLoading(false);
        if (error) {
          toast({ title: 'Import Error', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Import Success', description: 'Gear data imported successfully.' });
          fetchGears();
          handleImportDialogClose();
        }
      },
      error: (err) => {
        toast({ title: 'Import Error', description: err.message, variant: 'destructive' });
      }
    });
  };

  // Batch delete selected filteredGears
  const handleBatchDelete = async () => {
    if (selectedGearIds.length === 0) return;

    setLoading(true);

    try {
      console.log("Batch deleting filteredGears:", selectedGearIds);

      const { error } = await supabase
        .from('gears')
        .delete()
        .in('id', selectedGearIds);

      if (error) {
        console.error("Batch delete error:", error);
        throw error;
      }

      // Create notification for each deleted gear
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await createGearNotification(user.id, `${selectedGearIds.length} items`, 'delete');
      }

      // Refresh gear list
      await fetchGears();

      toast({
        title: 'Batch Delete Success',
        description: 'Selected gear items deleted.'
      });

      setSelectedGearIds([]);
    } catch (error: unknown) {
      console.error("Batch delete error:", error);
      toast({
        title: 'Batch Delete Error',
        description: error instanceof Error ? error.message : 'Failed to delete selected gear items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Batch update status
  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedGearIds.length === 0) return;

    setLoading(true);

    try {
      console.log("Batch updating filteredGears to status:", status, selectedGearIds);

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('gears')
        .update(updateData)
        .in('id', selectedGearIds);

      if (error) {
        console.error("Batch update error:", error);
        throw error;
      }

      // Create notification
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await createGearNotification(
          user.id,
          `${selectedGearIds.length} items marked as ${status}`,
          'update'
        );
      }

      // Refresh gear list
      await fetchGears();

      toast({
        title: `Batch Update Success`,
        description: `Selected gear items marked as ${status}.`
      });

      setSelectedGearIds([]);
    } catch (error: unknown) {
      console.error("Batch update error:", error);
      toast({
        title: 'Batch Update Error',
        description: error instanceof Error ? error.message : 'Failed to update selected gear items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch maintenance records for a gear
  const fetchMaintenanceRecords = async (gearId: string) => {
    if (!gearId) return;

    setLoadingMaintenance(true);
    setMaintenanceRecords([]);

    try {
      const { data, error } = await supabase
        .from('gear_maintenance')
        .select('*')
        .eq('gear_id', gearId)
        .order('date', { ascending: false });

      if (error) {
        console.error("Error fetching maintenance records:", error);
        return;
      }

      setMaintenanceRecords(data || []);
    } catch (err: unknown) {
      console.error("Exception in maintenance records fetch:", err);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  // Open maintenance modal for a gear
  const handleOpenMaintenance = (gear: Gear) => {
    setSelectedGear(gear);
    setMaintenanceModalOpen(true);
    fetchMaintenanceRecords(gear.id);
  };
  const handleCloseMaintenance = () => {
    setMaintenanceModalOpen(false);
    setSelectedGear(null);
    setMaintenanceRecords([]);
  };

  // Maintenance form logic
  const handleAddMaintenance = async (values: {
    status: string;
    description: string;
    date: string;
  }) => {
    setLoadingMaintenance(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Add the maintenance record
      const { data, error } = await supabase
        .from('gear_maintenance')
        .insert([
          {
            gear_id: selectedGear?.id,
            status: values.status,
            description: values.description,
            date: values.date,
            performed_by: user?.id || null
          }
        ]);

      if (error) {
        console.error("Error adding maintenance:", error);
        toast({
          title: 'Error',
          description: "Failed to add maintenance record. Please try again.",
          variant: 'destructive'
        });
        return;
      } else {
        toast({
          title: 'Maintenance Logged',
          description: 'Maintenance event added successfully.',
          variant: 'default'
        });

        // Reset form with current timestamp
        maintenanceForm.reset({
          status: 'Maintenance Completed',
          description: '',
          date: new Date().toISOString().slice(0, 16)
        });

        // Refresh maintenance records to show the new entry
        await fetchMaintenanceRecords(selectedGear?.id || '');

        // Refresh the filteredGears data to get the updated status
        fetchGears();

        // Send Google Chat notification for maintenance (non-blocking)
        try {
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user?.id)
            .single();

          await fetch('/api/notifications/google-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventType: 'ADMIN_MAINTENANCE',
              payload: {
                adminName: adminProfile?.full_name || 'Unknown Admin',
                adminEmail: adminProfile?.email || 'Unknown Email',
                gearName: selectedGear?.name,
                maintenanceStatus: values.status,
                maintenanceDate: values.date,
                description: values.description,
              }
            })
          });
        } catch (notificationError) {
          console.warn('Failed to send Google Chat notification:', notificationError);
          // Don't show error to user as this is non-critical
        }
      }
    } catch (err: unknown) {
      console.error("Exception adding maintenance:", err);
      toast({
        title: 'System Error',
        description: "Could not process maintenance record",
        variant: 'destructive'
      });
    } finally {
      setLoadingMaintenance(false);
    }
  };

  // Handle edit gear dialog open
  const handleOpenEditDialog = (gear: Gear) => {
    // If we only have basic fields, fetch the full gear details
    if (!gear.description || !gear.purchase_date || !gear.condition) {
      setLoading(true);
      supabase
        .from('gears')
        .select('*')
        .eq('id', gear.id)
        .single()
        .then(({ data, error }: { data: Gear | null; error: any }) => {
          setLoading(false);
          if (error) {
            console.error("Error fetching gear details:", error);
            toast({
              title: "Error",
              description: "Could not load gear details for editing.",
              variant: "destructive",
            });
            // Use what we have
            setEditingGear(gear);
          } else {
            setEditingGear(data);
          }
          setIsEditModalOpen(true);
        });
    } else {
      setEditingGear(gear);
      setIsEditModalOpen(true);
    }
  };

  // Handle submit edits using a minimal approach
  const handleSubmitEdits = async (data: Gear) => {
    if (!editingGear) return;

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to update gear",
          variant: "destructive",
        });
        return;
      }

      console.log("Edit submitted with data:", data);

      // Handle image upload if there's a new file
      let imageUrl = editingGear.image_url;
      if (data.image_url) {
        try {
          // Handle both FileList and File types
          const imageFile = isFileList(data.image_url)
            ? data.image_url[0]
            : (isFile(data.image_url) ? data.image_url : null);

          if (imageFile) {
            // Upload image first
            const fileExt = imageFile.name.split('.').pop();
            const filePath = `gears/${editingGear.id}/${Date.now()}.${fileExt}`;

            console.log("Uploading gear image to", filePath);

            const { error: uploadError, data: uploadData } = await supabase.storage
              .from('gear_images')
              .upload(filePath, imageFile, { upsert: true });

            if (uploadError) {
              console.error("Error uploading gear image:", uploadError);
              toast({
                title: "Warning",
                description: "Image upload failed, but gear details will be updated.",
                variant: "destructive",
              });
            } else {
              // Get the public URL for the uploaded image
              const { data: urlData } = supabase.storage
                .from('gear_images')
                .getPublicUrl(uploadData.path);

              imageUrl = urlData?.publicUrl || null;
              console.log("New gear image URL:", imageUrl);
            }
          }
        } catch (uploadError) {
          console.error("Exception during image upload:", uploadError);
        }
      }

      // Create a minimal update object with only essential fields
      // to avoid any potential schema issues
      const normalizedQuantity = data.quantity || 1;
      const minimalUpdate = {
        name: data.name || "",
        category: data.category || "",
        status: data.status || "Available",
        description: data.description || null,
        serial_number: data.serial_number || null,
        condition: data.condition || null,
        quantity: normalizedQuantity,
        available_quantity: (data.status || "Available") === "Available" ? normalizedQuantity : undefined,
        image_url: imageUrl
      };

      console.log("Sending update:", JSON.stringify(minimalUpdate, null, 2));

      // Try the update
      const { error: updateError } = await supabase
        .from('gears')
        .update(minimalUpdate)
        .eq('id', editingGear.id);

      if (updateError) {
        console.error("Error in update:", updateError);
        console.error("Error details:", JSON.stringify(updateError, null, 2));
        throw updateError;
      }

      // Create notification for the admin
      await createGearNotification(user.id, editingGear.name, 'update');

      // Refresh gear list to ensure we see the latest data
      await fetchGears();

      toast({
        title: "Success",
        description: "Gear updated successfully",
      });

      setIsEditModalOpen(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error updating gear:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to update gear",
          variant: "destructive",
        });
      } else {
        console.error("Error updating gear:", error);
        toast({
          title: "Error",
          description: "Failed to update gear",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle gear details dialog open
  const handleOpenGearDetails = async (gear: Gear) => {
    setLoading(true);
    try {
      const { data, error } = await apiGet<{ data: Gear | null; error: string | null }>(
        `/api/gears/${gear.id}?t=${Date.now()}`
      );
      if (error) {
        toast({
          title: "Error",
          description: "Could not load gear details.",
          variant: "destructive",
        });
        setSelectedGear(gear);
      } else {
        setSelectedGear(data ?? gear);
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not load gear details.",
        variant: "destructive",
      });
      setSelectedGear(gear);
    } finally {
      setLoading(false);
      setIsGearDetailsOpen(true);
    }
  };
  return {
    toast,
    gears,
    loading,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    searchTerm,
    setSearchTerm,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    editingGear,
    isSubmitting,
    selectedGearIds,
    importDialogOpen,
    setImportDialogOpen,
    importFile,
    maintenanceModalOpen,
    setMaintenanceModalOpen,
    selectedGear,
    maintenanceRecords,
    loadingMaintenance,
    profile,
    isGearDetailsOpen,
    setIsGearDetailsOpen,
    showSqlDialog,
    setShowSqlDialog,
    sqlToRun,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    apiError,
    inventorySummary,
    summaryLoading,
    listContainerRef,
    maintenanceForm,
    hasActiveFilters,
    filterChips,
    containerVariants,
    handleAddGear,
    handleDeleteGear,
    handleClearAllFilters,
    handleSelectAll,
    handleSelectOne,
    handleExport,
    handleImportDialogOpen,
    handleImportDialogClose,
    handleImportFileChange,
    handleImport,
    handleBatchDelete,
    handleBatchUpdateStatus,
    handleOpenMaintenance,
    handleCloseMaintenance,
    handleAddMaintenance,
    handleOpenEditDialog,
    handleSubmitEdits,
    handleOpenGearDetails,
  };
}

export type ManageGearsPageState = ReturnType<typeof useManageGearsPage>;
