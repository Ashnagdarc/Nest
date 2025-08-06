import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/apiClient';
import { Gear, Profile, GearRequest } from "@/types/dashboard";

export function useDashboard(page = 1, pageSize = 10) {
  const { data: gears, isLoading: isLoadingGears, isError: isErrorGears } = useQuery({
    queryKey: ['gears', page, pageSize],
    queryFn: () => apiGet<{ data: Gear[], total: number }>(`/api/gears?page=${page}&pageSize=${pageSize}`),
  });

  const { data: users, isLoading: isLoadingUsers, isError: isErrorUsers } = useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: () => apiGet<{ data: Profile[], total: number }>(`/api/users?page=${page}&pageSize=${pageSize}`),
  });

  const { data: requests, isLoading: isLoadingRequests, isError: isErrorRequests } = useQuery({
    queryKey: ['requests', page, pageSize],
    queryFn: () => apiGet<{ data: GearRequest[], total: number }>(`/api/requests?page=${page}&pageSize=${pageSize}`),
  });

  const isLoading = isLoadingGears || isLoadingUsers || isLoadingRequests;
  const isError = isErrorGears || isErrorUsers || isErrorRequests;

  return {
    gears: gears?.data || [],
    gearsTotal: gears?.total || 0,
    users: users?.data || [],
    usersTotal: users?.total || 0,
    requests: requests?.data || [],
    requestsTotal: requests?.total || 0,
    isLoading,
    isError,
  };
}
