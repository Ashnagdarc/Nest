"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle, Package, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button'; // For potential actions like 'Cancel'
import { useToast } from "@/hooks/use-toast"; // Import toast

// Mock Data - Replace with actual user's request data fetching
const mockRequests = [
  { id: 'req1', gearNames: ['Canon EOS R5', 'Tripod X'], requestDate: new Date(2024, 6, 20), duration: '3 days', status: 'Pending', adminNotes: null },
  { id: 'req3', gearNames: ['Sony A7 IV', 'Rode Mic'], requestDate: new Date(2024, 6, 18), duration: '5 days', status: 'Approved', adminNotes: 'Approved for Studio B use.', checkoutDate: new Date(2024, 6, 19), dueDate: new Date(2024, 6, 24) },
  { id: 'req2', gearNames: ['DJI Mavic 3'], requestDate: new Date(2024, 6, 19), duration: '1 day', status: 'Rejected', adminNotes: 'Drone requires maintenance.' },
  { id: 'req4', gearNames: ['Lens Kit'], requestDate: new Date(2024, 6, 21), duration: '2 hours', status: 'Checked Out', adminNotes: 'Approved.', checkoutDate: new Date(2024, 6, 21, 14), dueDate: new Date(2024, 6, 21, 16) }, // Example checked out
  { id: 'req5', gearNames: ['LED Panel'], requestDate: new Date(2024, 7, 1), duration: '1 week', status: 'Checked In', adminNotes: null, checkoutDate: new Date(2024, 7, 2), checkinDate: new Date(2024, 7, 9) }, // Example completed
  { id: 'req6', gearNames: ['Manfrotto Tripod'], requestDate: new Date(2024, 6, 20), duration: '1 day', status: 'Overdue', adminNotes: 'Approved.', checkoutDate: new Date(2024, 6, 20), dueDate: new Date(2024, 6, 21) }, // Example overdue
];

export default function MyRequestsPage() {
  const [requests, setRequests] = useState(mockRequests);
  const { toast } = useToast(); // Initialize useToast
  // TODO: Add filtering or sorting if needed

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" /> {status}</Badge>; // Use primary color
      case 'checked out':
        return <Badge variant="secondary"><Package className="mr-1 h-3 w-3" /> {status}</Badge>; // Use secondary color
      case 'checked in':
      case 'completed':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>; // Keep green for completed
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'cancelled': // Added case for cancelled requests
        return <Badge variant="outline" className="text-muted-foreground border-dashed"><RotateCcw className="mr-1 h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // TODO: Implement Cancel Request logic (with confirmation)
  const handleCancelRequest = (requestId: string) => {
    console.log("Cancelling request:", requestId);
    // Add confirmation dialog here before proceeding
    // Example using window.confirm (replace with AlertDialog):
    if (window.confirm("Are you sure you want to cancel this request?")) {
      setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'Cancelled' } : r).filter(r => r.status !== 'Cancelled')); // Example optimistic update, or refetch list
      // Call API to cancel
      toast({ title: "Request Cancelled", description: "Your gear request has been cancelled." });
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
      <h1 className="text-3xl font-bold text-foreground">My Gear Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>Request Status</CardTitle>
          <CardDescription>Track the status of your gear checkout requests.</CardDescription>
          {/* Add filtering/sorting options here if needed */}
        </CardHeader>
        <CardContent>
          {requests.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested Gear(s)</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dates</TableHead> {/* Checkout/Due/Checkin */}
                    <TableHead>Admin Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <motion.tr key={req.id} variants={itemVariants}>
                      <TableCell className="font-medium">{req.gearNames.join(', ')}</TableCell><TableCell>{format(req.requestDate, 'PP')}</TableCell><TableCell>{req.duration}</TableCell><TableCell>{getStatusBadge(req.status)}</TableCell><TableCell className="text-xs">{req.checkoutDate && <div>Out: {format(req.checkoutDate, 'PP')}</div>}{req.dueDate && <div className={`${req.status === 'Overdue' ? 'text-destructive font-semibold' : ''}`}>Due: {format(req.dueDate, 'PP')}</div>}{req.checkinDate && <div>In: {format(req.checkinDate, 'PP')}</div>}</TableCell><TableCell className="text-xs text-muted-foreground">{req.adminNotes || 'N/A'}</TableCell><TableCell className="text-right">{req.status === 'Pending' && (<Button variant="outline" size="sm" onClick={() => handleCancelRequest(req.id)}><RotateCcw className="mr-1 h-3 w-3" /> Cancel</Button>)}</TableCell>
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
              <Package className="h-10 w-10 mx-auto mb-4" />
              <p>You haven't made any gear requests yet.</p>
              <Button variant="link" className="mt-2" asChild>
                <a href="/user/browse">Request Gear</a>
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
