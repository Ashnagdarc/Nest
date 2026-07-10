"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    getBlockedAccountMessage,
    type BlockedAccountStatus,
} from '@/lib/auth/account-status';

interface AccountBlockedDialogProps {
    open: boolean;
    status: BlockedAccountStatus;
    fullName?: string | null;
    onClose: () => void;
}

export function AccountBlockedDialog({
    open,
    status,
    fullName,
    onClose,
}: AccountBlockedDialogProps) {
    const copy = getBlockedAccountMessage(status, fullName);

    return (
        <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{copy.title}</AlertDialogTitle>
                    <AlertDialogDescription>{copy.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
