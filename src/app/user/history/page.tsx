"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Package, Calendar, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format, compareDesc } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

// Define types for our history items
type HistoryItem = {
  id: string;
  type: 'Request' | 'Check-in';
  gearName: string;
  date: Date;
  status: string;
  details: string;
};

export default function UserHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error("No user is logged in");
          setIsLoading(false);
          return;
        }

        // Fetch requests from the database
        const { data: requestsData, error: requestsError } = await supabase
          .from('requests')
          .select(`
            id, 
            created_at,
            status,
            due_date,
            checkout_date,
            gears (name, id)
          `)
          .eq('user_id', user.id);

        if (requestsError) {
          console.error("Error fetching requests:", requestsError);
        }

        // Fetch check-ins from the database
        let checkinsData = null;
        try {
          const { data, error } = await supabase
            .from('checkins')
            .select(`
              id,
              checkin_date,
              status,
              notes,
              gears (name, id)
            `)
            .eq('user_id', user.id);

          if (error) {
            console.error("Error fetching check-ins:", error.message);
            // Continue execution without check-ins data
          } else {
            checkinsData = data;
          }
        } catch (error) {
          console.error("Error accessing check-ins table:", error);
          // Continue execution without check-ins data
        }

        // Process and combine the data
        const historyItems: HistoryItem[] = [];

        // Add requests to history
        if (requestsData) {
          requestsData.forEach((request: any) => {
            const gearName = request.gears?.name || 'Unknown Gear';
            let details = '';
            let status = request.status || 'Pending';

            if (request.checkout_date && request.due_date) {
              details = `Checkout: ${formatDate(request.checkout_date)}, Due: ${formatDate(request.due_date)}`;

              // Check if overdue
              if (status === 'Checked Out' && new Date(request.due_date) < new Date()) {
                status = 'Overdue';
              }
            } else if (status === 'Rejected') {
              details = 'Request was not approved';
            } else if (status === 'Pending') {
              details = 'Awaiting approval';
            }

            historyItems.push({
              id: `req-${request.id}`,
              type: 'Request',
              gearName,
              date: new Date(request.created_at),
              status,
              details
            });
          });
        }

        // Add check-ins to history if available
        if (checkinsData && checkinsData.length > 0) {
          checkinsData.forEach((checkin: any) => {
            const gearName = checkin.gears?.name || 'Unknown Gear';

            historyItems.push({
              id: `checkin-${checkin.id}`,
              type: 'Check-in',
              gearName,
              date: new Date(checkin.checkin_date || checkin.created_at),
              status: checkin.status || 'Completed',
              details: checkin.notes || 'No additional notes'
            });
          });
        }

        // Sort combined history by date (most recent first)
        historyItems.sort((a, b) => compareDesc(a.date, b.date));

        setHistory(historyItems);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [supabase]);

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PP');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();

    switch (statusLower) {
      case 'approved':
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3" /> {status}</Badge>;

      case 'checked out':
        return <Badge variant="secondary"><Package className="mr-1 h-3 w-3" /> Checked Out</Badge>;

      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Overdue</Badge>;

      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> {status}</Badge>;

      case 'damaged':
      case 'completed (damaged)':
        return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertCircle className="mr-1 h-3 w-3" /> {status}</Badge>;

      case 'pending':
        return <Badge variant="outline"><Calendar className="mr-1 h-3 w-3" /> Pending</Badge>;

      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
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
      <h1 className="text-3xl font-bold text-foreground">My History</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gear Activity Log</CardTitle>
          <CardDescription>Your past requests and check-ins.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin mr-2 text-primary" />
              <p className="text-muted-foreground">Loading your activity history...</p>
            </div>
          ) : history.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Gear Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <motion.tr key={item.id} variants={itemVariants}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.type === 'Request' ? <Package className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.gearName}</TableCell>
                      <TableCell>{format(item.date, 'PP')}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.details}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-10 text-muted-foreground"
            >
              <History className="h-10 w-10 mx-auto mb-4" />
              <p>No activity history found.</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
