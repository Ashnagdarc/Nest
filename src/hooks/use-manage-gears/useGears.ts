import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { createGearNotification } from '@/lib/notifications';
import { gearQueries } from '@/lib/api/queries';
import { Gear } from '@/types/supabase';

export function useGears() {
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['gears', page, pageSize, filterStatus, filterCategory, searchTerm],
    queryFn: () => gearQueries.getGearsWithPagination(page, pageSize, { status: filterStatus, category: filterCategory, search: searchTerm }),
  });

  const addGearMutation = useMutation({
    mutationFn: async (newGear: Gear) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to add gear");

      const { error } = await supabase.from('gears').insert([newGear]);
      if (error) throw error;

      await createGearNotification(user.id, newGear.name, 'add');
      return newGear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gears'] });
      toast({
        title: "Success",
        description: "Gear added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add gear",
        variant: "destructive",
      });
    },
  });

  const updateGearMutation = useMutation({
    mutationFn: async (updatedGear: Gear) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in to update gear");

      const { error } = await supabase.from('gears').update(updatedGear).eq('id', updatedGear.id);
      if (error) throw error;

        await createGearNotification(user.id, updatedGear.name, 'update');
      return updatedGear;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gears'] });
      toast({
        title: "Success",
        description: "Gear updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gear",
        variant: "destructive",
      });
    },
  });

  const deleteGearMutation = useMutation({
    mutationFn: async (gearId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in to delete gear");

      const { error } = await supabase.from('gears').delete().eq('id', gearId);
      if (error) throw error;

        await createGearNotification(user.id, `Gear ID: ${gearId}`, 'delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gears'] });
      toast({
        title: "Success",
        description: "Gear deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gear",
        variant: "destructive",
      });
    },
  });

  return {
    gears: data?.data || [],
    total: data?.total || 0,
    isLoading,
    isError,
    error,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    pageSize,
    setPageSize,
    addGear: addGearMutation.mutate,
    updateGear: updateGearMutation.mutate,
    deleteGear: deleteGearMutation.mutate,
  };
}
