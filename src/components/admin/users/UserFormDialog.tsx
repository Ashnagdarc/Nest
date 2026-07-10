"use client";

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { strongPasswordSchema } from '@/lib/auth/password-schema';
import type { UserProfile, UserRole, UserStatus } from '@/components/admin/users/types';
import { USER_ROLES, USER_STATUSES } from '@/components/admin/users/types';
import { normalizeUserRole, normalizeUserStatus } from '@/components/admin/users/user-utils';

const editUserSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Enter a valid email address.' }),
    role: z.enum(['Admin', 'User', 'Manager']),
    status: z.enum(['Active', 'Inactive', 'Suspended']),
});

const createUserSchema = editUserSchema
    .extend({
        password: strongPasswordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
    });

type EditUserFormValues = z.infer<typeof editUserSchema>;
type CreateUserFormValues = z.infer<typeof createUserSchema>;

export interface UserFormSubmitPayload {
    fullName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    password?: string;
}

interface UserFormDialogProps {
    open: boolean;
    mode: 'create' | 'edit';
    user?: UserProfile | null;
    isSubmitting: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: UserFormSubmitPayload) => Promise<void>;
}

function UserFormDialogBody({
    mode,
    user,
    isSubmitting,
    onOpenChange,
    onSubmit,
}: Omit<UserFormDialogProps, 'open'>) {
    const isCreate = mode === 'create';

    const form = useForm<CreateUserFormValues | EditUserFormValues>({
        resolver: zodResolver(isCreate ? createUserSchema : editUserSchema),
        defaultValues: {
            fullName: user?.full_name || '',
            email: user?.email || '',
            role: normalizeUserRole(user?.role),
            status: normalizeUserStatus(user?.status),
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        form.reset({
            fullName: user?.full_name || '',
            email: user?.email || '',
            role: normalizeUserRole(user?.role),
            status: normalizeUserStatus(user?.status),
            password: '',
            confirmPassword: '',
        });
    }, [user, form]);

    const handleSubmit = form.handleSubmit(async (values) => {
        await onSubmit({
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            role: values.role,
            status: values.status,
            password: 'password' in values ? values.password : undefined,
        });
    });

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Jane Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="jane@company.com"
                                            readOnly={!isCreate}
                                            className={!isCreate ? 'bg-muted' : undefined}
                                            {...field}
                                        />
                                    </FormControl>
                                    {!isCreate ? (
                                        <p className="text-xs text-muted-foreground">
                                            Email cannot be changed here.
                                        </p>
                                    ) : null}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {USER_ROLES.map((role) => (
                                                    <SelectItem key={role} value={role}>
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {USER_STATUSES.map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {isCreate ? (
                            <>
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" autoComplete="new-password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm password</FormLabel>
                                            <FormControl>
                                                <Input type="password" autoComplete="new-password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : null}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : isCreate ? (
                                    'Create user'
                                ) : (
                                    'Save changes'
                                )}
                            </Button>
                        </DialogFooter>
            </form>
        </Form>
    );
}

export function UserFormDialog({
    open,
    mode,
    user,
    isSubmitting,
    onOpenChange,
    onSubmit,
}: UserFormDialogProps) {
    const isCreate = mode === 'create';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isCreate ? 'Add user' : 'Edit user'}</DialogTitle>
                    <DialogDescription>
                        {isCreate
                            ? 'Create a new account with login credentials.'
                            : 'Update profile details, role, and account status.'}
                    </DialogDescription>
                </DialogHeader>

                {open ? (
                    <UserFormDialogBody
                        key={`${mode}-${user?.id ?? 'new'}`}
                        mode={mode}
                        user={user}
                        isSubmitting={isSubmitting}
                        onOpenChange={onOpenChange}
                        onSubmit={onSubmit}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
