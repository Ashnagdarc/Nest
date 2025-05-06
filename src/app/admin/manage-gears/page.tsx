"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Filter, Edit, Trash2 } from 'lucide-react';
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
import type { Database } from '@/types/supabase';

type Gear = Database['public']['Tables']['gears']['Row'];

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

  async function fetchGears() {
    setLoading(true);
    const { data, error } = await supabase.from('gears').select('*');
    if (!error) setGears(data || []);
    setLoading(false);
  }

  const handleAddGear = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add gear",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('gears')
      .insert([{
        ...newGear,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add gear",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the admin
    await createGearNotification(user.id, newGear.name || '', 'add');

    toast({
      title: "Success",
      description: "Gear added successfully",
    });

    setIsAddModalOpen(false);
    setNewGear({
      name: '',
      description: '',
      category: '',
      status: 'Available',
      serial: '',
    });
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Manage Gears</h1>
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
      </div>

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
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{/* Removed potential whitespace */}
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredGears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No gears found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGears.map((gear) => (
                    <motion.tr key={gear.id} variants={itemVariants}>
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
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
