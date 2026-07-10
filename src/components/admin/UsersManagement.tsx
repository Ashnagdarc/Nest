"use client";

import { useCallback, useEffect, useState } from 'react';
import { Filter, Search, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import ErrorDisplay from '@/components/ui/error-display';
import { ListSkeleton } from '@/components/dashboard/ListSkeleton';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import { apiGet } from '@/lib/apiClient';
import { UsersPageHeader } from '@/components/admin/users/UsersPageHeader';
import { UserStatsCards } from '@/components/admin/users/UserStatsCards';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { UserFormDialog, type UserFormSubmitPayload } from '@/components/admin/users/UserFormDialog';
import { UserDeleteDialog } from '@/components/admin/users/UserDeleteDialog';
import type { UserProfile } from '@/components/admin/users/types';
import { useUserSummary } from '@/hooks/admin/useUserSummary';

const useDebouncedSearch = (value: string, delay = 300) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

export function UsersManagement() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const [formDialogOpen, setFormDialogOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

    const debouncedSearch = useDebouncedSearch(searchTerm, 300);
    const { summary, loading: summaryLoading } = useUserSummary(summaryRefreshKey);

    const fetchUsers = useCallback(async (options?: { silent?: boolean }) => {
        if (options?.silent) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('role', filter);
            if (debouncedSearch) params.set('search', debouncedSearch);
            params.set('page', String(page));
            params.set('pageSize', String(pageSize));

            const { data, total: totalCount, error: fetchError } = await apiGet<{
                data: UserProfile[];
                total: number;
                error: string | null;
            }>(`/api/users?${params.toString()}`);

            if (fetchError) throw new Error(fetchError);
            setUsers(data || []);
            setTotal(totalCount || 0);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch users';
            setError(message);
            toast({
                title: 'Error fetching users',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [debouncedSearch, filter, page, pageSize, toast]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filter, pageSize]);

    const refreshAll = useCallback(async () => {
        await fetchUsers({ silent: true });
        setSummaryRefreshKey((key) => key + 1);
    }, [fetchUsers]);

    const openCreateDialog = () => {
        setFormMode('create');
        setSelectedUser(null);
        setFormDialogOpen(true);
    };

    const openEditDialog = (user: UserProfile) => {
        setFormMode('edit');
        setSelectedUser(user);
        setFormDialogOpen(true);
    };

    const handleFormSubmit = async (payload: UserFormSubmitPayload) => {
        setIsSubmittingForm(true);
        try {
            if (formMode === 'create') {
                const response = await fetch('/api/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: payload.email,
                        password: payload.password,
                        fullName: payload.fullName,
                        role: payload.role,
                        status: payload.status,
                    }),
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to create user');
                }

                toast({
                    title: 'User created',
                    description: `${payload.fullName} can now sign in.`,
                });
            } else if (selectedUser) {
                const response = await fetch(`/api/users/${selectedUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        full_name: payload.fullName,
                        role: payload.role,
                        status: payload.status,
                    }),
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to update user');
                }

                toast({
                    title: 'User updated',
                    description: `${payload.fullName} has been updated.`,
                });
            }

            setFormDialogOpen(false);
            setSelectedUser(null);
            await refreshAll();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Action failed';
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleDelete = async () => {
        if (!userToDelete) return;

        setActionLoadingId(userToDelete.id);
        try {
            const response = await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to delete user');
            }

            toast({
                title: 'User deleted',
                description: `${userToDelete.full_name || userToDelete.email} has been removed.`,
            });

            setUserToDelete(null);
            await refreshAll();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete user';
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6">
            <UsersPageHeader
                isRefreshing={isRefreshing}
                onRefresh={() => void refreshAll()}
                onAddUser={openCreateDialog}
            />

            <UserStatsCards summary={summary} loading={summaryLoading} />

            <Card className="border-border/50">
                <CardHeader className="space-y-4 pb-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-lg">Directory</CardTitle>
                            <CardDescription>Search, filter, and manage user accounts.</CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or role..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                <SelectItem value="admin">Admins</SelectItem>
                                <SelectItem value="manager">Managers</SelectItem>
                                <SelectItem value="user">Users</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error ? (
                        <ErrorDisplay error={error} onRetry={() => void fetchUsers()} />
                    ) : isLoading ? (
                        <ListSkeleton rows={6} />
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                            <Users className="h-10 w-10 opacity-40" />
                            <p className="font-medium text-foreground">No users found</p>
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <>
                            <UsersTable
                                users={users}
                                actionLoadingId={actionLoadingId}
                                onEdit={openEditDialog}
                                onDelete={setUserToDelete}
                            />
                            <PaginationFooter
                                page={page}
                                pageSize={pageSize}
                                total={total}
                                onPageChange={setPage}
                                pageSizeOptions={[5, 10, 20, 50]}
                                onPageSizeChange={(size) => {
                                    setPageSize(size);
                                    setPage(1);
                                }}
                                pageSizeLabel="Per page"
                                itemLabel="user"
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            <UserFormDialog
                open={formDialogOpen}
                mode={formMode}
                user={selectedUser}
                isSubmitting={isSubmittingForm}
                onOpenChange={(open) => {
                    setFormDialogOpen(open);
                    if (!open) setSelectedUser(null);
                }}
                onSubmit={handleFormSubmit}
            />

            <UserDeleteDialog
                user={userToDelete}
                isDeleting={actionLoadingId === userToDelete?.id}
                onOpenChange={(open) => {
                    if (!open) setUserToDelete(null);
                }}
                onConfirm={() => void handleDelete()}
            />
        </div>
    );
}

export default UsersManagement;
