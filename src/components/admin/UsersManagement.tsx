import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';

export function UsersManagement() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchUsers();
    }, [filter]);

    async function fetchUsers() {
        setIsLoading(true);
        setError(null);

        try {
            // Check if table exists
            const { count, error: tableError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (tableError) {
                throw new Error(`Table error: ${tableError.message}`);
            }

            if (count === null) {
                setUsers([]);
                return;
            }

            // Build query
            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply role filter
            if (filter !== "all") {
                query = query.eq('role', filter);
            }

            const { data, error } = await query;

            if (error) throw new Error(`Data fetch error: ${error.message}`);

            // If we get data, log the first item to see its structure
            if (data && data.length > 0) {
                console.info("Sample user profile structure:",
                    Object.keys(data[0]),
                    "First item:", data[0]
                );
            }

            setUsers(data || []);
        } catch (error: any) {
            console.error("Error fetching users:", error.message);
            setError(error.message);
            toast({
                title: "Error fetching users",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const getRoleBadge = (role: string) => {
        switch (String(role || '').toLowerCase()) {
            case 'admin':
                return <Badge className="bg-purple-500">Admin</Badge>;
            case 'manager':
                return <Badge className="bg-blue-500">Manager</Badge>;
            case 'user':
                return <Badge className="bg-green-500">User</Badge>;
            default:
                return <Badge>{role}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (String(status || '').toLowerCase()) {
            case 'active':
                return <Badge className="bg-green-500">Active</Badge>;
            case 'inactive':
                return <Badge className="bg-gray-500">Inactive</Badge>;
            case 'suspended':
                return <Badge className="bg-red-500">Suspended</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const filteredUsers = users.filter(user => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            String(user.full_name || '').toLowerCase().includes(searchLower) ||
            String(user.email || '').toLowerCase().includes(searchLower) ||
            String(user.role || '').toLowerCase().includes(searchLower)
        );
    });

    function getInitials(name: string = '') {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2 items-center">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admins</SelectItem>
                            <SelectItem value="manager">Managers</SelectItem>
                            <SelectItem value="user">Users</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => fetchUsers()}>Refresh</Button>
                    <Button variant="outline">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            {error ? (
                <ErrorDisplay error={error} onRetry={fetchUsers} />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading users...</span>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    No users found
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.avatar_url} />
                                                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{user.full_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                                    <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">View</Button>
                                            <Button variant="outline" size="sm">Edit</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
} 