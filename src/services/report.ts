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
  gearUsage: GearUsage[];
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
    
    if (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
    
    // Format the dates
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');
    
    // Transform the data into the expected format
    const gearUsage: GearUsage[] = (data as WeeklyReportResult[]).map(item => ({
      id: item.gear_id,
      gearName: item.gear_name,
      requestCount: item.request_count,
      checkoutCount: item.checkout_count,
      checkinCount: item.checkin_count,
      bookingCount: item.booking_count,
      damageCount: item.damage_count
    }));
    
    return {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      gearUsage
    };
  } catch (error) {
    console.error('Failed to generate weekly usage report:', error);
    
    // Return fallback data in case of error
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      gearUsage: []
    };
  }
}
