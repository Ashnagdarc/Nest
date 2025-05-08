"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Filter, Edit, Trash2, Download, Upload, CheckSquare, Square, Wrench, Camera, Video, Mic, Speaker, Smartphone, MonitorSmartphone, Monitor, Laptop, Box, LucideIcon, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';
// Import Dialog components if using for Add/Edit form
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// Placeholder Add Gear Form component - Consider extracting to a separate file
import AddGearForm from '@/components/admin/add-gear-form';
import EditGearForm from '@/components/admin/edit-gear-form';
import { createClient, refreshSupabaseClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { createGearNotification } from '@/lib/notifications';
import { QRCodeCanvas } from 'qrcode.react';
import Papa from 'papaparse';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Gear = any;

// Helper function to get an icon based on category
const getCategoryIcon = (category?: string, size = 24) => {
  let Icon: LucideIcon = Box;

  switch (category?.toLowerCase()) {
    case 'camera':
      Icon = Camera;
      break;
    case 'lens':
      Icon = Camera;
      break;
    case 'tripod':
      Icon = Video;
      break;
    case 'gimbal':
      Icon = Video;
      break;
    case 'audio':
      Icon = Speaker;
      break;
    case 'microphone':
      Icon = Mic;
      break;
    case 'lighting':
      Icon = Lightbulb;
      break;
    case 'laptop':
      Icon = Laptop;
      break;
    case 'monitor':
      Icon = Monitor;
      break;
    case 'computer':
      Icon = Monitor;
      break;
    default:
      Icon = Box;
  }

  return <Icon size={size} className="text-muted-foreground" />;
};

export default function ManageGearsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [gears, setGears] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGear, setEditingGear] = useState<Gear | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGear, setNewGear] = useState<Partial<Gear>>({
    name: '',
    description: '',
    category: '',
    status: 'Available',
    serial: '',
  });
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
    fetchGears();
    // Set up real-time subscription
    const channel = supabase
      .channel('public:gears')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, () => {
        fetchGears();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  async function fetchGears() {
    setLoading(true);
    try {
      // Use the absolute minimum fields to avoid schema issues
      const { data, error } = await supabase
        .from('gears')
        .select('id, name, category, status, image_url')
        .neq('status', 'Deleted'); // Filter out soft-deleted items

      if (error) {
        console.error("Error fetching gears:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));

        // Create a fresh client and try again
        console.log("Retrying with fresh client...");
        const freshClient = refreshSupabaseClient();

        const { data: retryData, error: retryError } = await freshClient
          .from('gears')
          .select('id, name, category, status, image_url')
          .neq('status', 'Deleted'); // Filter out soft-deleted items

        if (retryError) {
          console.error("Retry also failed:", retryError);
          throw retryError;
        }

        console.log("Retry successful, fetched", retryData?.length || 0, "gears");
        setGears(retryData || []);
      } else {
        console.log("Successfully fetched", data?.length || 0, "gears");
        setGears(data || []);
      }
    } catch (err) {
      console.error("Full error object:", err);
      const errorMessage =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as any).message
          : "Unknown database error";

      toast({
        title: "Error",
        description: `Failed to load gears: ${errorMessage}`,
        variant: "destructive",
      });

      // Set empty gears array to prevent UI errors
      setGears([]);
    } finally {
      setLoading(false);
    }
  }

  const handleAddGear = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add gear",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate a unique ID for the new gear
      const gearId = crypto.randomUUID();

      // Handle image upload if there is one
      let imageUrl = null;
      if (data.image && data.image instanceof File) {
        const fileExt = data.image.name.split('.').pop();
        const filePath = `gears/${gearId}/${Date.now()}.${fileExt}`;

        console.log("Uploading gear image to", filePath);

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('gears') // Make sure this bucket exists in your Supabase
          .upload(filePath, data.image, { upsert: true });

        if (uploadError) {
          console.error("Error uploading gear image:", uploadError);
          toast({
            title: "Warning",
            description: "Gear added but image upload failed. Try updating the gear later.",
            variant: "destructive",
          });
        } else {
          // Get the public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from('gears')
            .getPublicUrl(uploadData.path);

          imageUrl = urlData?.publicUrl || null;
          console.log("Gear image URL:", imageUrl);
        }
      }

      // Map form fields to DB columns
      const gearToInsert = {
        id: gearId,
        name: data.name,
        category: data.category,
        description: data.description,
        serial_number: data.serial_number, // Use serial_number field
        status: data.status,
        owner_id: user.id,
        created_at: new Date().toISOString(),
        image_url: imageUrl,
      };

      console.log("Adding gear:", gearToInsert);

      const { error } = await supabase
        .from('gears')
        .insert([gearToInsert]);

      if (error) {
        console.error("Error adding gear:", error);
        throw error;
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
    } catch (error: any) {
      console.error("Error adding gear:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add gear",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGear = async (gear: Gear, updates: Partial<Gear>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update gear",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    console.log("Updating gear:", gear.id, "with data:", updates);

    try {
      // Handle image upload if there's a new file
      let imageUrl = gear.image_url; // Start with current URL
      if (updates.image && updates.image instanceof File) {
        // Remove old image if it exists
        if (gear.image_url) {
          try {
            const urlParts = new URL(gear.image_url);
            const pathSegments = urlParts.pathname.split('/');
            const bucketIndex = pathSegments.findIndex(segment => segment === 'gears');
            if (bucketIndex !== -1) {
              const oldStoragePath = pathSegments.slice(bucketIndex + 1).join('/');
              console.log("Attempting to remove old gear image:", oldStoragePath);
              const { error: removeError } = await supabase.storage
                .from('gears')
                .remove([oldStoragePath]);
              if (removeError) {
                console.error("Error removing old image:", removeError);
                // Continue with upload even if removal fails
              }
            }
          } catch (e) {
            console.error("Error parsing old image URL:", e);
          }
        }

        // Upload new image
        const fileExt = updates.image.name.split('.').pop();
        const filePath = `gears/${gear.id}/${Date.now()}.${fileExt}`;

        console.log("Uploading new gear image to", filePath);

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('gears')
          .upload(filePath, updates.image, { upsert: true });

        if (uploadError) {
          console.error("Error uploading gear image:", uploadError);
          toast({
            title: "Warning",
            description: "Gear updated but image upload failed.",
            variant: "destructive",
          });
        } else {
          // Get the public URL for the uploaded image
          const { data: urlData } = supabase.storage
            .from('gears')
            .getPublicUrl(uploadData.path);

          imageUrl = urlData?.publicUrl || null;
          console.log("New gear image URL:", imageUrl);
        }
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        image_url: imageUrl,
        ...(updates.serial_number ? { serial_number: updates.serial_number } : {})
      };

      // Remove the image File object from the update data
      // as we've already processed it and stored the URL
      if ('image' in updateData) {
        delete updateData.image;
      }

      // Remove any serial field if it was accidentally included
      if ('serial' in updateData) {
        delete updateData.serial;
      }

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
    } catch (error: any) {
      console.error("Error updating gear:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update gear",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      console.error("Error fixing database permissions:", error);
      toast({
        title: "Error",
        description: "Failed to update database permissions",
        variant: "destructive",
      });
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

    } catch (error: any) {
      console.error("Error deleting gear:", error);

      toast({
        title: "Error",
        description: error.message || "Failed to delete gear",
        variant: "destructive",
      });

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
      (gear.serial || '').toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      console.log("Attempting to fetch maintenance records for gear:", gearId);

      // First check if the table exists
      try {
        // Try a direct query to gear_maintenance
        const { data, error } = await supabase
          .from('gear_maintenance')
          .select('*')
          .eq('gear_id', gearId)
          .order('date', { ascending: false });

        if (!error) {
          console.log(`Fetched ${data?.length || 0} maintenance records`);
          setMaintenanceRecords(data || []);
          return;
        }

        // If error, the table might not exist
        console.log("Could not query maintenance records:", error.message);
      } catch (e) {
        console.log("Exception querying maintenance records:", e);
      }

      // Check if the gear_maintenance table exists
      const { error: checkError } = await supabase
        .rpc('check_table_exists', { table_name: 'gear_maintenance' });

      if (checkError) {
        console.log("Could not check if maintenance table exists:", checkError.message);
        return; // Don't show an error to the user, just leave records empty
      }

      // Table exists but we had an error earlier, try one more time
      const { data: retryData, error: retryError } = await supabase
        .from('gear_maintenance')
        .select('*')
        .eq('gear_id', gearId)
        .order('date', { ascending: false });

      if (retryError) {
        console.log("Retry failed when fetching maintenance records:", retryError.message);
      } else {
        console.log(`Fetched ${retryData?.length || 0} maintenance records on retry`);
        setMaintenanceRecords(retryData || []);
      }
    } catch (err: any) {
      // For any uncaught errors, just log them without showing a toast
      console.log("Exception in maintenance records fetch:", err.message || "Unknown error");
    } finally {
      setLoadingMaintenance(false);
    }
  };

  // Open maintenance modal for a gear
  const handleOpenMaintenance = (gear: Gear) => {
    setSelectedGear(gear);
    setMaintenanceModalOpen(true);

    // Create the function needed to check table existence
    try {
      supabase.rpc('check_table_exists', { table_name: 'test' })
        .then(({ error }: { error: any }) => {
          // If the function doesn't exist, create it
          if (error && error.message.includes('does not exist')) {
            console.log("Creating check_table_exists function");
            supabase.rpc('create_table_check_function')
              .catch(() => {
                // Create the function manually if the RPC call fails
                supabase.sql`
                  CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
                  RETURNS boolean
                  LANGUAGE plpgsql
                  AS $$
                  BEGIN
                    RETURN EXISTS (
                      SELECT FROM information_schema.tables 
                      WHERE table_schema = 'public'
                      AND table_name = $1
                    );
                  END;
                  $$;
                `.catch((e: any) => console.log("Couldn't create helper function:", e.message));
              });
          }
          // After ensuring the function exists or handling its absence, fetch records
          fetchMaintenanceRecords(gear.id);
        });
    } catch (e: any) {
      // If we can't create the helper function, just try fetching records directly
      fetchMaintenanceRecords(gear.id);
    }
  };
  const handleCloseMaintenance = () => {
    setMaintenanceModalOpen(false);
    setSelectedGear(null);
    setMaintenanceRecords([]);
  };

  // Maintenance form logic
  const handleAddMaintenance = async (values: any) => {
    if (!selectedGear) return;
    setLoadingMaintenance(true);

    try {
      console.log("Adding maintenance record:", JSON.stringify(values, null, 2));

      // Get current user for attribution
      const { data: { user } } = await supabase.auth.getUser();

      // Create maintenance object
      const maintenanceData = {
        gear_id: selectedGear.id,
        status: values.status,
        description: values.description,
        date: values.date,
        performed_by: user?.id || null
      };

      console.log("Maintenance data being sent:", JSON.stringify(maintenanceData, null, 2));

      // Map maintenance status to gear status
      let gearStatus;
      switch (values.status) {
        case 'In Progress':
          gearStatus = 'Under Repair';
          break;
        case 'Scheduled':
          gearStatus = 'Scheduled Maintenance';
          break;
        case 'Needs Repair':
          gearStatus = 'Under Repair';
          break;
        case 'Damaged':
          gearStatus = 'Damaged';
          break;
        case 'Completed':
          gearStatus = 'Available'; // Only if completed maintenance should reset status
          break;
        default:
          gearStatus = selectedGear.status; // Don't change if not matched
      }

      // First update the gear status in the gears table
      if (gearStatus !== selectedGear.status) {
        const { error: updateError } = await supabase
          .from('gears')
          .update({ status: gearStatus, updated_at: new Date().toISOString() })
          .eq('id', selectedGear.id);

        if (updateError) {
          console.log("Error updating gear status:", updateError.message);
          // Continue with maintenance record even if status update fails
        } else {
          console.log(`Updated gear status to: ${gearStatus}`);
          // Update local state to show the status change immediately
          setSelectedGear({ ...selectedGear, status: gearStatus });

          // Also update in the main gears list
          setGears(prev => prev.map(g =>
            g.id === selectedGear.id ? { ...g, status: gearStatus } : g
          ));

          // Show a status update toast
          toast({
            title: 'Status Updated',
            description: `${selectedGear.name} is now ${gearStatus}`,
            variant: 'default'
          });
        }
      }

      // Now add the maintenance record
      const { error } = await supabase
        .from('gear_maintenance')
        .insert(maintenanceData)
        .select();

      if (error) {
        console.log("Error adding maintenance:", error.message);
        console.log("Full error:", JSON.stringify(error, null, 2));

        // Check if the error is because the table doesn't exist
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          // Show SQL instructions for table creation
          const setupSql = `
-- Run this SQL in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS public.gear_maintenance (
  id SERIAL PRIMARY KEY,
  gear_id UUID NOT NULL REFERENCES public.gears(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add permissions
ALTER TABLE public.gear_maintenance ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can do anything" ON public.gear_maintenance
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));

-- Create function to check if table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  );
END;
$$;
        `;

          // Show a modal with setup instructions
          toast({
            title: 'Database Setup Required',
            description: "Maintenance records table needs to be created by a database administrator.",
            variant: 'destructive',
          });

          // Show a dialog with the exact SQL needed
          setTimeout(() => {
            const setupModal = document.createElement('div');
            setupModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;justify-content:center;align-items:center;';

            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background:#fff;border-radius:8px;max-width:800px;width:90%;max-height:90vh;overflow-y:auto;padding:20px;color:#000;';

            modalContent.innerHTML = `
              <h2 style="margin-top:0;font-size:1.5rem;border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:15px;">SQL Setup Required</h2>
              <p>To enable maintenance tracking, ask your database administrator to run this SQL in the Supabase SQL Editor:</p>
              <pre style="background:#f1f1f1;padding:15px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;margin:10px 0;font-family:monospace;">${setupSql}</pre>
              <div style="text-align:right;margin-top:20px;">
                <button id="copy-sql-btn" style="margin-right:10px;padding:8px 16px;background:#4f46e5;color:white;border:none;border-radius:4px;cursor:pointer;">Copy SQL</button>
                <button id="close-modal-btn" style="padding:8px 16px;background:#e5e7eb;color:#111;border:none;border-radius:4px;cursor:pointer;">Close</button>
              </div>
            `;

            setupModal.appendChild(modalContent);
            document.body.appendChild(setupModal);

            // Copy button functionality
            document.getElementById('copy-sql-btn')?.addEventListener('click', () => {
              navigator.clipboard.writeText(setupSql);
              const copyBtn = document.getElementById('copy-sql-btn');
              if (copyBtn) {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                  copyBtn.textContent = 'Copy SQL';
                }, 2000);
              }
            });

            // Close button functionality
            document.getElementById('close-modal-btn')?.addEventListener('click', () => {
              document.body.removeChild(setupModal);
            });
          }, 100);

          return; // Exit early since we can't add the maintenance record
        }
      } else {
        toast({
          title: 'Maintenance Logged',
          description: 'Maintenance event added successfully.',
          variant: 'default'
        });

        // Try to add the maintenance record to the local state to avoid refresh
        setMaintenanceRecords(prev => [
          {
            id: Date.now(), // Temporary ID
            gear_id: selectedGear.id,
            status: values.status,
            description: values.description,
            date: values.date,
            performed_by: user?.id || null,
            created_at: new Date().toISOString()
          },
          ...prev
        ]);

        // Reset form with current timestamp
        maintenanceForm.reset({
          status: 'Maintenance Completed',
          description: '',
          date: new Date().toISOString().slice(0, 16)
        });

        // Force fetch maintenance records again
        await fetchMaintenanceRecords(selectedGear.id);

        // Refresh the gears data to get the updated status
        fetchGears();
      }
    } catch (err: any) {
      console.log("Exception adding maintenance:", err.message || "Unknown error");
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
  const handleSubmitEdits = async (data: any) => {
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
      if (data.image) {
        try {
          // Handle both FileList and File types
          const imageFile = data.image instanceof FileList
            ? data.image[0]
            : (data.image instanceof File ? data.image : null);

          if (imageFile) {
            // Upload image first
            const fileExt = imageFile.name.split('.').pop();
            const filePath = `gears/${editingGear.id}/${Date.now()}.${fileExt}`;

            console.log("Uploading gear image to", filePath);

            const { error: uploadError, data: uploadData } = await supabase.storage
              .from('gears')
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
                .from('gears')
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
    } catch (error: any) {
      console.error("Error updating gear:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update gear",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle gear details dialog open
  const handleOpenGearDetails = (gear: Gear) => {
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
              description: "Could not load gear details.",
              variant: "destructive",
            });
            // Use what we have
            setSelectedGear(gear);
          } else {
            setSelectedGear(data);
          }
          setIsGearDetailsOpen(true);
        });
    } else {
      setSelectedGear(gear);
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
                placeholder="Search by name or serial..."
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
                  <SelectItem value="Camera">Camera</SelectItem>
                  <SelectItem value="Tripod">Tripod</SelectItem>
                  <SelectItem value="Drone">Drone</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                  <SelectItem value="Lighting">Lighting</SelectItem>
                  {/* Add more categories as needed */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 md:px-6">
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
                                  : gear.status === "Checked Out"
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
                          <span>{gear.category}</span>
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
                                : gear.status === "Checked Out"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {gear.status}
                        </span>
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
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Gear Details Dialog */}
      <Dialog open={isGearDetailsOpen} onOpenChange={setIsGearDetailsOpen}>
        <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
          <DialogHeader>
            <DialogTitle>Gear Details</DialogTitle>
            <DialogDescription>
              View complete information for {selectedGear?.name}.
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
                  <h3 className="text-xl font-semibold">{selectedGear.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getCategoryIcon(selectedGear.category, 16)}
                    <p className="text-sm text-muted-foreground">{selectedGear.category}</p>
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
                  <p className="mt-1 font-mono text-sm">{selectedGear.serial || 'N/A'}</p>
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
