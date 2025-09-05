"use client";

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Filter, Edit, Trash2, Download, Upload, CheckSquare, Wrench, Camera, Video, Mic, Speaker, Monitor, Laptop, Box, LucideIcon, Lightbulb, CheckCircle, AlertTriangle, Aperture, AirVent, Cable, Puzzle, Car, RotateCcw, X, Mouse, Battery, HardDrive } from 'lucide-react';
import { getCategoryIcon } from '@/lib/utils/category';
// Import Dialog components if using for Add/Edit form
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// Placeholder Add Gear Form component - Consider extracting to a separate file
import AddGearForm from '@/components/admin/add-gear-form';
import EditGearForm from '@/components/admin/edit-gear-form';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { createGearNotification } from '@/lib/notifications';
import Papa from 'papaparse';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiGet } from '@/lib/apiClient';
import { Gear } from '@/types/supabase';
import { Pagination } from '@/components/ui/Pagination';
import { gearQueries } from '@/lib/api/queries';
import { useDebounce } from '@/hooks/useDebounce';
import { isFileList, isFile } from '@/lib/utils/browser-safe';

// Category color mapping (icons now centralized)
const categoryColors: Record<string, string> = {
  camera: 'bg-blue-100 text-blue-800',
  lens: 'bg-purple-100 text-purple-800',
  drone: 'bg-cyan-100 text-cyan-800',
  audio: 'bg-green-100 text-green-800',
  laptop: 'bg-indigo-100 text-indigo-800',
  monitor: 'bg-teal-100 text-teal-800',
  mouse: 'bg-violet-100 text-violet-800',
  batteries: 'bg-amber-100 text-amber-800',
  storage: 'bg-stone-100 text-stone-800',
  cables: 'bg-yellow-100 text-yellow-800',
  lighting: 'bg-orange-100 text-orange-800',
  tripod: 'bg-pink-100 text-pink-800',
  accessory: 'bg-gray-100 text-gray-800',
  cars: 'bg-red-100 text-red-800',
  gimbal: 'bg-fuchsia-100 text-fuchsia-800',
  microphone: 'bg-emerald-100 text-emerald-800',
  computer: 'bg-slate-100 text-slate-800',
  other: 'bg-gray-200 text-gray-700',
};

// Helper function to get an icon based on category - now using centralized utility

const getCategoryBadgeClass = (category?: string) => {
  const key = (category || '').toLowerCase();
  return categoryColors[key] || 'bg-gray-200 text-gray-700';
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function ManageGearsPage() {
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

  // Debug selectedGear state changes
  useEffect(() => {
    console.log("selectedGear state changed to:", selectedGear);
    if (selectedGear) {
      console.log("selectedGear.name:", selectedGear.name);
      console.log("selectedGear.id:", selectedGear.id);
    }
  }, [selectedGear]);

  useEffect(() => {
    // Check Supabase connection and authentication
    const checkSupabaseConnection = async () => {
      console.log("Checking Supabase connection...");

      try {
        // Test the connection with a simple query
        const { data, error } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);

        if (error) {
          console.error("Supabase connection test failed:", error);
        } else {
          console.log("Supabase connection test successful");
        }

        // Check authentication
        const { data: authData } = await supabase.auth.getSession();
        console.log("Authentication status:", authData?.session ? "authenticated" : "not authenticated");
      } catch (err) {
        console.error("Error testing Supabase connection:", err);
      }
    };

    checkSupabaseConnection();
    fetchGears(page, pageSize);
    // Set up real-time subscription
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
        console.log("Fetched gears data:", data);
        if (data && data.length > 0) {
          console.log("First gear sample:", data[0]);
          console.log("First gear name:", data[0].name);
        }
        setGears(data || []);
        setTotal(newTotal || 0);
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
          variant: "destructive",
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
        status: data.status,
        quantity: data.quantity || 1,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        image_url: imageUrl,
      };
      console.log("[AddGear] Inserting gear:", gearToInsert);

      const { error: insertError } = await supabase
        .from('gears')
        .insert([gearToInsert]);

      if (insertError) {
        if (insertError instanceof Error) {
          console.error("Error adding gear:", insertError);
          toast({
            title: "Error",
            description: insertError.message || "Failed to add gear",
            variant: "destructive",
          });
        } else {
          console.error("Error adding gear:", insertError);
          toast({
            title: "Error",
            description: "Failed to add gear",
            variant: "destructive",
          });
        }
        throw insertError;
      }

      // Create notification
      await createGearNotification(user.id, data.name || '', 'add');

      // Refresh gear list
      fetchGears();

      toast({
        title: "Success",
        description: "Gear added successfully",
      });
      setIsAddModalOpen(false);

      // After successful gear creation
      // Fetch admin profile
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
      // Send Google Chat notification for gear add
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ADMIN_ADD_GEAR',
          payload: {
            adminName: adminProfile?.full_name || 'Unknown Admin',
            adminEmail: adminProfile?.email || 'Unknown Email',
            gearName: data.name,
            category: data.category,
            action: 'add',
          }
        })
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error adding gear:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to add gear",
          variant: "destructive",
        });
      } else {
        console.error("Error adding gear:", error);
        toast({
          title: "Error",
          description: "Failed to add gear",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGear = async (gear: Gear, updates: Gear) => {
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
      console.log("[UpdateGear] Received image_url:", updates.image_url);
      // Handle image upload if there's a new file
      let imageUrl = gear.image_url;
      if (updates.image_url instanceof File) {
        const fileExt = updates.image_url.name.split('.')?.pop();
        const filePath = `gears/${gear.id}/${Date.now()}.${fileExt}`;
        // Upload to the gear_images bucket
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('gear_images')
          .upload(filePath, updates.image_url, { upsert: true });
        if (uploadError || !uploadData) {
          console.error("[UpdateGear] Error uploading gear image:", uploadError);
          toast({
            title: "Warning",
            description: "Gear updated but image upload failed.",
            variant: "destructive",
          });
        } else {
          // Retrieve the public URL from the correct bucket
          const { data: urlData } = supabase.storage
            .from('gear_images')
            .getPublicUrl(uploadData.path);
          if (!urlData?.publicUrl) {
            console.error("[UpdateGear] Error getting public URL for uploaded image.");
            toast({
              title: "Warning",
              description: "Gear updated but image URL could not be retrieved.",
              variant: "destructive",
            });
          } else {
            imageUrl = urlData.publicUrl;
            console.log("[UpdateGear] New gear image URL:", imageUrl);
          }
        }
      } else {
        if (updates.image_url !== undefined) {
          console.warn("[UpdateGear] image_url is not a File:", updates.image_url);
        }
      }
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        image_url: imageUrl,
        ...(updates.serial_number ? { serial_number: updates.serial_number } : {})
      };
      console.log("[UpdateGear] Updating gear:", updateData);

      const { error } = await supabase
        .from('gears')
        .update(updateData)
        .eq('id', gear.id);

      if (error) throw error;

      // Create notification
      await createGearNotification(user.id, gear.name, 'update');

      // Refresh gear list
      fetchGears();

      toast({
        title: "Success",
        description: "Gear updated successfully",
      });

      // After successful gear update
      // Fetch admin profile
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
      // Send Google Chat notification for gear edit
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ADMIN_EDIT_GEAR',
          payload: {
            adminName: adminProfile?.full_name || 'Unknown Admin',
            adminEmail: adminProfile?.email || 'Unknown Email',
            gearName: updates.name || gear.name,
            category: updates.category || gear.category,
            action: 'edit',
          }
        })
      });
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
          const { data, error } = await supabase.rpc('delete_gear_by_admin', {
            p_gear_id: gear.id
          });

          if (!error && data === true) {
            console.log("Admin deletion function succeeded!");
            deletionSucceeded = true;
          } else {
            console.log("Admin deletion function failed:", error);
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
          const { data, error } = await supabase.rpc('delete_gear_by_admin', {
            p_gear_id: gear.id
          });

          if (!error && data === true) {
            console.log("Admin deletion after permission fix succeeded!");
            deletionSucceeded = true;
          } else {
            console.log("Admin deletion after permission fix failed:", error);
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

  const filteredGears = gears.filter(gear => {
    const statusMatch = filterStatus === 'all' || gear.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || gear.category === filterCategory;
    const searchMatch = gear.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gear.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  // Helper for filter chips
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
      setSelectedGearIds(filteredGears.map(g => g.id));
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

  // Batch delete selected gears
  const handleBatchDelete = async () => {
    if (selectedGearIds.length === 0) return;

    setLoading(true);

    try {
      console.log("Batch deleting gears:", selectedGearIds);

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
        description: 'Selected gears deleted.'
      });

      setSelectedGearIds([]);
    } catch (error: unknown) {
      console.error("Batch delete error:", error);
      toast({
        title: 'Batch Delete Error',
        description: error.message || 'Failed to delete selected gears',
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
      console.log("Batch updating gears to status:", status, selectedGearIds);

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
        description: `Selected gears marked as ${status}.`
      });

      setSelectedGearIds([]);
    } catch (error: unknown) {
      console.error("Batch update error:", error);
      toast({
        title: 'Batch Update Error',
        description: error.message || 'Failed to update selected gears',
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

        // Refresh the gears data to get the updated status
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
      const minimalUpdate = {
        name: data.name || "",
        category: data.category || "",
        status: data.status || "Available",
        description: data.description || null,
        serial_number: data.serial_number || null,
        condition: data.condition || null,
        quantity: data.quantity || 1,
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
    console.log("Opening gear details for:", gear);
    console.log("Gear name:", gear.name);
    console.log("Gear description:", gear.description);
    console.log("Gear purchase_date:", gear.purchase_date);
    console.log("Gear condition:", gear.condition);

    // Always fetch the full gear details to ensure we have complete data
    setLoading(true);
    try {
      const response = await apiGet<{ data: Gear | null; error: string | null }>(`/api/gears/${gear.id}?t=${Date.now()}`);
      console.log("API response:", response);
      console.log("API response type:", typeof response);
      console.log("API response keys:", Object.keys(response));
      const { data, error } = response;
      console.log("Destructured data:", data);
      console.log("Destructured error:", error);
      if (error) {
        console.error("Error fetching gear details:", error);
        toast({
          title: "Error",
          description: "Could not load gear details.",
          variant: "destructive",
        });
        // Use what we have
        setSelectedGear(gear);
      } else {
        console.log("Fetched gear data:", data?.data);
        console.log("Setting selectedGear to:", data?.data);
        console.log("Data object:", data);
        console.log("Data.data type:", typeof data?.data);
        console.log("Data.data value:", data?.data);
        if (data && data.data && typeof data.data === 'object') {
          console.log("Gear data is valid, setting state");
          setSelectedGear(data.data);
        } else {
          console.log("Gear data is null/undefined/invalid, using original gear");
          console.log("Original gear:", gear);
          setSelectedGear(gear);
        }
        console.log("selectedGear state should now be:", data?.data || gear);
        console.log("Final selectedGear object:", data?.data || gear);
        console.log("Final selectedGear name:", (data?.data || gear)?.name);
        console.log("Final selectedGear name type:", typeof (data?.data || gear)?.name);
        console.log("Final selectedGear name length:", (data?.data || gear)?.name?.length);
        console.log("Final selectedGear name JSON:", JSON.stringify((data?.data || gear)?.name));
        console.log("Final selectedGear name === null:", (data?.data || gear)?.name === null);
        console.log("Final selectedGear name === undefined:", (data?.data || gear)?.name === undefined);
        console.log("Final selectedGear name === '':", (data?.data || gear)?.name === '');
      }
    } catch (err) {
      console.error("Exception when fetching gear details:", err);
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
          <Button variant="outline" onClick={handleImportDialogOpen} className="text-xs sm:text-sm bg-background hover:bg-accent">
            <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Import Gear CSV</DialogTitle>
                <DialogDescription>Upload a CSV file to import gear data. Existing records with matching IDs will be updated.</DialogDescription>
              </DialogHeader>
              <Input type="file" accept=".csv" onChange={handleImportFileChange} className="bg-background" />
              <DialogFooter>
                <Button variant="secondary" onClick={handleImportDialogClose}>Cancel</Button>
                <Button disabled={!importFile} onClick={handleImport}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {profile?.role === 'Admin' && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="text-xs sm:text-sm bg-primary hover:bg-primary/90">
                  <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add New Gear</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
                <DialogHeader>
                  <DialogTitle>Add New Gear</DialogTitle>
                  <DialogDescription>
                    Fill in the details for the new equipment.
                  </DialogDescription>
                </DialogHeader>
                {/* Pass the submit handler to the form */}
                <AddGearForm onSubmit={handleAddGear} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {/* Batch actions bar */}
      {selectedGearIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-2 bg-accent/30 px-6 py-3 rounded-lg border border-accent shadow-sm"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            {selectedGearIds.length} {selectedGearIds.length === 1 ? 'item' : 'items'} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="destructive" onClick={handleBatchDelete} className="shadow-sm">
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBatchUpdateStatus('Available')} className="bg-green-100 text-green-800 hover:bg-green-200 shadow-sm">
              <CheckCircle className="mr-1 h-3.5 w-3.5" /> Available
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBatchUpdateStatus('Damaged')} className="bg-orange-100 text-orange-800 hover:bg-orange-200 shadow-sm">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Damaged
            </Button>
          </div>
        </motion.div>
      )}
      <Card className="shadow-md border-muted">
        <CardHeader className="bg-card pb-0">
          <div className="flex flex-col md:flex-row justify-between md:items-center space-y-2 md:space-y-0">
            <div>
              <CardTitle className="text-xl">Gear List</CardTitle>
              <CardDescription>View, filter, and manage all equipment.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Total: {filteredGears.length} items</span>
              {loading && <span className="text-primary animate-pulse">● Refreshing</span>}
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Under Repair">Under Repair</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px] bg-background">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Camera"><span className="inline-flex items-center gap-1">{getCategoryIcon('Camera' as const, 14)} Camera</span></SelectItem>
                  <SelectItem value="Lens"><span className="inline-flex items-center gap-1">{getCategoryIcon('Lens' as const, 14)} Lens</span></SelectItem>
                  <SelectItem value="Drone"><span className="inline-flex items-center gap-1">{getCategoryIcon('Drone' as const, 14)} Drone</span></SelectItem>
                  <SelectItem value="Audio"><span className="inline-flex items-center gap-1">{getCategoryIcon('Audio' as const, 14)} Audio</span></SelectItem>
                  <SelectItem value="Laptop"><span className="inline-flex items-center gap-1">{getCategoryIcon('Laptop' as const, 14)} Laptop</span></SelectItem>
                  <SelectItem value="Monitor"><span className="inline-flex items-center gap-1">{getCategoryIcon('Monitor' as const, 14)} Monitor</span></SelectItem>
                  <SelectItem value="Mouse"><span className="inline-flex items-center gap-1">{getCategoryIcon('Mouse' as const, 14)} Mouse</span></SelectItem>
                  <SelectItem value="Batteries"><span className="inline-flex items-center gap-1">{getCategoryIcon('Batteries' as const, 14)} Batteries</span></SelectItem>
                  <SelectItem value="Storage"><span className="inline-flex items-center gap-1">{getCategoryIcon('Storage' as const, 14)} Storage</span></SelectItem>
                  <SelectItem value="Cables"><span className="inline-flex items-center gap-1">{getCategoryIcon('Cables' as const, 14)} Cables</span></SelectItem>
                  <SelectItem value="Lighting"><span className="inline-flex items-center gap-1">{getCategoryIcon('Lighting' as const, 14)} Lighting</span></SelectItem>
                  <SelectItem value="Tripod"><span className="inline-flex items-center gap-1">{getCategoryIcon('Tripod' as const, 14)} Tripod</span></SelectItem>
                  <SelectItem value="Cars"><span className="inline-flex items-center gap-1">{getCategoryIcon('Cars' as const, 14)} Cars</span></SelectItem>
                  {/* Add more categories as needed */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 md:px-6">
          {/* Filter chips and clear button */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {filterChips.map((chip, idx) => (
                <span key={idx} className="inline-flex items-center bg-muted px-3 py-1 rounded-full text-sm text-foreground border">
                  {chip.label}
                  <button
                    className="ml-2 text-muted-foreground hover:text-red-500 focus:outline-none"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label}`}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
              <button
                className="ml-2 px-3 py-1 rounded-full bg-orange-600 text-white text-sm hover:bg-orange-700 focus:outline-none"
                onClick={handleClearAllFilters}
                type="button"
              >
                Clear All Filters
              </button>
            </div>
          )}
          {apiError && (
            <div className="mb-4 text-center text-sm text-red-500 font-medium">
              {apiError}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                <p className="text-muted-foreground">Loading gear items...</p>
              </div>
            </div>
          ) : filteredGears.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex h-10 w-10 rounded-full bg-muted items-center justify-center mb-3">
                <Box className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">No gear items found matching your filters.</p>
              <Button
                variant="link"
                onClick={() => {
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setSearchTerm('');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <motion.div
              ref={listContainerRef}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto rounded-md border"
            >
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-muted-foreground/30"
                          checked={selectedGearIds.length === filteredGears.length && filteredGears.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="w-[50px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Quantity</TableHead>
                    <TableHead className="text-right w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGears.map((gear, index) => (
                    <TableRow
                      key={gear.id}
                      className="cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => handleOpenGearDetails(gear)}
                    >
                      <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-muted-foreground/30"
                            checked={selectedGearIds.includes(gear.id)}
                            onChange={(e) => handleSelectOne(gear.id, e.target.checked)}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="p-2">
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border shadow-sm">
                          {gear.image_url ? (
                            <img
                              src={gear.image_url}
                              alt={gear.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getCategoryIcon(gear.category, 20)
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{gear.name}</span>
                          <span className="text-xs text-muted-foreground md:hidden">{gear.category}</span>
                          <span className="text-xs md:hidden mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${gear.status === "Available"
                              ? "bg-green-100 text-green-800"
                              : gear.status === "Damaged"
                                ? "bg-red-100 text-red-800"
                                : gear.status === "Under Repair"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : gear.status === "Checked Out" || gear.status === "Partially Checked Out"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}>
                              {gear.status}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="inline-flex items-center gap-2">
                          {getCategoryIcon(gear.category, 16)}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${getCategoryBadgeClass(gear.category)}`}>
                            {getCategoryIcon(gear.category, 14)}
                            {gear.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${gear.status === "Available"
                            ? "bg-green-100 text-green-800"
                            : gear.status === "Damaged"
                              ? "bg-red-100 text-red-800"
                              : gear.status === "Under Repair"
                                ? "bg-yellow-100 text-yellow-800"
                                : gear.status === "Checked Out" || gear.status === "Partially Checked Out"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {gear.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">
                        {typeof gear.available_quantity === 'number' && typeof gear.quantity === 'number'
                          ? `${gear.available_quantity} / ${gear.quantity}`
                          : typeof gear.quantity === 'number'
                            ? gear.quantity
                            : '—'}
                      </TableCell>
                      <TableCell className="text-right p-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditDialog(gear);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGear(gear);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-yellow-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMaintenance(gear);
                            }}
                          >
                            <Wrench className="h-3.5 w-3.5 text-yellow-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <select
                    className="border rounded px-2 py-1 bg-background text-foreground"
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                  >
                    {PAGE_SIZE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-center mt-6">
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(total / pageSize)}
                  onPageChange={setPage}
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Gear Details Dialog */}
      <Dialog open={isGearDetailsOpen} onOpenChange={setIsGearDetailsOpen}>
        <DialogContent key={selectedGear?.id || 'no-gear'} className="sm:max-w-[625px] w-[95vw] max-w-full">
          <DialogHeader>
            <DialogTitle>Gear Details - {selectedGear?.name || 'Loading...'}</DialogTitle>
            <DialogDescription>
              View complete information for {selectedGear?.name || 'Loading...'}.
            </DialogDescription>
          </DialogHeader>
          {selectedGear && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-md bg-muted flex items-center justify-center overflow-hidden border shadow-sm">
                  {selectedGear.image_url ? (
                    <img
                      src={selectedGear.image_url}
                      alt={selectedGear.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getCategoryIcon(selectedGear.category, 36)
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedGear.name || 'No Name'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getCategoryIcon(selectedGear.category, 16)}
                    <p className="text-sm text-muted-foreground">{selectedGear.category || 'No Category'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/20 p-4 rounded-lg border">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium ${selectedGear.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100' :
                    selectedGear.status === 'Booked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-100' :
                      selectedGear.status === 'Damaged' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-100' :
                        selectedGear.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-100' :
                          selectedGear.status === 'New' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-100' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                    {selectedGear.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Serial Number</h4>
                  <p className="mt-1 font-mono text-sm">{selectedGear.serial_number || 'N/A'}</p>
                </div>

                {selectedGear.description && (
                  <div className="col-span-1 sm:col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <p className="mt-1 text-sm">{selectedGear.description}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Added On</h4>
                  <p className="mt-1 text-sm">{selectedGear.created_at ? new Date(selectedGear.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Last Updated</h4>
                  <p className="mt-1 text-sm">{selectedGear.updated_at ? new Date(selectedGear.updated_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => handleOpenMaintenance(selectedGear)}>
                  <Wrench className="mr-2 h-4 w-4 text-yellow-600" />
                  Maintenance
                </Button>
                <Button onClick={() => {
                  handleOpenEditDialog(selectedGear);
                  setIsGearDetailsOpen(false);
                }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Gear
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Edit Gear Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
          <DialogHeader>
            <DialogTitle>Edit Gear</DialogTitle>
            <DialogDescription>
              Update the details for {editingGear?.name}.
            </DialogDescription>
          </DialogHeader>
          {editingGear && (
            <EditGearForm
              gear={editingGear}
              onSubmit={handleSubmitEdits}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Maintenance Modal */}
      <Dialog open={maintenanceModalOpen} onOpenChange={setMaintenanceModalOpen}>
        <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-yellow-600" />
              Maintenance for {selectedGear?.name}
            </DialogTitle>
            <DialogDescription>View and log maintenance events for this gear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Maintenance History</h4>
              <span className="text-xs text-muted-foreground">{maintenanceRecords.length} records</span>
            </div>

            {loadingMaintenance ? (
              <div className="flex justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
                  <p className="text-xs text-muted-foreground">Loading records...</p>
                </div>
              </div>
            ) : maintenanceRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border">
                <Wrench className="h-8 w-8 mb-2 text-muted-foreground/50" />
                <p className="text-sm">No maintenance records found.</p>
                <p className="text-xs mt-1">Add your first maintenance record below.</p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto pr-1 space-y-2 rounded-lg border p-3 bg-muted/10">
                {maintenanceRecords.map((rec) => (
                  <div key={rec.id} className="border rounded-md p-3 bg-card shadow-sm">
                    <div className="flex justify-between items-center flex-wrap gap-1">
                      <span className={`font-medium text-sm px-2 py-0.5 rounded-full ${rec.status === 'Completed' || rec.status === 'Maintenance Completed' ? 'bg-green-100 text-green-800' :
                        rec.status === 'Scheduled' || rec.status === 'Scheduled Maintenance' ? 'bg-blue-100 text-blue-800' :
                          rec.status === 'In Progress' || rec.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800' :
                            rec.status === 'Needs Repair' ? 'bg-orange-100 text-orange-800' :
                              rec.status === 'Damaged' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {rec.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(rec.date).toLocaleString()}</span>
                    </div>
                    <div className="text-sm mt-2">{rec.description}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-sm mb-3">Add New Maintenance Record</h4>
              <form
                className="space-y-4"
                onSubmit={maintenanceForm.handleSubmit(handleAddMaintenance)}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                    <select
                      className={`w-full border rounded-md px-3 py-2 mt-1 bg-background text-sm ${maintenanceForm.formState.errors.status ? 'border-red-500' : ''
                        }`}
                      {...maintenanceForm.register('status', {
                        required: "Status is required"
                      })}
                    >
                      <option value="">Select status...</option>
                      <option value="Scheduled">Scheduled Maintenance</option>
                      <option value="In Progress">Under Repair</option>
                      <option value="Completed">Maintenance Completed</option>
                      <option value="Needs Repair">Needs Repair</option>
                      <option value="Damaged">Mark as Damaged</option>
                    </select>
                    {maintenanceForm.formState.errors.status && (
                      <p className="text-red-500 text-xs mt-1">
                        {maintenanceForm.formState.errors.status.message}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                    <Input
                      type="datetime-local"
                      className={`w-full mt-1 bg-background text-sm ${maintenanceForm.formState.errors.date ? 'border-red-500' : ''
                        }`}
                      {...maintenanceForm.register('date', {
                        required: "Date is required"
                      })}
                    />
                    {maintenanceForm.formState.errors.date && (
                      <p className="text-red-500 text-xs mt-1">
                        {maintenanceForm.formState.errors.date.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                  <Textarea
                    className={`w-full mt-1 bg-background text-sm ${maintenanceForm.formState.errors.description ? 'border-red-500' : ''
                      }`}
                    rows={3}
                    {...maintenanceForm.register('description', {
                      required: "Description is required",
                      minLength: { value: 5, message: "Description must be at least 5 characters" }
                    })}
                    placeholder="Describe the maintenance performed..."
                  />
                  {maintenanceForm.formState.errors.description && (
                    <p className="text-red-500 text-xs mt-1">
                      {maintenanceForm.formState.errors.description.message}
                    </p>
                  )}
                </div>
                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseMaintenance}
                    className="mt-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loadingMaintenance || maintenanceForm.formState.isSubmitting}
                    className="mt-2"
                  >
                    {loadingMaintenance ? 'Saving...' : 'Log Maintenance'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SQL Dialog for manually running SQL commands */}
      <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Database Setup Required</DialogTitle>
            <DialogDescription>
              To enable gear deletion, a database administrator needs to run the following SQL commands in the Supabase SQL Editor:
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 bg-muted p-4 rounded-md">
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs font-mono">
              {sqlToRun}
            </pre>
          </div>

          <DialogFooter className="flex items-center justify-between mt-6">
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
    </motion.div>
  );
}
