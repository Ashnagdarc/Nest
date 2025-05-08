"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSystemNotification } from '@/lib/notifications';

type Checkin = {
  id: string;
  userId: string;
  userName: string;
  gearId: string;
  gearName: string;
  checkinDate: Date | null;
  notes: string;
  status: string;
  condition: string;
  damageNotes?: string;
  requestId?: string;
};

export default function ManageCheckinsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchCheckins();
  }, []);

  async function fetchCheckins() {
    setLoading(true);
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        user_id,
        gear_id,
        checkin_date,
        notes,
        status,
        condition,
        damage_notes,
        profiles!checkins_user_id_fkey (
          full_name
        ),
        gears!checkins_gear_id_fkey (
          name,
          current_request_id
        )
      `)
      .order('checkin_date', { ascending: false });

    if (!error && data) {
      setCheckins(data.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.profiles?.full_name || 'Unknown',
        gearId: c.gear_id,
        gearName: c.gears?.name || 'Unknown',
        checkinDate: c.checkin_date ? new Date(c.checkin_date) : null,
        notes: c.notes || '',
        status: c.status,
        condition: c.condition,
        damageNotes: c.damage_notes,
        requestId: c.gears?.current_request_id
      })));
    } else {
      console.error('Error fetching checkins:', error);
      toast({
        title: "Error",
        description: "Failed to load check-ins. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  const handleApproveClick = (checkin: Checkin) => {
    setSelectedCheckin(checkin);
    setShowApproveDialog(true);
  };

  const handleRejectClick = (checkin: Checkin) => {
    setSelectedCheckin(checkin);
    setShowRejectDialog(true);
  };

  const handleApproveCheckin = async () => {
    if (!selectedCheckin) return;

    try {
      // Step 1: Update gear status
      const { error: gearError } = await supabase.rpc('update_gear_status', {
        p_gear_id: selectedCheckin.gearId,
        p_new_status: selectedCheckin.condition === 'Damaged' ? 'Needs Repair' : 'Available',
        p_user_id: null,
        p_request_id: null
      });

      if (gearError) throw gearError;

      // Step 2: Update checkin status
      const { error: checkinError } = await supabase
        .from('checkins')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckin.id);

      if (checkinError) throw checkinError;

      // Step 3: Update gear_checkouts record
      if (selectedCheckin.requestId) {
        const { error: checkoutError } = await supabase
          .from('gear_checkouts')
          .update({
            status: 'Returned',
            actual_return_date: new Date().toISOString()
          })
          .eq('gear_id', selectedCheckin.gearId)
          .eq('status', 'Checked Out');

        if (checkoutError) throw checkoutError;
      }

      // Step 4: Create notifications
      await createSystemNotification(
        selectedCheckin.userId,
        'Check-in Approved',
        `Your check-in for ${selectedCheckin.gearName} has been approved.`
      );

      toast({
        title: "Check-in Approved",
        description: "The gear has been successfully checked in.",
        variant: "default",
      });

      // Refresh the list
      fetchCheckins();
    } catch (error) {
      console.error('Error approving check-in:', error);
      toast({
        title: "Error",
        description: "Failed to approve check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowApproveDialog(false);
      setSelectedCheckin(null);
    }
  };

  const handleRejectCheckin = async () => {
    if (!selectedCheckin || !rejectionReason.trim()) return;

    try {
      // Step 1: Update checkin status
      const { error: checkinError } = await supabase
        .from('checkins')
        .update({
          status: 'Rejected',
          notes: `Rejected: ${rejectionReason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckin.id);

      if (checkinError) throw checkinError;

      // Step 2: Revert gear status back to Checked Out
      const { error: gearError } = await supabase.rpc('update_gear_status', {
        p_gear_id: selectedCheckin.gearId,
        p_new_status: 'Checked Out',
        p_user_id: selectedCheckin.userId,
        p_request_id: selectedCheckin.requestId
      });

      if (gearError) throw gearError;

      // Step 3: Create notification
      await createSystemNotification(
        selectedCheckin.userId,
        'Check-in Rejected',
        `Your check-in for ${selectedCheckin.gearName} was rejected. Reason: ${rejectionReason}`
      );

      toast({
        title: "Check-in Rejected",
        description: "The user has been notified.",
        variant: "default",
      });

      // Refresh the list
      fetchCheckins();
    } catch (error) {
      console.error('Error rejecting check-in:', error);
      toast({
        title: "Error",
        description: "Failed to reject check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setShowRejectDialog(false);
      setSelectedCheckin(null);
      setRejectionReason('');
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manage Check-ins</h1>
          <p className="text-muted-foreground">Review and process gear returns</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending & Completed Check-ins</CardTitle>
          <CardDescription>Review and process gear returns.</CardDescription>
        </CardHeader>
        <CardContent>
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {checkins.map((checkin) => (
              <motion.li key={checkin.id} variants={itemVariants}>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{checkin.gearName}</h3>
                          <Badge variant={checkin.status === 'Pending Admin Approval' ? 'outline' :
                            checkin.status === 'Completed' ? 'default' :
                              'destructive'}>
                            {checkin.status}
                          </Badge>
                          {checkin.condition === 'Damaged' && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Damaged
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Checked in by: {checkin.userName}
                        </p>
                        {checkin.checkinDate && (
                          <p className="text-sm text-muted-foreground">
                            Date: {checkin.checkinDate.toLocaleDateString()}
                          </p>
                        )}
                        {checkin.notes && (
                          <p className="text-sm">Notes: {checkin.notes}</p>
                        )}
                        {checkin.damageNotes && (
                          <p className="text-sm text-destructive">
                            Damage Description: {checkin.damageNotes}
                          </p>
                        )}
                      </div>
                      {checkin.status === 'Pending Admin Approval' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-800"
                            onClick={() => handleApproveClick(checkin)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => handleRejectClick(checkin)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.li>
            ))}
            {checkins.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-6">No check-ins to display.</p>
            )}
          </motion.ul>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Check-in</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to approve this check-in?</p>
            {selectedCheckin?.condition === 'Damaged' && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-md">
                <p className="text-sm font-medium text-destructive">
                  Note: This gear was reported as damaged. It will be marked as "Needs Repair" after approval.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleApproveCheckin}>Approve Check-in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Check-in</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Rejection</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for rejecting this check-in..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRejectCheckin}
              disabled={!rejectionReason.trim()}
            >
              Reject Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
