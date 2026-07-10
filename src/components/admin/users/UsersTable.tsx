"use client";

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { RoleBadge, StatusBadge } from '@/components/admin/users/user-badges';
import type { UserProfile } from '@/components/admin/users/types';
import { getUserInitials } from '@/components/admin/users/user-utils';

interface UsersTableProps {
    users: UserProfile[];
    actionLoadingId: string | null;
    onEdit: (user: UserProfile) => void;
    onDelete: (user: UserProfile) => void;
}

export function UsersTable({ users, actionLoadingId, onEdit, onDelete }: UsersTableProps) {
    return (
        <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-9 text-xs">User</TableHead>
                        <TableHead className="h-9 text-xs">Email</TableHead>
                        <TableHead className="h-9 text-xs">Role</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                        <TableHead className="hidden h-9 text-xs md:table-cell">Joined</TableHead>
                        <TableHead className="h-9 w-[72px] text-right text-xs">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id} className="text-sm">
                            <TableCell className="py-2.5">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                            {getUserInitials(user.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.full_name || 'Unnamed user'}</span>
                                </div>
                            </TableCell>
                            <TableCell className="py-2.5 text-muted-foreground">{user.email || '—'}</TableCell>
                            <TableCell className="py-2.5">
                                <RoleBadge role={user.role} />
                            </TableCell>
                            <TableCell className="py-2.5">
                                <StatusBadge status={user.status} />
                            </TableCell>
                            <TableCell className="hidden py-2.5 text-muted-foreground md:table-cell">
                                {user.created_at
                                    ? new Date(user.created_at).toLocaleDateString()
                                    : '—'}
                            </TableCell>
                            <TableCell className="py-2.5 text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            disabled={actionLoadingId === user.id}
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(user)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => onDelete(user)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
