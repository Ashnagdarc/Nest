import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, Tag, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';
import { ViewItemModal } from './ViewItemModal';
import { EditItemModal } from './EditItemModal';

export function InventoryManagement() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [categories, setCategories] = useState<string[]>([]);

    // Modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    useEffect(() => {
        fetchInventory();
    }, [filter, categoryFilter]);

    async function fetchInventory() {
        setIsLoading(true);
        setError(null);

        try {
            // Check if table exists
            const { count, error: tableError } = await supabase
                .from('gears')
                .select('*', { count: 'exact', head: true });

            if (tableError) {
                throw new Error(`Table error: ${tableError.message}`);
            }

            if (count === null) {
                setInventory([]);
                return;
            }

            // Build query
            let query = supabase
                .from('gears')
                .select('*')
                .order('name', { ascending: true });

            // Apply status filter
            if (filter !== "all") {
                query = query.eq('status', filter);
            }

            // Apply category filter
            if (categoryFilter !== "all") {
                query = query.eq('category', categoryFilter);
            }

            const { data, error } = await query;

            if (error) throw new Error(`Data fetch error: ${error.message}`);

            // If we get data, log the first item to see its structure
            if (data && data.length > 0) {
                console.info("Sample inventory item structure:",
                    Object.keys(data[0]),
                    "First item:", data[0]
                );
            }

            // Get unique categories for filter
            if (data) {
                const uniqueCategories: string[] = Array.from(
                    new Set(data.map((item: any) => (item.category || 'Uncategorized') as string))
                );
                setCategories(uniqueCategories);
                setInventory(data);
            }
        } catch (error: any) {
            console.error("Error fetching inventory:", error.message);
            setError(error.message);
            toast({
                title: "Error fetching inventory",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const handleViewItem = (item: any) => {
        setSelectedItem(item);
        setViewModalOpen(true);
    };

    const handleEditItem = (item: any) => {
        setSelectedItemId(item.id);
        setEditModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (String(status || '').toLowerCase()) {
            case 'available':
                return <Badge className="bg-green-500">Available</Badge>;
            case 'checked_out':
            case 'checked out':
                return <Badge className="bg-orange-500">Checked Out</Badge>;
            case 'maintenance':
            case 'repair':
                return <Badge className="bg-yellow-500">Maintenance</Badge>;
            case 'damaged':
                return <Badge className="bg-red-500">Damaged</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const filteredInventory = inventory.filter(item => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            String(item.name || '').toLowerCase().includes(searchLower) ||
            String(item.description || '').toLowerCase().includes(searchLower) ||
            String(item.category || '').toLowerCase().includes(searchLower) ||
            String(item.serial_number || '').toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2 items-center flex-wrap">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="checked_out">Checked Out</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Tag className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search inventory..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => fetchInventory()}>Refresh</Button>
                    <Button variant="outline">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                </div>
            </div>

            {error ? (
                <ErrorDisplay error={error} onRetry={fetchInventory} />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading inventory...</span>
                </div>
            ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    No inventory items found
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Serial Number</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInventory.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category || 'Uncategorized'}</TableCell>
                                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                                    <TableCell>{item.serial_number || 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewItem(item)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditItem(item)}
                                            >
                                                Edit
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* View Modal */}
            <ViewItemModal
                item={selectedItem}
                open={viewModalOpen}
                onOpenChange={setViewModalOpen}
            />

            {/* Edit Modal */}
            <EditItemModal
                itemId={selectedItemId}
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                onSaved={fetchInventory}
            />
        </div>
    );
} 