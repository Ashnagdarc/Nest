"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import Link from 'next/link';
import { Eye, PackagePlus } from 'lucide-react'; // Icons for view details and request
import { createClient } from '@/lib/supabase/client';
import { createGearNotification } from '@/lib/notifications';
import { useToast } from "@/hooks/use-toast";

interface Gear {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  image_url?: string | null;
  checked_out_to?: string | null;
  current_request_id?: string | null;
  last_checkout_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export default function BrowseGearsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [gears, setGears] = useState<Gear[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Available');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gears')
        .select('id, name, category, status, description, image_url');

      if (error) {
        console.error("Error fetching gears:", error.message);
        toast({
          title: "Error fetching gear",
          description: error.message || "Failed to load gear items",
          variant: "destructive",
        });
      } else {
        console.log("Fetched gears:", data?.length || 0);
        // Map the data to include imageUrl 
        const gearData = data?.map((gear: Gear) => ({
          ...gear,
          imageUrl: gear.image_url // Add this mapping to handle the field name difference
        })) || [];
        setGears(gearData);
      }
    } catch (err) {
      console.error("Exception when fetching gears:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredGears = gears.filter(gear => {
    const statusMatch = filterStatus === 'all' || gear.status === filterStatus || (filterStatus === 'Booked' && gear.status === 'Booked') || (filterStatus === 'Damaged' && gear.status === 'Damaged') || (filterStatus === 'New' && gear.status === 'New');
    const categoryMatch = filterCategory === 'all' || gear.category === filterCategory;
    const searchMatch = gear.name.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && categoryMatch && searchMatch;
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08 // Slightly faster stagger for cards
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const handleCheckout = async (gear: Gear) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to checkout gear",
        variant: "destructive",
      });
      return;
    }

    try {
      // Start a transaction
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 7); // Default to 7 days

      // Update gear status
      const { error: gearError } = await supabase
        .from('gears')
        .update({
          status: 'Checked Out',
          checked_out_to: user.id,
          last_checkout_date: now.toISOString(),
          due_date: dueDate.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', gear.id);

      if (gearError) throw gearError;

      // Create a checkout record
      const { error: checkoutError } = await supabase
        .from('gear_checkouts')
        .insert({
          gear_id: gear.id,
          user_id: user.id,
          checkout_date: now.toISOString(),
          expected_return_date: dueDate.toISOString(),
          status: 'Checked Out'
        });

      if (checkoutError) {
        // If creating checkout record fails, revert gear status
        await supabase
          .from('gears')
          .update({
            status: 'Available',
            checked_out_to: null,
            last_checkout_date: null,
            due_date: null,
            updated_at: now.toISOString()
          })
          .eq('id', gear.id);

        throw checkoutError;
      }

      // Create notification for the user
      await createGearNotification(user.id, gear.name, 'checkout');

      toast({
        title: "Success",
        description: `Successfully checked out ${gear.name}`,
      });

    } catch (error) {
      console.error('Error during checkout:', error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? `Failed to checkout gear: ${error.message}`
          : "Failed to checkout gear. Please try again.",
        variant: "destructive",
      });
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
        <h1 className="text-3xl font-bold text-foreground">Browse Gear</h1>
        <Link href="/user/request">
          <Button>
            <PackagePlus className="mr-2 h-4 w-4" /> Request Gear
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6 flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by gear name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <div className="flex gap-4 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  {/* Add more statuses if needed */}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Camera">Camera</SelectItem>
                  <SelectItem value="Tripod">Tripod</SelectItem>
                  <SelectItem value="Drone">Drone</SelectItem>
                  <SelectItem value="Audio">Audio</SelectItem>
                  <SelectItem value="Lighting">Lighting</SelectItem>
                  <SelectItem value="Lens">Lens</SelectItem>
                  <SelectItem value="Accessory">Accessory</SelectItem>
                  <SelectItem value="Cars">Cars</SelectItem>
                  {/* Add more categories */}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <p className="text-muted-foreground">Loading gear items...</p>
        </div>
      )}

      {/* Gear Grid */}
      {!isLoading && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredGears.length > 0 ? (
            filteredGears.map((gear) => (
              <motion.div key={gear.id} variants={itemVariants}>
                <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                  <CardHeader className="p-0">
                    <div className="w-full h-48 relative bg-muted">
                      {gear.imageUrl ? (
                        <Image
                          src={gear.imageUrl}
                          alt={gear.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          unoptimized // Important for Supabase Storage URLs
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No image available
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg font-semibold">{gear.name}</CardTitle>
                      <Badge variant={
                        gear.status === 'Available' ? 'default' :
                          gear.status === 'Booked' ? 'secondary' :
                            gear.status === 'Damaged' ? 'destructive' :
                              gear.status === 'New' ? 'outline' : // Example for 'New'
                                'secondary' // Default badge
                      } className={`capitalize text-xs ${gear.status === 'Available' ? 'bg-accent text-accent-foreground' : ''}`}>
                        {gear.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground mb-1">{gear.category}</CardDescription>
                    <p className="text-sm line-clamp-2">{gear.description}</p>
                  </CardContent>
                  <CardFooter className="p-4 bg-muted/30 flex justify-end gap-2">
                    <Link href={`/user/request?gearId=${gear.id}`}>
                      <Button size="sm" disabled={gear.status !== 'Available'}>
                        <PackagePlus className="mr-1 h-4 w-4" /> Request
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center text-muted-foreground py-10"
            >
              No gear found matching your criteria.
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

