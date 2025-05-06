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
   * The name of the gear.
   */
  gearName: string;
  /**
   * The number of times the gear was requested during the week.
   */
  requestCount: number;
  /**
   * The number of times the gear was damaged during the week.
   */
  damageCount: number;
}

/**
 * Generates a weekly usage report.
 *
 * @returns A promise that resolves to a WeeklyUsageReport object.
 */
export async function generateWeeklyUsageReport(): Promise<WeeklyUsageReport> {
  // TODO: Implement this by calling an API.
  return {
    startDate: '2024-01-01',
    endDate: '2024-01-07',
    gearUsage: [
      {
        gearName: 'Camera',
        requestCount: 10,
        damageCount: 1,
      },
      {
        gearName: 'Tripod',
        requestCount: 5,
        damageCount: 0,
      },
    ],
  };
}
