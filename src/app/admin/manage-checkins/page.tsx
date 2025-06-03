"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSystemNotification } from '@/lib/notifications';
import { PostgrestError } from '@supabase/supabase-js';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

type CheckinData = {
  id: string;
  user_id: string;
  gear_id: string;
  checkin_date: string | null;
  notes: string | null;
  status: string;
  condition: string;
  damage_notes: string | null;
  gears: {
    name: string;
    current_request_id: string | null;
  } | null;
};

type ProfileData = {
  id: string;
  full_name: string;
};

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
  damageNotes: string | null;
  requestId: string | null;
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
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchCheckins();
  }, []);

  async function fetchCheckins() {
    setLoading(true);
    try {
      console.log('Fetching checkins...');

      // First, get the checkins data
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('checkins')
        .select(`
          id,
          user_id,
          gear_id,
          checkin_date,
          notes,
          status,
          condition,
          gears!checkins_gear_id_fkey (
            name,
            current_request_id
          )
        `)
        .order('checkin_date', { ascending: false });

      // Log the raw response for debugging
      console.log('Supabase response:', { data: checkinsData, error: checkinsError });

      if (checkinsError) {
        // Log the full error object
        console.error('Checkins query error:', JSON.stringify(checkinsError, null, 2));

        toast({
          title: "Error",
          description: `Failed to load check-ins: ${checkinsError.message || 'Unknown error'}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!checkinsData) {
        console.log('No checkins found');
        setCheckins([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs from valid checkins data
      const userIds = [...new Set((checkinsData as CheckinData[]).map(c => c.user_id))];
      console.log('Fetching profiles for users:', userIds);

      // Then, get the user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Log profiles response
      console.log('Profiles response:', { data: profilesData, error: profilesError });

      if (profilesError) {
        console.error('Profiles query error:', JSON.stringify(profilesError, null, 2));
        toast({
          title: "Error",
          description: `Failed to load user profiles: ${profilesError.message || 'Unknown error'}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create a map of user IDs to names for quick lookup
      const userNameMap = new Map(
        (profilesData as ProfileData[] || []).map(p => [p.id, p.full_name])
      );

      const processedCheckins = (checkinsData as CheckinData[]).map((c: CheckinData) => {
        const checkin = {
          id: c.id,
          userId: c.user_id,
          userName: userNameMap.get(c.user_id) || 'Unknown User',
          gearId: c.gear_id,
          gearName: c.gears?.name || 'Unknown Gear',
          checkinDate: c.checkin_date ? new Date(c.checkin_date) : null,
          notes: c.notes || '',
          status: c.status,
          condition: c.condition,
          damageNotes: null, // Set to null since we're not fetching it yet
          requestId: c.gears?.current_request_id || null
        };
        console.log('Processed checkin:', checkin);
        return checkin;
      });

      console.log('Final processed checkins:', processedCheckins);
      setCheckins(processedCheckins);
    } catch (error) {
      console.error('Unexpected error in fetchCheckins:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    setIsApproving(true);
    try {
      // Step 1: Update checkin status
      const { error: checkinError } = await supabase
        .from('checkins')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', selectedCheckin.id);

      if (checkinError) throw checkinError;

      // Step 2: Update gear status based on condition
      const { error: gearError } = await supabase
        .from('gears')
        .update({
          status: selectedCheckin.condition === 'Damaged' ? 'Needs Repair' : 'Available',
          checked_out_to: null,
          current_request_id: null,
          condition: selectedCheckin.condition,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckin.gearId);

      if (gearError) throw gearError;

      // Step 3: Update gear_checkouts record if exists
      if (selectedCheckin.requestId) {
        const { error: checkoutError } = await supabase
          .from('gear_checkouts')
          .update({
            status: 'Returned',
            actual_return_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('gear_id', selectedCheckin.gearId)
          .eq('status', 'Checked Out');

        if (checkoutError) throw checkoutError;

        // Step 4: Update gear_requests status if all gear is returned
        const { data: request } = await supabase
          .from('gear_requests')
          .select('gear_ids, status')
          .eq('id', selectedCheckin.requestId)
          .single();

        if (request) {
          const remainingGears = request.gear_ids.filter(
            (id: string) => id !== selectedCheckin.gearId
          );
          const newStatus = remainingGears.length <= 1 ? 'Returned' : 'Partially Returned';

          const { error: requestError } = await supabase
            .from('gear_requests')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedCheckin.requestId);

          if (requestError) throw requestError;

          // Add status history entry
          await supabase
            .from('request_status_history')
            .insert({
              request_id: selectedCheckin.requestId,
              status: newStatus,
              changed_by: (await supabase.auth.getUser()).data.user?.id,
              note: `Check-in approved for gear ${selectedCheckin.gearName}`
            });
        }
      }

      // Step 5: Log the approval in gear_activity_log
      await supabase.rpc('log_gear_activity', {
        p_user_id: selectedCheckin.userId,
        p_gear_id: selectedCheckin.gearId,
        p_request_id: selectedCheckin.requestId,
        p_activity_type: 'Check-in',
        p_status: 'Completed',
        p_notes: `Check-in approved by admin`,
        p_details: JSON.stringify({
          condition: selectedCheckin.condition,
          damage_notes: selectedCheckin.damageNotes,
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
      });

      // Step 6: Create notification for user
      await createSystemNotification(
        selectedCheckin.userId,
        'Check-in Approved',
        `Your check-in for ${selectedCheckin.gearName} has been approved.`
      );

      // Step 7: Send check-in confirmation email
      // Fetch user email and name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', selectedCheckin.userId)
        .single();
      if (userProfile?.email) {
        await fetch('/api/send-gear-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: userProfile.email,
            subject: 'Your Gear Check-in Has Been Approved',
            html:
              `<h2>Hi ${userProfile.full_name || 'there'},</h2>` +
              `<p>Your check-in for <b>${selectedCheckin.gearName}</b> has been <b>approved</b> by the admin team.</p>` +
              `<p>If you have any questions, please contact the admin team.</p>` +
              `<br/>` +
              `<p>Thank you,<br/>Eden Oasis Realty Team</p>`
          }),
        });
      }

      // Send Google Chat notification for check-in approval
      // Fetch admin profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
      // Fetch user profile
      const { data: userProfileForChat } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', selectedCheckin.userId)
        .single();
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ADMIN_APPROVE_CHECKIN',
          payload: {
            adminName: adminProfile?.full_name || 'Unknown Admin',
            adminEmail: adminProfile?.email || 'Unknown Email',
            userName: userProfileForChat?.full_name || 'Unknown User',
            userEmail: userProfileForChat?.email || 'Unknown Email',
            gearName: selectedCheckin.gearName,
            checkinDate: selectedCheckin.checkinDate,
            condition: selectedCheckin.condition,
            notes: selectedCheckin.notes,
          }
        })
      });

      toast({
        title: "Check-in Approved",
        description: "The gear has been successfully checked in.",
        variant: "default",
      });

      setShowApproveDialog(false);
      // Refresh the list
      fetchCheckins();

    } catch (error) {
      console.error('Error approving check-in:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve check-in. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectCheckin = async () => {
    if (!selectedCheckin || !rejectionReason.trim()) return;
    setIsRejecting(true);
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

      // Step 4: Send rejection email
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', selectedCheckin.userId)
        .single();
      if (userProfile?.email) {
        await fetch('/api/send-gear-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: userProfile.email,
            subject: 'Your Gear Check-in Was Rejected',
            html:
              `<h2>Hi ${userProfile.full_name || 'there'},</h2>` +
              `<p>Your check-in for <b>${selectedCheckin.gearName}</b> was <b>rejected</b> by the admin team.</p>` +
              `<p><b>Reason:</b> ${rejectionReason}</p>` +
              `<p>If you have any questions, please contact the admin team.</p>` +
              `<br/>` +
              `<p>Thank you,<br/>Eden Oasis Realty Team</p>`
          }),
        });
      }

      // Send Google Chat notification for check-in rejection
      // Fetch admin profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
      // Fetch user profile
      const { data: userProfileForChat } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', selectedCheckin.userId)
        .single();
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ADMIN_REJECT_CHECKIN',
          payload: {
            adminName: adminProfile?.full_name || 'Unknown Admin',
            adminEmail: adminProfile?.email || 'Unknown Email',
            userName: userProfileForChat?.full_name || 'Unknown User',
            userEmail: userProfileForChat?.email || 'Unknown Email',
            gearName: selectedCheckin.gearName,
            checkinDate: selectedCheckin.checkinDate,
            reason: rejectionReason,
            notes: selectedCheckin.notes,
          }
        })
      });

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
      setIsRejecting(false);
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
      className="container mx-auto py-6 space-y-6"
    >
      {/* Header Section */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Check-ins</h1>
          <p className="text-muted-foreground mt-1">Review and process gear returns</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <h3 className="text-2xl font-bold mt-1">
                  {checkins.filter(c => c.status === 'Pending Admin Approval').length}
                </h3>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <h3 className="text-2xl font-bold mt-1">
                  {checkins.filter(c =>
                    c.status === 'Completed' &&
                    c.checkinDate?.toDateString() === new Date().toDateString()
                  ).length}
                </h3>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Damaged Items</p>
                <h3 className="text-2xl font-bold mt-1">
                  {checkins.filter(c => c.condition === 'Damaged').length}
                </h3>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Pending Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Check-ins</CardTitle>
            <CardDescription>Review and approve gear returns that need attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {checkins
                .filter(c => c.status === 'Pending Admin Approval')
                .map((checkin) => (
                  <motion.div
                    key={checkin.id}
                    variants={itemVariants}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{checkin.gearName}</h3>
                            {checkin.condition === 'Damaged' && (
                              <Badge variant="destructive" className="font-medium">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Damaged
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted by {checkin.userName}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {checkin.checkinDate?.toLocaleDateString()}
                          </div>
                          <Badge variant="outline">
                            Condition: {checkin.condition}
                          </Badge>
                        </div>

                        {checkin.notes && (
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium">Notes:</p>
                            <p className="text-sm text-muted-foreground">{checkin.notes}</p>
                          </div>
                        )}

                        {checkin.damageNotes && (
                          <div className="bg-destructive/10 p-3 rounded-md">
                            <p className="text-sm font-medium text-destructive">Damage Report:</p>
                            <p className="text-sm text-destructive/90">{checkin.damageNotes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          onClick={() => handleApproveClick(checkin)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => handleRejectClick(checkin)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}

              {checkins.filter(c => c.status === 'Pending Admin Approval').length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    No pending check-ins to review at the moment.
                  </p>
                </div>
              )}
            </motion.div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <CardDescription>History of recently processed check-ins.</CardDescription>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {checkins
                .filter(c => c.status !== 'Pending Admin Approval')
                .slice(0, 5)
                .map((checkin) => (
                  <motion.div
                    key={checkin.id}
                    variants={itemVariants}
                    className="border rounded-lg p-4 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{checkin.gearName}</h3>
                          <Badge variant={
                            checkin.status === 'Completed' ? 'default' :
                              checkin.status === 'Rejected' ? 'destructive' : 'secondary'
                          }>
                            {checkin.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Processed on {checkin.checkinDate?.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {checkin.condition}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          </CardContent>
        </Card>
      </div>

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
            <Button onClick={handleApproveCheckin} loading={isApproving}>Approve Check-in</Button>
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
              loading={isRejecting}
            >
              Reject Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
