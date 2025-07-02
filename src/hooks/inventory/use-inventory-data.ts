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
    const supabase = createClient();
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

            // Check if gears table exists
            const { data: tableCheck, error: tableError } = await supabase
                .from('gears')
                .select('count')
                .limit(1);

            if (tableError) {
                throw new Error(`Database table not accessible: ${tableError.message}`);
            }

            // Build query with filters
            let query = supabase.from('gears').select('*');

            // Apply status filter
            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            // Apply category filter
            if (categoryFilter !== 'all') {
                query = query.eq('category', categoryFilter);
            }

            // Execute query
            const { data, error: fetchError } = await query.order('name');

            if (fetchError) {
                throw fetchError;
            }

            setInventory(data || []);

            // Extract unique categories for filter
            const uniqueCategories = Array.from(
                new Set((data || []).map(item => item.category).filter(Boolean))
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