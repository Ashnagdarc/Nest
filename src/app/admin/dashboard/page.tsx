"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List, CheckCircle, AlertTriangle, PackagePlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import AdminLayout from '../layout'; // Assume AdminLayout handles sidebar/header
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
import type { Database } from '@/types/supabase';

// Mock data - replace with actual data fetching
const stats = [
  { title: "Available Gears", value: 120, icon: CheckCircle, color: "text-green-500" },
  { title: "Booked Gears", value: 35, icon: List, color: "text-blue-500" },
  { title: "Damaged Gears", value: 8, icon: AlertTriangle, color: "text-orange-500" },
  { title: "New Gears", value: 5, icon: PackagePlus, color: "text-purple-500" },
];

type Activity = {
  id: string;
  user: string;
  action: string;
  time: string;
};

type Gear = Database['public']['Tables']['gears']['Row'];

const recentActivities = [
  { id: 1, user: "Alice", action: "requested Camera X", time: "5 mins ago" },
  { id: 2, user: "Admin", action: "added Tripod Y", time: "1 hour ago" },
  { id: 3, user: "Bob", action: "checked in Drone Z", time: "3 hours ago" },
  { id: 4, user: "Admin", action: "approved Alice's request", time: "4 hours ago" },
  { id: 5, user: "Charlie", action: "reported damage on Mic A", time: "1 day ago" },
];

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState([
    { title: 'Available Gears', value: 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Booked Gears', value: 0, icon: List, color: 'text-blue-500' },
    { title: 'Damaged Gears', value: 0, icon: AlertTriangle, color: 'text-orange-500' },
    { title: 'New Gears', value: 0, icon: PackagePlus, color: 'text-purple-500' },
  ]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, []);

  async function fetchStats() {
    const { data, error } = await supabase.from('gears').select('status, created_at');
    if (!error && data) {
      const available = data.filter((g: Gear) => g.status === 'available').length;
      const booked = data.filter((g: Gear) => g.status === 'checked_out').length;
      const damaged = data.filter((g: Gear) => g.status === 'maintenance').length;
      // New gears: added in the last 7 days
      const now = new Date();
      const newGears = data.filter((g: Gear) => g.created_at && (now.getTime() - new Date(g.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000).length;
      setStats([
        { title: 'Available Gears', value: available, icon: CheckCircle, color: 'text-green-500' },
        { title: 'Booked Gears', value: booked, icon: List, color: 'text-blue-500' },
        { title: 'Damaged Gears', value: damaged, icon: AlertTriangle, color: 'text-orange-500' },
        { title: 'New Gears', value: newGears, icon: PackagePlus, color: 'text-purple-500' },
      ]);
    }
  }

  async function fetchRecentActivities() {
    // If you have an activities table, fetch from there. Otherwise, use recent gears as placeholder.
    const { data, error } = await supabase.from('gears').select('id, name, created_at').order('created_at', { ascending: false }).limit(5);
    if (!error && data) {
      setRecentActivities(data.map((g: Gear) => ({
        id: g.id,
        user: 'Admin',
        action: `added ${g.name}`,
        time: g.created_at ? timeAgo(new Date(g.created_at)) : '',
      })));
    }
  }

  function timeAgo(date: Date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff} sec${diff !== 1 ? 's' : ''} ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  const listVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05 + 0.4, // Start after cards animation
        duration: 0.4,
        ease: "easeOut",
      },
    }),
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-foreground"
        >
          Admin Dashboard
        </motion.h1>
        <ThemeToggle />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div key={stat.title} custom={index} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activities */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest actions within the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentActivities.map((activity, index) => (
                <motion.li
                  key={activity.id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={listVariants}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-semibold">{activity.user}</span>{' '}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </motion.li>
              ))}
            </ul>
            {recentActivities.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No recent activities.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
