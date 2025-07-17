/**
 * Inventory Data Hook
 * 
 * Custom hook for managing inventory data, filtering, and search functionality.
 * Handles data fetching, error states, and client-side filtering.
 * 
 * @hook
 */

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { apiGet } from '@/lib/apiClient';

interface InventoryItem {
    id: string;
    name: string;
    category?: string;
    status: string;
    serial_number?: string;
    description?: string;
    brand?: string;
    model?: string;
    location?: string;
}

export function useInventoryData() {
    const { toast } = useToast();

    // State management
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    // Filter states
    const [filter, setFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    /**
     * Fetch inventory data from database
     */
    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Build query params
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);

            // Fetch inventory from API
            const { data, error } = await apiGet<{ data: InventoryItem[]; error: string | null }>(`/api/gears?${params.toString()}`);
            if (error) throw new Error(error);

            setInventory(data || []);

            // Extract unique categories for filter
            const uniqueCategories = Array.from(
                new Set((data || []).map(item => item.category).filter((c): c is string => Boolean(c)))
            ).sort();
            setCategories(uniqueCategories);

            toast({
                title: "Inventory Updated",
                description: `Loaded ${data?.length || 0} items successfully`,
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
            toast({
                title: "Error Loading Inventory",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Filtered inventory based on search term
     */
    const filteredInventory = useMemo(() => {
        if (!searchTerm.trim()) return inventory;

        const searchLower = searchTerm.toLowerCase();

        return inventory.filter(item => {
            return (
                String(item.name || '').toLowerCase().includes(searchLower) ||
                String(item.description || '').toLowerCase().includes(searchLower) ||
                String(item.category || '').toLowerCase().includes(searchLower) ||
                String(item.serial_number || '').toLowerCase().includes(searchLower) ||
                String(item.brand || '').toLowerCase().includes(searchLower) ||
                String(item.model || '').toLowerCase().includes(searchLower) ||
                String(item.location || '').toLowerCase().includes(searchLower)
            );
        });
    }, [inventory, searchTerm]);

    // Fetch data on component mount and filter changes
    useEffect(() => {
        fetchInventory();
    }, [filter, categoryFilter]);

    return {
        // Data
        inventory: filteredInventory,
        categories,

        // States
        isLoading,
        error,

        // Filters
        filter,
        categoryFilter,
        searchTerm,

        // Actions
        setFilter,
        setCategoryFilter,
        setSearchTerm,
        fetchInventory,
    };
} 