"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, AlertCircle, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSystemNotification } from '@/lib/notifications';
import { groupBy } from 'lodash';

type Checkin = {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  gearId: string;
  quantity: number;
  gearName: string;
  checkinDate: Date | null;
  notes: string;
  status: string;
  condition: string;
  damageNotes: string | null;
  requestId: string | null;
};

type ApiCheckinRow = {
  id: string;
  user_id: string;
  gear_id: string;
  request_id?: string | null;
  checkin_date?: string | null;
  created_at?: string | null;
  notes?: string | null;
  quantity?: number | null;
  status: string;
  condition: string;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  gears?: {
    name?: string | null;
    current_request_id?: string | null;
  } | Array<{
    name?: string | null;
    current_request_id?: string | null;
  }> | null;
};

type RequestLineSummary = {
  requestId: string;
  gearId: string;
  gearName: string;
  requestedQty: number;
  completedQty: number;
  pendingQty: number;
  outstandingQty: number;
};

type RequestSummary = {
  requestId: string;
  totalRequestedQty: number;
  totalCompletedQty: number;
  totalPendingQty: number;
  totalOutstandingQty: number;
  lines: RequestLineSummary[];
};

const MAX_PAGES_PER_LOAD = 10;

const getRecentGroupKey = (checkin: Checkin) => {
  if (checkin.requestId) return `req::${checkin.requestId}`;
  const day = checkin.checkinDate ? checkin.checkinDate.toDateString() : 'no-date';
  return `user::${checkin.userId}::${day}`;
};

const getPendingGroupKey = (checkin: Checkin) => {
  if (checkin.requestId) return `req::${checkin.requestId}`;
  const day = checkin.checkinDate ? checkin.checkinDate.toDateString() : 'no-date';
  return `user::${checkin.userId}::${day}`;
};

const countRecentGroups = (rows: Checkin[]) => {
  const keys = new Set<string>();
  rows.forEach((row) => {
    if (row.status !== 'Pending Admin Approval') {
      keys.add(getRecentGroupKey(row));
    }
  });
  return keys.size;
};

const mergeCheckinsById = (existing: Checkin[], incoming: Checkin[]) => {
  const byId = new Map<string, Checkin>();
  existing.forEach((row) => byId.set(row.id, row));
  incoming.forEach((row) => byId.set(row.id, row));

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.checkinDate?.getTime() ?? 0;
    const bTime = b.checkinDate?.getTime() ?? 0;
    return bTime - aTime;
  });
};

export default function ManageCheckinsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(5);
  const [loadingCheckins, setLoadingCheckins] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [displayableTotal, setDisplayableTotal] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, Checkin[]>>({});
  const [groupsToShow, setGroupsToShow] = useState<number>(5);
  const [requestSummaries, setRequestSummaries] = useState<Record<string, RequestSummary>>({});
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    fetchCheckins();
  }, []);

  async function fetchCheckinsPage(fetchPage: number) {
    const checkinsUrl = `/api/checkins?limit=${limit}&page=${fetchPage}`;
    const pendingUrl = `/api/checkins?limit=1&page=1&status=${encodeURIComponent('Pending Admin Approval')}`;

    const [checkinsRes, pendingRes] = await Promise.all([
      fetch(checkinsUrl),
      fetch(pendingUrl)
    ]);

    if (!checkinsRes.ok) {
      const body = await checkinsRes.json().catch(() => null);
      const details = body?.error || body?.details || checkinsRes.statusText;
      throw new Error(`Failed to fetch checkins: ${details}`);
    }

    if (!pendingRes.ok) {
      const body = await pendingRes.json().catch(() => null);
      const details = body?.error || body?.details || pendingRes.statusText;
      throw new Error(`Failed to fetch pending count: ${details}`);
    }

    const checkinsJson = await checkinsRes.json();
    const pendingJson = await pendingRes.json();

    const checkinsData = checkinsJson.checkins || [];
    const pagination = checkinsJson.pagination || { total: 0, page: fetchPage, limit };
    const pendingTotal = pendingJson.pagination?.total ?? 0;

    const processedCheckins = (checkinsData as ApiCheckinRow[]).map((c) => {
      const gear = Array.isArray(c.gears) ? c.gears[0] : c.gears;
      return {
        id: c.id,
        userId: c.user_id,
        userName: c.profiles?.full_name || 'Unknown User',
        avatarUrl: c.profiles?.avatar_url || null,
        gearId: c.gear_id,
        quantity: Math.max(1, Number(c.quantity ?? 1)),
        gearName: gear?.name || 'Unknown Gear',
        checkinDate: c.checkin_date ? new Date(c.checkin_date) : (c.created_at ? new Date(c.created_at) : null),
        notes: c.notes || '',
        status: c.status,
        condition: c.condition,
        damageNotes: null,
        requestId: c.request_id || gear?.current_request_id || null
      } as Checkin;
    });

    return { processedCheckins, pagination, pendingTotal };
  }

  async function hydrateRequestSummaries(rows: Checkin[]) {
    const requestIds = Array.from(
      new Set(
        rows
          .map((row) => row.requestId)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (requestIds.length === 0) {
      setRequestSummaries({});
      return;
    }

    const { data: requestLines, error: requestLinesError } = await supabase
      .from('gear_request_gears')
      .select(`
        gear_request_id,
        gear_id,
        quantity,
        gears (
          name
        )
      `)
      .in('gear_request_id', requestIds);

    if (requestLinesError) {
      throw new Error(`Failed to fetch request lines: ${requestLinesError.message}`);
    }

    const { data: returnRows, error: returnRowsError } = await supabase
      .from('checkins')
      .select('request_id, gear_id, status, quantity')
      .in('request_id', requestIds)
      .in('status', ['Completed', 'Pending Admin Approval']);

    if (returnRowsError) {
      throw new Error(`Failed to fetch request return progress: ${returnRowsError.message}`);
    }

    const requestedByKey = new Map<string, number>();
    const gearNameByKey = new Map<string, string>();

    (requestLines || []).forEach((line: {
      gear_request_id: string;
      gear_id: string;
      quantity?: number | null;
      gears?: { name?: string | null } | Array<{ name?: string | null }> | null;
    }) => {
      const requestId = line.gear_request_id;
      const gearId = line.gear_id;
      const qty = Math.max(1, Number(line.quantity ?? 1));
      const key = `${requestId}::${gearId}`;
      const gear = Array.isArray(line.gears) ? line.gears[0] : line.gears;

      requestedByKey.set(key, (requestedByKey.get(key) || 0) + qty);
      if (!gearNameByKey.has(key)) {
        gearNameByKey.set(key, gear?.name || 'Unknown Gear');
      }
    });

    const completedByKey = new Map<string, number>();
    const pendingByKey = new Map<string, number>();

    (returnRows || []).forEach((row: {
      request_id: string | null;
      gear_id: string;
      status: string;
      quantity?: number | null;
    }) => {
      if (!row.request_id) return;
      const key = `${row.request_id}::${row.gear_id}`;
      const qty = Math.max(1, Number(row.quantity ?? 1));

      if (row.status === 'Completed') {
        completedByKey.set(key, (completedByKey.get(key) || 0) + qty);
      } else if (row.status === 'Pending Admin Approval') {
        pendingByKey.set(key, (pendingByKey.get(key) || 0) + qty);
      }
    });

    const summaries: Record<string, RequestSummary> = {};
    requestIds.forEach((requestId) => {
      summaries[requestId] = {
        requestId,
        totalRequestedQty: 0,
        totalCompletedQty: 0,
        totalPendingQty: 0,
        totalOutstandingQty: 0,
        lines: [],
      };
    });

    requestedByKey.forEach((requestedQty, key) => {
      const [requestId, gearId] = key.split('::');
      const summary = summaries[requestId];
      if (!summary) return;

      const completedQty = completedByKey.get(key) || 0;
      const pendingQty = pendingByKey.get(key) || 0;
      const outstandingQty = Math.max(0, requestedQty - completedQty - pendingQty);

      summary.lines.push({
        requestId,
        gearId,
        gearName: gearNameByKey.get(key) || 'Unknown Gear',
        requestedQty,
        completedQty,
        pendingQty,
        outstandingQty,
      });
      summary.totalRequestedQty += requestedQty;
      summary.totalCompletedQty += completedQty;
      summary.totalPendingQty += pendingQty;
      summary.totalOutstandingQty += outstandingQty;
    });

    Object.values(summaries).forEach((summary) => {
      summary.lines.sort((a, b) => a.gearName.localeCompare(b.gearName));
    });

    setRequestSummaries(summaries);
  }

  async function fetchCheckins(opts?: { page?: number; append?: boolean }) {
    const append = opts?.append ?? false;
    const fetchPage = opts?.page ?? (append ? page : 1);
    try {
      console.log('Fetching checkins via API...', { page: fetchPage, limit });

      setLoadingCheckins(prev => append ? prev : true);
      if (append) setLoadingMore(true);

      const { processedCheckins, pagination, pendingTotal } = await fetchCheckinsPage(fetchPage);
      const nextCheckins = append
        ? mergeCheckinsById(checkins, processedCheckins)
        : processedCheckins;

      setCheckins(nextCheckins);
      await hydrateRequestSummaries(nextCheckins);

      if (!append) {
        setPage(fetchPage);
        setGroupsToShow(5);
      }

      setTotalCount(pagination.total ?? null);
      setDisplayableTotal((pagination.total ?? 0) - (pendingTotal ?? 0));

      setHasMore((pagination.total ?? 0) > fetchPage * limit);
    } catch (error) {
      console.error('Unexpected error in fetchCheckins:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoadingCheckins(false);
      setLoadingMore(false);
    }
  }

  const handleLoadMore = async () => {
    const targetGroups = groupsToShow + 5;

    // If we already have hidden groups, reveal them without fetching.
    if (groupsToShow < orderedGroups.length) {
      setGroupsToShow(targetGroups);
      return;
    }

    if (!hasMore) return;

    setLoadingMore(true);
    try {
      let nextPage = page;
      let accumulated = [...checkins];
      let canLoadMore: boolean = hasMore;
      let pagesFetched = 0;
      let latestTotal = totalCount ?? 0;
      let latestPendingTotal = Math.max((totalCount ?? 0) - (displayableTotal ?? 0), 0);

      // Keep pulling pages in this click until we can reveal the next group chunk.
      while (
        canLoadMore &&
        countRecentGroups(accumulated) < targetGroups &&
        pagesFetched < MAX_PAGES_PER_LOAD
      ) {
        nextPage += 1;
        const { processedCheckins, pagination, pendingTotal } = await fetchCheckinsPage(nextPage);
        const existingRecentGroupKeys = new Set(
          accumulated
            .filter(row => row.status !== 'Pending Admin Approval')
            .map(getRecentGroupKey)
        );

        const nextRows = processedCheckins.filter((row) => {
          if (row.status === 'Pending Admin Approval') return true;
          const key = getRecentGroupKey(row);
          if (existingRecentGroupKeys.has(key)) return false;
          existingRecentGroupKeys.add(key);
          return true;
        });

        accumulated = mergeCheckinsById(accumulated, nextRows);
        latestTotal = pagination.total ?? latestTotal;
        latestPendingTotal = pendingTotal ?? latestPendingTotal;
        canLoadMore = (pagination.total ?? 0) > nextPage * limit;
        pagesFetched += 1;
      }

      setCheckins(accumulated);
      await hydrateRequestSummaries(accumulated);
      setPage(nextPage);
      setHasMore(canLoadMore);
      setTotalCount(latestTotal);
      setDisplayableTotal(latestTotal - latestPendingTotal);
      setGroupsToShow(targetGroups);
    } catch (error) {
      console.error('Failed to load more check-ins:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
      setLoadingCheckins(false);
    }
  };

  // Toggle group expansion. When opening, fetch all checkins for the user and
  // filter by requestId (or user+date) so we show all gears checked in by that user
  // for the group, not just the current page's items.
  const handleToggleGroup = async (groupKey: string, sampleItem: Checkin) => {
    const isExpanded = !!expandedGroups[groupKey];
    if (isExpanded) {
      setExpandedGroups(prev => ({ ...prev, [groupKey]: false }));
      return;
    }

    // If we already cached expanded items use them
    if (expandedItems[groupKey]) {
      setExpandedGroups(prev => ({ ...prev, [groupKey]: true }));
      return;
    }

    try {
      // Fetch a larger set of checkins for this user (server API will handle paging)
      const res = await fetch(`/api/checkins?limit=200&page=1&userId=${encodeURIComponent(sampleItem.userId)}`);
      if (!res.ok) throw new Error('Failed to fetch group items');
      const json = await res.json();
      const rows = json.checkins || [];

      // Map rows into Checkin shape (same mapping used elsewhere)
      const mapped: Checkin[] = (rows as ApiCheckinRow[]).map((c) => ({
        id: c.id,
        userId: c.user_id,
        userName: c.profiles?.full_name || 'Unknown User',
        avatarUrl: c.profiles?.avatar_url || null,
        gearId: c.gear_id,
        quantity: Math.max(1, Number(c.quantity ?? 1)),
        gearName: (Array.isArray(c.gears) ? c.gears[0]?.name : c.gears?.name) || 'Unknown Gear',
        checkinDate: c.checkin_date ? new Date(c.checkin_date) : (c.created_at ? new Date(c.created_at) : null),
        notes: c.notes || '',
        status: c.status,
        condition: c.condition,
        damageNotes: null,
        requestId: c.request_id || (Array.isArray(c.gears) ? c.gears[0]?.current_request_id : c.gears?.current_request_id) || null
      }));

      let selected: Checkin[] = [];
      if (groupKey.startsWith('req::')) {
        const reqId = groupKey.replace('req::', '');
        selected = mapped.filter(m => m.requestId === reqId);
      } else if (groupKey.startsWith('user::')) {
        const [, userId, day] = groupKey.split('::');
        selected = mapped.filter(m => m.userId === userId && (m.checkinDate ? m.checkinDate.toDateString() === day : false));
      }

      // Fallback: keep filtering anchored to the same day if key parsing fails.
      if (selected.length === 0 && sampleItem.checkinDate) {
        const day = sampleItem.checkinDate.toDateString();
        selected = mapped.filter(m => m.userId === sampleItem.userId && (m.checkinDate ? m.checkinDate.toDateString() === day : false));
      }
      if (selected.length === 0) {
        selected = mapped.filter(m => m.userId === sampleItem.userId && (!m.requestId || m.requestId === sampleItem.requestId));
      }

      // Cache and expand
      setExpandedItems(prev => ({ ...prev, [groupKey]: selected }));
      setExpandedGroups(prev => ({ ...prev, [groupKey]: true }));
    } catch (error) {
      console.error('Failed to load group items:', error);
    }
  };



  const handleApproveAllInGroup = async (groupKey: string) => {
    const loadedGroup = groupedPendingCheckins[groupKey] as Checkin[] | undefined;
    if (!loadedGroup || loadedGroup.length === 0) return;
    setIsApproving(true);
    try {
      // Get admin info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();

      let group: Checkin[] = loadedGroup;
      if (groupKey.startsWith('req::')) {
        const requestIdFromKey = groupKey.replace('req::', '');
        const { data: allPendingRows, error: pendingRowsError } = await supabase
          .from('checkins')
          .select(`
            id,
            user_id,
            gear_id,
            request_id,
            quantity,
            checkin_date,
            created_at,
            notes,
            status,
            condition,
            gears (
              name
            )
          `)
          .eq('request_id', requestIdFromKey)
          .eq('status', 'Pending Admin Approval');

        if (pendingRowsError) throw pendingRowsError;

        group = (allPendingRows || []).map((row: {
          id: string;
          user_id: string;
          gear_id: string;
          request_id?: string | null;
          quantity?: number | null;
          checkin_date?: string | null;
          created_at?: string | null;
          notes?: string | null;
          status?: string | null;
          condition?: string | null;
          gears?: { name?: string | null } | Array<{ name?: string | null }> | null;
        }) => {
          const gear = Array.isArray(row.gears) ? row.gears[0] : row.gears;
          return {
            id: row.id,
            userId: row.user_id,
            userName: loadedGroup[0]?.userName || 'Unknown User',
            avatarUrl: loadedGroup[0]?.avatarUrl || null,
            gearId: row.gear_id,
            quantity: Math.max(1, Number(row.quantity ?? 1)),
            gearName: gear?.name || 'Unknown Gear',
            checkinDate: row.checkin_date ? new Date(row.checkin_date) : (row.created_at ? new Date(row.created_at) : null),
            notes: row.notes || '',
            status: row.status || 'Pending Admin Approval',
            condition: row.condition || 'Good',
            damageNotes: null,
            requestId: row.request_id || null
          };
        });
      } else if (groupKey.startsWith('user::')) {
        const [, userIdFromKey, day] = groupKey.split('::');
        const { data: allPendingRows, error: pendingRowsError } = await supabase
          .from('checkins')
          .select(`
            id,
            user_id,
            gear_id,
            request_id,
            quantity,
            checkin_date,
            created_at,
            notes,
            status,
            condition,
            gears (
              name
            )
          `)
          .eq('user_id', userIdFromKey)
          .is('request_id', null)
          .eq('status', 'Pending Admin Approval');

        if (pendingRowsError) throw pendingRowsError;

        const mapped = (allPendingRows || []).map((row: {
          id: string;
          user_id: string;
          gear_id: string;
          request_id?: string | null;
          quantity?: number | null;
          checkin_date?: string | null;
          created_at?: string | null;
          notes?: string | null;
          status?: string | null;
          condition?: string | null;
          gears?: { name?: string | null } | Array<{ name?: string | null }> | null;
        }) => {
          const gear = Array.isArray(row.gears) ? row.gears[0] : row.gears;
          return {
            id: row.id,
            userId: row.user_id,
            userName: loadedGroup[0]?.userName || 'Unknown User',
            avatarUrl: loadedGroup[0]?.avatarUrl || null,
            gearId: row.gear_id,
            quantity: Math.max(1, Number(row.quantity ?? 1)),
            gearName: gear?.name || 'Unknown Gear',
            checkinDate: row.checkin_date ? new Date(row.checkin_date) : (row.created_at ? new Date(row.created_at) : null),
            notes: row.notes || '',
            status: row.status || 'Pending Admin Approval',
            condition: row.condition || 'Good',
            damageNotes: null,
            requestId: row.request_id || null
          };
        });

        group = mapped.filter((row) => {
          if (!day) return true;
          return row.checkinDate ? row.checkinDate.toDateString() === day : false;
        });
      }

      if (group.length === 0) {
        toast({
          title: 'No Pending Check-ins',
          description: 'This group was already processed.',
          variant: 'default',
        });
        return;
      }

      const requestId = group[0]?.requestId || null;
      const requestOwnerId = group[0].userId;

      // Get user info (all check-ins in group should have same user)
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', requestOwnerId)
        .single();
      // Collect gear names
      const gearNames = (group as Checkin[]).map((c: Checkin) => `${c.gearName} (x${c.quantity})`);
      // Collect checkin IDs
      const checkinIds = (group as Checkin[]).map((c: Checkin) => c.id);
      // Collect condition
      const hasDamaged = (group as Checkin[]).some((c: Checkin) => c.condition === 'Damaged');
      // Collect notes
      const notes = (group as Checkin[]).map((c: Checkin) => c.notes).filter((note: string) => Boolean(note)).join(' | ');
      // Batch update checkins (the trigger will handle gear status updates)
      const { error: checkinError } = await supabase
        .from('checkins')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString(),
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .in('id', checkinIds);
      if (checkinError) throw checkinError;

      // Note: Gear status updates are now handled automatically by the database trigger
      // when check-in status is changed to 'Completed'

      // Note: Activity logging removed - the checkins table serves as the audit trail
      // Update gear_requests status
      if (requestId) {
        // Check if all gears in this request have been checked in
        const { data: requestGears } = await supabase
          .from('gear_request_gears')
          .select('gear_id, quantity')
          .eq('gear_request_id', requestId);

        if (requestGears && requestGears.length > 0) {
          // Count total requested quantity vs completed check-ins
          const totalRequestedQuantity = requestGears.reduce((sum, rg) => sum + rg.quantity, 0);

          const { data: completedCheckins } = await supabase
            .from('checkins')
            .select('quantity')
            .eq('user_id', requestOwnerId)
            .eq('request_id', requestId)
            .eq('status', 'Completed')
            .in('gear_id', requestGears.map(rg => rg.gear_id));

          const completedQuantity = (completedCheckins || []).reduce((sum, row: { quantity?: number | null }) => {
            return sum + Math.max(1, Number(row.quantity ?? 1));
          }, 0);

          // If all requested gear has been checked in, mark request as completed
          if (completedQuantity >= totalRequestedQuantity) {
            await supabase
              .from('gear_requests')
              .update({
                status: 'Completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', requestId);

            // Add status history entry
            const { error: statusHistoryError } = await supabase
              .from('request_status_history')
              .insert({
                request_id: requestId,
                status: 'Completed',
                changed_by: user?.id,
                note: `All gear checked in - request completed`
              });
            if (statusHistoryError) {
              console.warn('Failed to write request_status_history:', statusHistoryError.message);
            }
          }
        }
      }
      // Notify user (system notification)
      await createSystemNotification(
        'Check-in Approved',
        `Your check-in for ${gearNames.join(', ')} has been approved.`,
        'checkin',
        [requestOwnerId]
      );

      // Send user email + push for grouped approvals in a single call.
      try {
        await fetch('/api/checkins/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkinId: checkinIds[0],
            userId: requestOwnerId,
            gearNames: gearNames
          })
        });
      } catch (notificationError) {
        console.error('Failed to send grouped check-in approval notifications:', notificationError);
      }

      // Send single Google Chat notification for the group
      const chatMessage = `[Check-in Approved]\n*User:* ${userProfile?.full_name || 'Unknown User'} (${userProfile?.email || 'Unknown Email'})\n*Items:* ${gearNames.join(', ')}\n*Condition:* ${hasDamaged ? 'Some Damaged' : 'All Good'}\n*Notes:* ${notes || 'None'}\n*Timestamp:* ${new Date().toLocaleString()}`;
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ADMIN_APPROVE_CHECKIN',
          payload: {
            adminName: adminProfile?.full_name || 'Unknown Admin',
            adminEmail: adminProfile?.email || 'Unknown Email',
            userName: userProfile?.full_name || 'Unknown User',
            userEmail: userProfile?.email || 'Unknown Email',
            gearNames,
            checkinDate: new Date().toLocaleString(),
            condition: hasDamaged ? 'Some Damaged' : 'All Good',
            notes: notes,
            text: chatMessage
          }
        })
      });
      toast({
        title: 'Check-ins Approved',
        description: `Approved ${checkinIds.length} pending check-in item(s) in this group.`,
        variant: 'default',
      });
      fetchCheckins();
    } catch (error) {
      console.error('Error approving check-ins:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve check-ins. Please try again.',
        variant: 'destructive',
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

      // Step 2: Create notification
      await createSystemNotification(
        selectedCheckin.userId,
        'Check-in Rejected',
        `Your check-in for ${selectedCheckin.gearName} was rejected. Reason: ${rejectionReason}`
      );

      // Step 3: Send rejection email notifications
      try {
        await fetch('/api/checkins/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkinId: selectedCheckin.id,
            userId: selectedCheckin.userId,
            gearName: selectedCheckin.gearName,
            reason: rejectionReason
          })
        });
      } catch (emailError) {
        console.error('Failed to send check-in rejection emails:', emailError);
        // Don't fail the rejection if email fails
      }

      // Step 4: Send Google Chat notification for check-in rejection
      // Fetch admin profile
      const { data: { user } } = await supabase.auth.getUser();
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

  // Group pending check-ins by request, and fallback to user+day when request_id is absent.
  const pendingCheckins = checkins.filter(c => c.status === 'Pending Admin Approval');
  const groupedPendingCheckins = groupBy(pendingCheckins, getPendingGroupKey);

  // Group completed (non-pending) check-ins by requestId when available.
  // Fallback to grouping by user + day so items checked in by the same user
  // on the same date appear in a single card.
  const completedCheckins = checkins.filter(c => c.status !== 'Pending Admin Approval');
  const groupedCompletedByRequest = groupBy(completedCheckins, getRecentGroupKey);

  // Create ordered groups array sorted by most recent checkin date (desc)
  const orderedGroups: Array<[string, Checkin[]]> = Object.entries(groupedCompletedByRequest)
    .map(([k, items]) => {
      const groupItems = items as Checkin[];
      return [k, groupItems] as [string, Checkin[]];
    })
    .sort((a, b) => {
      const aLatest = (a[1].reduce((l: Date | null, it) => it.checkinDate && (!l || it.checkinDate > l) ? it.checkinDate : l, null) as Date | null) || new Date(0);
      const bLatest = (b[1].reduce((l: Date | null, it) => it.checkinDate && (!l || it.checkinDate > l) ? it.checkinDate : l, null) as Date | null) || new Date(0);
      return bLatest.getTime() - aLatest.getTime();
    });

  // Restore the single check-in approval handler for the dialog
  const handleApproveCheckin = async () => {
    if (!selectedCheckin) return;
    setIsApproving(true);
    try {
      // Step 1: Update checkin status (the trigger will handle gear status updates)
      const { data: { user } } = await supabase.auth.getUser();
      const { error: checkinError } = await supabase
        .from('checkins')
        .update({
          status: 'Completed',
          updated_at: new Date().toISOString(),
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', selectedCheckin.id);
      if (checkinError) throw checkinError;

      // Note: Gear status updates are now handled automatically by the database trigger
      // when check-in status is changed to 'Completed'

      // Step 2: Update gear_requests status if all gear is returned
      if (selectedCheckin.requestId) {
        // Check if all gears in this request have been checked in
        const { data: requestGears } = await supabase
          .from('gear_request_gears')
          .select('gear_id, quantity')
          .eq('gear_request_id', selectedCheckin.requestId);

        if (requestGears && requestGears.length > 0) {
          // Count total requested quantity vs completed check-ins
          const totalRequestedQuantity = requestGears.reduce((sum, rg) => sum + rg.quantity, 0);

          const { data: completedCheckins } = await supabase
            .from('checkins')
            .select('quantity')
            .eq('user_id', selectedCheckin.userId)
            .eq('request_id', selectedCheckin.requestId)
            .eq('status', 'Completed')
            .in('gear_id', requestGears.map(rg => rg.gear_id));

          const completedQuantity = (completedCheckins || []).reduce((sum, row: { quantity?: number | null }) => {
            return sum + Math.max(1, Number(row.quantity ?? 1));
          }, 0);

          // If all requested gear has been checked in, mark request as completed
          if (completedQuantity >= totalRequestedQuantity) {
            await supabase
              .from('gear_requests')
              .update({
                status: 'Completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', selectedCheckin.requestId);

            // Add status history entry
            const { error: statusHistoryError } = await supabase
              .from('request_status_history')
              .insert({
                request_id: selectedCheckin.requestId,
                status: 'Completed',
                changed_by: user?.id,
                note: `All gear checked in - request completed`
              });
            if (statusHistoryError) {
              console.warn('Failed to write request_status_history:', statusHistoryError.message);
            }
          }
        }
      }
      // Step 3: Note: Activity logging removed - the checkins table serves as the audit trail
      // Step 4: Create notification for user
      await createSystemNotification(
        selectedCheckin.userId,
        'Check-in Approved',
        `Your check-in for ${selectedCheckin.gearName} has been approved.`
      );

      // Step 5: Send approval email notifications
      try {
        await fetch('/api/checkins/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkinId: selectedCheckin.id,
            userId: selectedCheckin.userId,
            gearName: selectedCheckin.gearName
          })
        });
      } catch (emailError) {
        console.error('Failed to send check-in approval emails:', emailError);
        // Don't fail the approval if email fails
      }

      // Step 6: Send Google Chat notification for check-in approval
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
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
            gearNames: [selectedCheckin.gearName],
            checkinDate: selectedCheckin.checkinDate,
            condition: selectedCheckin.condition,
            notes: selectedCheckin.notes,
          }
        })
      });
      toast({
        title: 'Check-in Approved',
        description: 'The gear has been successfully checked in.',
        variant: 'default',
      });
      setShowApproveDialog(false);
      fetchCheckins();
    } catch (error) {
      console.error('Error approving check-in:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve check-in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
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
              className="space-y-8"
            >
              {Object.entries(groupedPendingCheckins).map(([groupKey, group]) => {
                const typedGroup: Checkin[] = group as Checkin[];
                const requestId = groupKey.startsWith('req::') ? groupKey.replace('req::', '') : null;
                const requestSummary = requestId ? requestSummaries[requestId] : null;
                return (
                  <motion.div
                    key={groupKey}
                    variants={itemVariants}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">
                              {requestId ? `Request: ${requestId.slice(0, 8)}` : `Group: ${typedGroup[0].checkinDate?.toLocaleDateString() || 'No Date'}`}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted by {typedGroup[0].userName}
                          </p>
                        </div>
                        {requestSummary && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="secondary">Requested: {requestSummary.totalRequestedQty}</Badge>
                            <Badge variant="outline">Completed: {requestSummary.totalCompletedQty}</Badge>
                            <Badge variant="outline">Pending: {requestSummary.totalPendingQty}</Badge>
                            <Badge variant={requestSummary.totalOutstandingQty > 0 ? 'destructive' : 'secondary'}>
                              Outstanding: {requestSummary.totalOutstandingQty}
                            </Badge>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {requestSummary ? (
                            requestSummary.lines.map((line) => (
                              <Badge
                                key={`${line.requestId}-${line.gearId}`}
                                variant={line.outstandingQty > 0 ? 'outline' : 'secondary'}
                              >
                                {line.gearName} req x{line.requestedQty} | done {line.completedQty} | pending {line.pendingQty} | left {line.outstandingQty}
                              </Badge>
                            ))
                          ) : (
                            typedGroup.map((c: Checkin) => (
                              <Badge key={c.id} variant={c.condition === 'Damaged' ? 'destructive' : 'outline'}>
                                {c.gearName} x{c.quantity} ({c.condition})
                              </Badge>
                            ))
                          )}
                        </div>
                        {typedGroup.some((c: Checkin) => c.notes) && (
                          <div className="bg-muted p-3 rounded-md mt-2">
                            <p className="text-sm font-medium">Notes:</p>
                            <p className="text-sm text-muted-foreground">{typedGroup.map((c: Checkin) => c.notes).filter((note: string) => Boolean(note)).join(' | ')}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          onClick={() => handleApproveAllInGroup(groupKey)}
                          loading={isApproving}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve All
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {pendingCheckins.length === 0 && (
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  Showing {checkins.filter(c => c.status !== 'Pending Admin Approval').length} of {displayableTotal ?? totalCount ?? '-'} recent check-ins
                </p>
                {totalCount !== null && (
                  <p className="text-sm text-muted-foreground">Total: {totalCount}</p>
                )}
              </div>
              {loadingCheckins ? (
                // Loading placeholders
                [1,2,3].map(i => (
                  <motion.div key={`skeleton-${i}`} variants={itemVariants} className="border rounded-lg p-4 bg-card animate-pulse">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-5 w-48 bg-muted rounded mb-2" />
                        <div className="h-4 w-36 bg-muted rounded" />
                      </div>
                      <div className="h-6 w-12 bg-muted rounded" />
                    </div>
                  </motion.div>
                ))
              ) : (
                <>
                  {orderedGroups.slice(0, groupsToShow).map(([requestId, items]) => {
                    const groupItems = items as Checkin[];
                    const first = groupItems[0];
                    const isExpanded = !!expandedGroups[requestId];
                    const itemCount = (expandedItems[requestId] || groupItems).length;
                    const latestDate = groupItems.reduce((latest: Date | null, it) => {
                      if (!it.checkinDate) return latest;
                      if (!latest) return it.checkinDate;
                      return it.checkinDate > latest ? it.checkinDate : latest;
                    }, null);

                    return (
                      <motion.div key={requestId} variants={itemVariants} className="border rounded-lg p-4 bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {first.avatarUrl ? (
                                <AvatarImage src={first.avatarUrl} />
                              ) : (
                                <AvatarFallback className="text-xs">{first.userName?.slice(0,2)}</AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{first.userName}</h3>
                                <Badge variant={first.status === 'Completed' ? 'default' : (first.status === 'Rejected' ? 'destructive' : 'secondary')}>{first.status}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">Processed on { (latestDate || first.checkinDate)?.toLocaleDateString() }</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground">{itemCount} item{itemCount > 1 ? 's' : ''}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleGroup(requestId, first)}
                              aria-expanded={isExpanded}
                              aria-controls={`group-${requestId}`}
                            >
                              <ChevronDown className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                          </div>
                        </div>
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                key="expanded"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                style={{ overflow: 'hidden' }}
                                className="mt-3"
                              >
                                <div className="flex flex-wrap gap-2">
                                  {(expandedItems[requestId] || groupItems).map(c => (
                                    <Badge key={c.id} variant={c.condition === 'Damaged' ? 'destructive' : 'outline'}>
                                      {c.gearName} ({c.condition})
                                    </Badge>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  {/* Load more button */}
                  {hasMore && (
                    <div className="text-center mt-2">
                      <Button onClick={handleLoadMore} loading={loadingMore} variant="ghost">
                        {loadingMore ? 'Loading...' : 'Load more'}
                      </Button>
                    </div>
                  )}
                </>
              )}
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
                  Note: This gear was reported as damaged. It will be marked as &quot;Needs Repair&quot; after approval.
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
