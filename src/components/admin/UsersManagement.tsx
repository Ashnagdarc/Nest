"use client";
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';
import { apiGet } from '@/lib/apiClient';
import { Pagination } from '@/components/ui/Pagination';
import type { Profile } from '@/types/supabase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';

/**
 * Manage Users admin page with robust server-side pagination, search, and filtering.
 */
export function UsersManagement() {
    // const supabase = createClient(); // Not used
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<Profile[]>([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [filter, searchTerm, page, pageSize]);

    async function fetchUsers() {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('role', filter);
            if (searchTerm) params.set('search', searchTerm);
            params.set('page', String(page));
            params.set('pageSize', String(pageSize));
            const { data, total: totalCount, error } = await apiGet<{ data: Profile[]; total: number; error: string | null }>(`/api/users?${params.toString()}`);
            if (error) throw new Error(`Data fetch error: ${error}`);
            setUsers(data || []);
            setTotal(totalCount || 0);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setError(message);
            toast({
                title: 'Error fetching users',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDelete(user: Profile) {
        setActionLoading(user.id);
        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            let resJson: unknown = null;
            try {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const text = await res.text();
                    resJson = text ? JSON.parse(text) : {};
                } else {
                    resJson = {};
                }
            } catch {
                resJson = {};
            }
            console.log('API response (Delete):', resJson, JSON.stringify(resJson));
            if (!resJson || typeof resJson !== 'object' || !('success' in resJson) || !(resJson as { success?: boolean }).success) {
                const errorMsg = (resJson && typeof resJson === 'object' && 'error' in resJson && typeof (resJson as { error?: string }).error === 'string') ? (resJson as { error: string }).error : 'Failed to delete user';
                throw new Error(errorMsg);
            }
            setUsers(prev => prev.filter(u => u.id !== user.id));
            toast({ title: 'User deleted', description: `${user.full_name} has been deleted.` });
        } catch (e: unknown) {
            let message = 'Unknown error';
            if (e instanceof Error) message = e.message;
            else if (typeof e === 'object' && e !== null) {
                if ('error' in e && typeof (e as { error?: string }).error === 'string') message = (e as { error: string }).error;
                else if ('message' in e && typeof (e as { message?: string }).message === 'string') message = (e as { message: string }).message;
                else message = JSON.stringify(e);
            } else if (typeof e === 'string') message = e;
            console.error('Action error:', e);
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setActionLoading(null);
            setConfirmDeleteId(null);
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

    function getInitials(name: string = '') {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2 items-center">
                    <Select value={filter} onValueChange={value => { setFilter(value); setPage(1); }}>
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
                            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 / page</SelectItem>
                            <SelectItem value="10">10 / page</SelectItem>
                            <SelectItem value="20">20 / page</SelectItem>
                            <SelectItem value="50">50 / page</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => fetchUsers()}>Refresh</Button>
                    <Button variant="outline">
                        Add User
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <div>
                    Showing {from}-{to} of {total} users
                </div>
                <div>
                    Page {page} of {totalPages}
                </div>
            </div>

            {error ? (
                <ErrorDisplay error={error} onRetry={fetchUsers} />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading users...</span>
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    No users found
                </div>
            ) : (
                <>
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
                                {users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar_url || undefined} />
                                                    <AvatarFallback>{getInitials(user.full_name || '')}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{user.full_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                                        <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={actionLoading === user.id}>
                                                        More
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleDelete(user)} disabled={actionLoading === user.id}>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Dialog open={confirmDeleteId === user.id} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Delete User</DialogTitle>
                                                        <DialogDescription>
                                                            Are you sure you want to delete {user.full_name}? This action cannot be undone.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter>
                                                        <Button variant="destructive" onClick={() => handleDelete(user)} disabled={actionLoading === user.id}>Delete</Button>
                                                        <DialogClose asChild>
                                                            <Button variant="outline">Cancel</Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex justify-center mt-4">
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            onPageChange={p => setPage(p)}
                        />
                    </div>
                </>
            )}
        </div>
    );
} 