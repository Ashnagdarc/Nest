/**
 * Request Data Hook
 * 
 * Custom hook for managing request data, filtering, and search functionality.
 * Handles data fetching, error states, and client-side filtering.
 * 
 * @hook
 */

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";

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
    const supabase = createClient();
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

            // Check if gear_requests table exists
            const { count, error: tableError } = await supabase
                .from('gear_requests')
                .select('*', { count: 'exact', head: true });

            if (tableError) {
                throw new Error(`Table error: ${tableError.message}`);
            }

            if (count === null) {
                setRequests([]);
                return;
            }

            // Build query based on filter
            let query = supabase
                .from('gear_requests')
                .select(`
          id,
          status,
          created_at,
          updated_at,
          due_date,
          user_id,
          gear_ids,
          profiles:user_id (
            full_name,
            email
          )
        `)
                .order('created_at', { ascending: false });

            // Apply status filter
            if (filter !== "all") {
                query = query.eq('status', filter);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                throw new Error(`Data fetch error: ${fetchError.message}`);
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