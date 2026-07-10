"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/components/admin/users/types';

interface UserDeleteDialogProps {
    user: UserProfile | null;
    isDeleting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function UserDeleteDialog({
    user,
    isDeleting,
    onOpenChange,
    onConfirm,
}: UserDeleteDialogProps) {
    return (
        <AlertDialog open={Boolean(user)} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete user</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete{' '}
                        <span className="font-medium text-foreground">{user?.full_name || user?.email}</span>?
                        This removes their login and marks the profile inactive. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(event) => {
                            event.preventDefault();
                            onConfirm();
                        }}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete user'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
