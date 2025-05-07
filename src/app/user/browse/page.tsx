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

type Gear = {
  id: string;
  name: string;
  category: string;
  status: string;
  condition: string;
  imageUrl?: string;
  description?: string;
};

export default function BrowseGearsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [gears, setGears] = useState<Gear[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Available');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    const { data, error } = await supabase.from('gears').select('*');
    if (!error) setGears(data || []);
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

    const { error } = await supabase
      .from('gears')
      .update({
        status: 'Checked Out',
        checked_out_by: user.id,
        checked_out_at: new Date().toISOString(),
      })
      .eq('id', gear.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to checkout gear",
        variant: "destructive",
      });
      return;
    }

    // Create notification for the user
    await createGearNotification(user.id, gear.name, 'checkout');

    toast({
      title: "Success",
      description: `Successfully checked out ${gear.name}`,
    });
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
                  {/* Add more categories */}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gear Grid */}
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
                  <Image
                    src={gear.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                    alt={gear.name}
                    width={400}
                    height={300}
                    className="object-cover w-full h-48"
                    data-ai-hint={`${gear.category} equipment`}
                  />
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
                  {/* <Button variant="outline" size="sm" disabled>
                    <Eye className="mr-1 h-4 w-4" /> Details
                  </Button> */}
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
    </motion.div>
  );
}

