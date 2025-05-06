
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Package, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// Mock Data - Replace with actual user's history data fetching
const mockHistory = [
  { id: 'h1', type: 'Request', gearName: 'Canon EOS R5', date: new Date(2024, 6, 18), status: 'Approved', details: 'Checkout: 2024-07-18, Due: 2024-07-25' },
  { id: 'h2', type: 'Check-in', gearName: 'Sony A7 IV', date: new Date(2024, 6, 15), status: 'Completed', details: 'Returned in good condition.' },
  { id: 'h3', type: 'Request', gearName: 'DJI Mavic 3', date: new Date(2024, 6, 10), status: 'Rejected', details: 'Reason: Unavailable during requested period.' },
  { id: 'h4', type: 'Request', gearName: 'Manfrotto Tripod', date: new Date(2024, 6, 20), status: 'Pending Check-in', details: 'Checkout: 2024-07-20, Due: 2024-07-22 (Overdue)' },
  { id: 'h5', type: 'Check-in', gearName: 'Canon EOS R5', date: new Date(2024, 7, 1), status: 'Completed (Damaged)', details: 'Reported scratches on lens.' },
];

export default function UserHistoryPage() {
  const [history, setHistory] = useState(mockHistory);
  // TODO: Add filtering or pagination if history list becomes long

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3"/> {status}</Badge>;
      case 'pending check-in':
         // Check if overdue based on details (this is fragile, better to have explicit overdue flag)
         const isOverdue = status.toLowerCase() === 'pending check-in' && history.find(h => h.status === status)?.details?.includes('(Overdue)');
          return isOverdue
            ? <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3"/> Overdue</Badge>
            : <Badge variant="secondary"><Package className="mr-1 h-3 w-3"/> Checked Out</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/> {status}</Badge>;
       case 'completed (damaged)':
         return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertCircle className="mr-1 h-3 w-3"/> Completed (Damaged)</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05 // Faster stagger for table rows
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
          {/* Add filtering options here if needed */}
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
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
                <TableBody>{/* Removed potential whitespace */}
                    {history.map((item) => (
                    <motion.tr key={item.id} variants={itemVariants}>
                        <TableCell>
                            <Badge variant="outline" className="capitalize">
                                {item.type === 'Request' ? <Package className="mr-1 h-3 w-3"/> : <CheckCircle className="mr-1 h-3 w-3"/>}
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
                initial={{ opacity: 0}}
                animate={{ opacity: 1}}
                transition={{delay: 0.2}}
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
