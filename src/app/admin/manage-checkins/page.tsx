"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { useState, useEffect } from 'react';

type Checkin = {
  id: string;
  userName: string;
  gearName: string;
  checkinDate: Date | null;
  notes: string;
  status: 'Completed' | 'Pending';
};

export default function ManageCheckinsPage() {
  const supabase = createClient();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

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
        users:profiles (
          full_name
        ),
        gears (
          name
        )
      `)
      .order('checkin_date', { ascending: false });

    if (!error && data) {
      setCheckins(data.map((c: any) => ({
        id: c.id,
        userName: c.users?.full_name || 'Unknown',
        gearName: c.gears?.name || 'Unknown',
        checkinDate: c.checkin_date ? new Date(c.checkin_date) : null,
        notes: c.notes || '',
        status: c.status,
      })));
    }
    setLoading(false);
  }

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
      <h1 className="text-3xl font-bold text-foreground">Manage Check-ins</h1>

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
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{checkin.gearName} - {checkin.userName}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {checkin.status} {checkin.checkinDate ? `(${checkin.checkinDate.toLocaleDateString()})` : ''}
                      </p>
                      {checkin.notes && <p className="text-xs mt-1">Notes: {checkin.notes}</p>}
                    </div>
                    {checkin.status === 'Pending' && (
                      <button className="text-green-600 hover:text-green-800">
                        <CheckCircle className="h-5 w-5" />
                        <span className="sr-only">Process Check-in</span>
                      </button>
                    )}
                  </CardContent>
                </Card>
              </motion.li>
            ))}
            {checkins.length === 0 && (
              <p className="text-center text-muted-foreground py-6">No check-ins to display.</p>
            )}
          </motion.ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}
