import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";

export function useMaintenance(gearId: string | null) {
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['maintenance', gearId],
    queryFn: async () => {
      if (!gearId) return [];
      const { data, error } = await supabase
        .from('gear_maintenance')
        .select('*')
        .eq('gear_id', gearId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!gearId,
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: async (newMaintenance: { status: string; description: string; date: string; }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to add maintenance");

      const { error } = await supabase.from('gear_maintenance').insert([{ ...newMaintenance, gear_id: gearId, performed_by: user.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', gearId] });
      queryClient.invalidateQueries({ queryKey: ['gears'] });
      toast({
        title: "Success",
        description: "Maintenance record added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add maintenance record",
        variant: "destructive",
      });
    },
  });

  return {
    maintenanceRecords: data || [],
    isLoading,
    isError,
    error,
    addMaintenance: addMaintenanceMutation.mutate,
  };
}
