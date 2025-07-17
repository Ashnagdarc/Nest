/**
 * Request Data Hook
 * 
 * Custom hook for managing request data, filtering, and search functionality.
 * Handles data fetching, error states, and client-side filtering.
 * 
 * @hook
 */

import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiGet } from '@/lib/apiClient';

interface RequestItem {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    due_date?: string;
    user_id: string;
    gear_ids: string[];
    profiles?: {
        full_name?: string;
        email?: string;
    };
}

export function useRequestData() {
    const { toast } = useToast();

    // State management
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requests, setRequests] = useState<RequestItem[]>([]);

    // Filter states
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    /**
     * Fetch request data from database
     */
    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch requests from API
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            const { data, error: fetchError } = await apiGet<{ data: RequestItem[]; error: string | null }>(`/api/requests?${params.toString()}`);

            if (fetchError) {
                throw new Error(`Data fetch error: ${fetchError}`);
            }

            setRequests(data || []);

            toast({
                title: "Requests Updated",
                description: `Loaded ${data?.length || 0} requests successfully`,
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            toast({
                title: "Error fetching requests",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Filtered requests based on search term
     */
    const filteredRequests = useMemo(() => {
        if (!searchTerm.trim()) return requests;

        const searchLower = searchTerm.toLowerCase();

        return requests.filter(request => {
            return (
                request.id?.toLowerCase().includes(searchLower) ||
                (request.profiles?.full_name || '').toLowerCase().includes(searchLower) ||
                (request.profiles?.email || '').toLowerCase().includes(searchLower)
            );
        });
    }, [requests, searchTerm]);

    // Fetch data on component mount and filter changes
    useEffect(() => {
        fetchRequests();
    }, [filter]);

    return {
        // Data
        requests: filteredRequests,

        // States
        isLoading,
        error,

        // Filters
        filter,
        searchTerm,

        // Actions
        setFilter,
        setSearchTerm,
        fetchRequests,
    };
} 