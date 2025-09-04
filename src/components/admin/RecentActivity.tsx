'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, Package, ArrowRight } from 'lucide-react';
import { apiGet } from '@/lib/apiClient';
import { logger } from '@/utils/logger';

interface ActivityData {
  id: string;
  activity_type: string;
  status: string;
  created_at: string;
  notes?: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  gears?: {
    id: string;
    name: string;
    category?: string;
    status?: string;
  };
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user: string;
  gear: string;
  timestamp: string;
  status: string;
  icon: React.ComponentType<{ className?: string }>;
  statusColor: string;
}

function getActivityIcon(activityType: string) {
  switch (activityType.toLowerCase()) {
    case 'check-in':
    case 'checkin':
      return CheckCircle;
    case 'check-out':
    case 'checkout':
      return Package;
    case 'status change':
      return ArrowRight;
    default:
      return Clock;
  }
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'pending admin approval':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}



export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet<{
        activities: ActivityData[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>('/api/activities?limit=10&days=7');

      const data = response.activities;

      const processedActivities: ActivityItem[] = (data || []).map((activity) => {
        const user = activity.profiles?.full_name || 'Unknown User';
        const gear = activity.gears?.name || 'Unknown Equipment';
        const activityType = activity.activity_type || 'Activity';
        const status = activity.status || 'Unknown';
        
        let description = '';
        switch (activityType.toLowerCase()) {
          case 'check-in':
          case 'checkin':
            description = `${user} checked in ${gear}`;
            break;
          case 'check-out':
          case 'checkout':
            description = `${user} checked out ${gear}`;
            break;
          case 'status change':
            description = `${gear} status changed`;
            break;
          default:
            description = `${user} performed ${activityType.toLowerCase()} on ${gear}`;
        }

        return {
          id: activity.id,
          type: activityType,
          description,
          user,
          gear,
          timestamp: formatTimeAgo(activity.created_at),
          status,
          icon: getActivityIcon(activityType),
          statusColor: getStatusColor(status)
        };
      });

      setActivities(processedActivities);
    } catch (err) {
      logger.error('Failed to fetch recent activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <div className="space-y-2">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={fetchRecentActivities}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge className={`text-xs ${activity.statusColor}`}>
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivity;