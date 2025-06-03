import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Represents a weekly usage report.
 */
export interface WeeklyUsageReport {
  /**
   * The start date of the week for which the report is generated.
   */
  startDate: string;
  /**
   * The end date of the week for which the report is generated.
   */
  endDate: string;
  /**
   * An array of usage statistics for each gear.
   */
  gearUsage: GearStats[];
  userStats: UserStats[];
  summary: string;
  mostActiveUser?: string;
  mostActiveGear?: string;
  uniqueUsers: number;
  avgRequestDuration: number;
  overdueReturns: number;
  utilizationRate: number;
}

/**
 * Represents usage statistics for a single gear.
 */
export interface GearUsage {
  /**
   * ID of the gear
   */
  id: string;
  /**
   * The name of the gear.
   */
  gearName: string;
  /**
   * The number of times the gear was requested during the week.
   */
  requestCount: number;
  /**
   * The number of times the gear was checked out during the week.
   */
  checkoutCount: number;
  /**
   * The number of times the gear was checked in during the week.
   */
  checkinCount: number;
  /**
   * The number of times the gear was booked during the week.
   */
  bookingCount: number;
  /**
   * The number of times the gear was damaged during the week.
   */
  damageCount: number;
}

/**
 * Weekly report result from the database
 */
interface WeeklyReportResult {
  gear_id: string;
  gear_name: string;
  request_count: number;
  checkout_count: number;
  checkin_count: number;
  booking_count: number;
  damage_count: number;
}

export interface UserStats {
  id: string;
  name: string;
  requests: number;
  checkouts: number;
  checkins: number;
  overdue: number;
  damages: number;
}

export interface GearStats extends GearUsage {
  status?: string;
  lastActivity?: string;
  utilization?: number;
}

/**
 * Generates a weekly usage report for the current week.
 * 
 * @returns A promise that resolves to a WeeklyUsageReport object.
 */
export async function generateWeeklyUsageReport(): Promise<WeeklyUsageReport> {
  return generateUsageReportForRange(
    startOfWeek(new Date()),
    endOfWeek(new Date())
  );
}

/**
 * Generates a usage report for a specific date range.
 * 
 * @param startDate - The start date of the report period
 * @param endDate - The end date of the report period
 * @returns A promise that resolves to a WeeklyUsageReport object
 */
export async function generateUsageReportForRange(
  startDate: Date,
  endDate: Date
): Promise<WeeklyUsageReport> {
  const supabase = createClient();

  try {
    // Call the SQL function to get the report data
    const { data, error } = await supabase.rpc('get_weekly_activity_report', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });

    console.log('[DEBUG] get_weekly_activity_report data:', data);
    if (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }

    // Format the dates
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    // Transform the data into the expected format
    const gearUsage: GearStats[] = (data as WeeklyReportResult[]).map(item => ({
      id: item.gear_id,
      gearName: item.gear_name,
      requestCount: item.request_count,
      checkoutCount: item.checkout_count,
      checkinCount: item.checkin_count,
      bookingCount: item.booking_count,
      damageCount: item.damage_count
    }));
    console.log('[DEBUG] gearUsage:', gearUsage);

    // 2. User stats aggregation
    const { data: userRows } = await supabase
      .from('profiles')
      .select('id, full_name');
    console.log('[DEBUG] userRows:', userRows);
    const { data: requests } = await supabase
      .from('gear_requests')
      .select('id, user_id, created_at, due_date, checkout_date, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    console.log('[DEBUG] requests:', requests);
    const { data: checkouts } = await supabase
      .from('gear_checkouts')
      .select('id, user_id, checkout_date, expected_return_date, actual_return_date, status')
      .gte('checkout_date', startDate.toISOString())
      .lte('checkout_date', endDate.toISOString());
    console.log('[DEBUG] checkouts:', checkouts);
    const { data: damages } = await supabase
      .from('gear_maintenance')
      .select('id, user_id, created_at, maintenance_type')
      .eq('maintenance_type', 'Damage Report')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    console.log('[DEBUG] damages:', damages);
    // Overdue: checkouts not returned by expected_return_date
    const overdueReturns = (checkouts || []).filter((c: any) => c.status !== 'Returned' && c.expected_return_date && new Date(c.expected_return_date) < new Date()).length;
    // Average request duration (in days)
    const durations = (requests || []).map((r: any) => {
      if (r.checkout_date && r.due_date) {
        return (new Date(r.due_date).getTime() - new Date(r.checkout_date).getTime()) / (1000 * 60 * 60 * 24);
      }
      return 0;
    }).filter((d: number) => d > 0);
    const avgRequestDuration = durations.length ? (durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;
    // User stats
    const userStats: UserStats[] = (userRows || []).map((u: any) => {
      const userRequests = (requests || []).filter((r: any) => r.user_id === u.id);
      const userCheckouts = (checkouts || []).filter((c: any) => c.user_id === u.id);
      const userCheckins = userCheckouts.filter((c: any) => c.status === 'Returned');
      const userOverdue = userCheckouts.filter((c: any) => c.status !== 'Returned' && c.expected_return_date && new Date(c.expected_return_date) < new Date()).length;
      const userDamages = (damages || []).filter((d: any) => d.user_id === u.id).length;
      return {
        id: u.id,
        name: u.full_name,
        requests: userRequests.length,
        checkouts: userCheckouts.length,
        checkins: userCheckins.length,
        overdue: userOverdue,
        damages: userDamages
      };
    });
    console.log('[DEBUG] userStats:', userStats);
    // Most active user/gear
    const mostActiveUser = userStats.sort((a: UserStats, b: UserStats) => (b.requests + b.checkouts) - (a.requests + a.checkouts))[0]?.name || '';
    const mostActiveGear = gearUsage.sort((a: GearStats, b: GearStats) => (b.requestCount + b.checkoutCount) - (a.requestCount + a.checkoutCount))[0]?.gearName || '';
    // Utilization rate: checked out gears / total gears
    const { data: allGears } = await supabase.from('gears').select('id, status, updated_at');
    console.log('[DEBUG] allGears:', allGears);
    const checkedOutGears = (allGears || []).filter((g: any) => g.status === 'Checked Out').length;
    const utilizationRate = allGears && allGears.length ? (checkedOutGears / allGears.length) * 100 : 0;
    // Add status/lastActivity/utilization to gearUsage
    gearUsage.forEach(gear => {
      const gearRow = (allGears || []).find((g: any) => g.id === gear.id);
      gear.status = gearRow?.status;
      gear.lastActivity = gearRow?.updated_at;
      gear.utilization = utilizationRate;
    });
    // Unique users
    const uniqueUsers = userStats.filter(u => u.requests + u.checkouts > 0).length;
    // Summary/notes (simple version)
    const summary = `In this period, there were ${requests?.length || 0} requests, ${checkouts?.length || 0} check-outs, and ${damages?.length || 0} damage reports. ${uniqueUsers} users participated. The most active user was ${mostActiveUser}, and the most active gear was ${mostActiveGear}. Average request duration was ${avgRequestDuration.toFixed(1)} days. There were ${overdueReturns} overdue returns. Utilization rate: ${utilizationRate.toFixed(1)}%.`;
    const reportObj = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      gearUsage,
      userStats,
      summary,
      mostActiveUser,
      mostActiveGear,
      uniqueUsers,
      avgRequestDuration,
      overdueReturns,
      utilizationRate
    };
    console.log('[DEBUG] Final report object:', reportObj);
    return reportObj;
  } catch (error) {
    console.error('Failed to generate weekly usage report:', error);

    // Return fallback data in case of error
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      gearUsage: [],
      userStats: [],
      summary: '',
      mostActiveUser: '',
      mostActiveGear: '',
      uniqueUsers: 0,
      avgRequestDuration: 0,
      overdueReturns: 0,
      utilizationRate: 0
    };
  }
}
