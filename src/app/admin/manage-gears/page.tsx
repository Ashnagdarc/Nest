"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Filter, Edit, Trash2, Download, Upload, CheckSquare, Square, Wrench } from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { createGearNotification } from '@/lib/notifications';
import { QRCodeCanvas } from 'qrcode.react';
import Papa from 'papaparse';
import { useForm } from 'react-hook-form';

type Gear = any;

export default function ManageGearsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [gears, setGears] = useState<Gear[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  // Maintenance form state and logic
  const maintenanceForm = useForm({
    defaultValues: {
      status: 'Completed',
      description: '',
      date: new Date().toISOString().slice(0, 16), // yyyy-MM-ddTHH:mm
    },
  });

  useEffect(() => {
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
    const { data, error } = await supabase.from('gears').select('*');
    if (!error) setGears(data || []);
    setLoading(false);
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
    // Map form fields to DB columns
    const gearToInsert = {
      name: data.name,
      category: data.category,
      description: data.description,
      serial_number: data.serial_number,
      purchase_date: data.purchase_date,
      initial_condition: data.initial_condition,
      status: data.status,
      owner_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('gears')
      .insert([gearToInsert]);
    if (error) {
      toast({
        title: "Error",
        description: error.message || JSON.stringify(error) || "Failed to add gear",
        variant: "destructive",
      });
      return;
    }
    await createGearNotification(user.id, data.name || '', 'add');
    toast({
      title: "Success",
      description: "Gear added successfully",
    });
    setIsAddModalOpen(false);
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

    const { error } = await supabase
      .from('gears')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gear.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update gear",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the admin
    await createGearNotification(user.id, gear.name, 'update');

    toast({
      title: "Success",
      description: "Gear updated successfully",
    });
  };

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

    const { error } = await supabase
      .from('gears')
      .delete()
      .eq('id', gear.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete gear",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the admin
    await createGearNotification(user.id, gear.name, 'delete');

    toast({
      title: "Success",
      description: "Gear deleted successfully",
    });
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
    const { error } = await supabase.from('gears').delete().in('id', selectedGearIds);
    setLoading(false);
    if (error) {
      toast({ title: 'Batch Delete Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Batch Delete Success', description: 'Selected gears deleted.' });
      setSelectedGearIds([]);
      fetchGears();
    }
  };

  // Batch update status
  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedGearIds.length === 0) return;
    setLoading(true);
    const { error } = await supabase.from('gears').update({ status, updated_at: new Date().toISOString() }).in('id', selectedGearIds);
    setLoading(false);
    if (error) {
      toast({ title: 'Batch Update Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Batch Update Success`, description: `Selected gears marked as ${status}.` });
      setSelectedGearIds([]);
      fetchGears();
    }
  };

  // Fetch maintenance records for a gear
  const fetchMaintenanceRecords = async (gearId: string) => {
    setLoadingMaintenance(true);
    const { data, error } = await supabase
      .from('gear_maintenance')
      .select('*')
      .eq('gear_id', gearId)
      .order('date', { ascending: false });
    setLoadingMaintenance(false);
    if (!error) setMaintenanceRecords(data || []);
    else setMaintenanceRecords([]);
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
  const handleAddMaintenance = async (values: any) => {
    if (!selectedGear) return;
    setLoadingMaintenance(true);
    const { error } = await supabase.from('gear_maintenance').insert({
      gear_id: selectedGear.id,
      status: values.status,
      description: values.description,
      date: values.date,
      // performed_by: ... (optional, if you want to add user info)
    });
    setLoadingMaintenance(false);
    if (error) {
      toast({ title: 'Add Maintenance Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Maintenance Logged', description: 'Maintenance event added.' });
      maintenanceForm.reset({ status: 'Completed', description: '', date: new Date().toISOString().slice(0, 16) });
      fetchMaintenanceRecords(selectedGear.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Manage Gears</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" onClick={handleImportDialogOpen}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Gear CSV</DialogTitle>
                <DialogDescription>Upload a CSV file to import gear data. Existing records with matching IDs will be updated.</DialogDescription>
              </DialogHeader>
              <Input type="file" accept=".csv" onChange={handleImportFileChange} />
              <DialogFooter>
                <Button variant="secondary" onClick={handleImportDialogClose}>Cancel</Button>
                <Button disabled={!importFile} onClick={handleImport}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {profile?.role === 'Admin' && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Gear
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
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
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-md">
          <span>{selectedGearIds.length} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBatchDelete}>Delete Selected</Button>
          <Button size="sm" onClick={() => handleBatchUpdateStatus('Available')}>Mark as Available</Button>
          <Button size="sm" onClick={() => handleBatchUpdateStatus('Damaged')}>Mark as Damaged</Button>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Gear List</CardTitle>
          <CardDescription>View, filter, and manage all equipment.</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name or serial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
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
                <SelectTrigger className="w-[180px]">
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
        <CardContent>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="overflow-x-auto"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={selectedGearIds.length === filteredGears.length && filteredGears.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredGears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No gears found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGears.map((gear) => (
                    <motion.tr key={gear.id} variants={itemVariants}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedGearIds.includes(gear.id)}
                          onChange={e => handleSelectOne(gear.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{gear.name}</TableCell>
                      <TableCell>{gear.category}</TableCell>
                      <TableCell>{gear.serial}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${gear.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                          gear.status === 'Booked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                            gear.status === 'Damaged' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' :
                              gear.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                                gear.status === 'New' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' :
                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                          {gear.status}
                        </span>
                      </TableCell>
                      <TableCell>{gear.condition}</TableCell>
                      <TableCell>
                        <QRCodeCanvas value={gear.id} size={48} />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleUpdateGear(gear, { status: 'Available' })}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Mark Available</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleUpdateGear(gear, { status: 'Damaged' })}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Mark Damaged</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteGear(gear)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenMaintenance(gear)}>
                          <Wrench className="h-4 w-4" />
                          <span className="sr-only">Maintenance</span>
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>
        </CardContent>
      </Card>
      {/* Maintenance Modal */}
      <Dialog open={maintenanceModalOpen} onOpenChange={setMaintenanceModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance for {selectedGear?.name}</DialogTitle>
            <DialogDescription>View and log maintenance events for this gear.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <h4 className="font-semibold">Maintenance History</h4>
            {loadingMaintenance ? (
              <div>Loading...</div>
            ) : maintenanceRecords.length === 0 ? (
              <div className="text-muted-foreground">No maintenance records found.</div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {maintenanceRecords.map((rec) => (
                  <li key={rec.id} className="border rounded p-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{rec.status}</span>
                      <span className="text-xs text-muted-foreground">{new Date(rec.date).toLocaleString()}</span>
                    </div>
                    <div className="text-sm mt-1">{rec.description}</div>
                  </li>
                ))}
              </ul>
            )}
            {/* Maintenance form will go here */}
            <form
              className="space-y-2 border-t pt-4 mt-4"
              onSubmit={maintenanceForm.handleSubmit(handleAddMaintenance)}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label>Status</Label>
                  <select
                    className="w-full border rounded px-2 py-1 mt-1"
                    {...maintenanceForm.register('status', { required: true })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Label>Date</Label>
                  <Input
                    type="datetime-local"
                    className="w-full mt-1"
                    {...maintenanceForm.register('date', { required: true })}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  className="w-full mt-1"
                  rows={3}
                  {...maintenanceForm.register('description', { required: true })}
                  placeholder="Describe the maintenance performed..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loadingMaintenance}>Log Maintenance</Button>
              </DialogFooter>
            </form>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseMaintenance}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
