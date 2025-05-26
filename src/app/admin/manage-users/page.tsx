"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, UserPlus, Filter, UserCheck, UserX, ShieldCheck, ShieldOff, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export default function ManageUsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [userToUpdate, setUserToUpdate] = useState<Profile | null>(null);
  const [updateAction, setUpdateAction] = useState<'suspend' | 'activate' | 'makeAdmin' | 'makeUser' | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log("[ManageUsers] Current admin ID:", user.id);
        setCurrentAdminId(user.id);
      } else {
        setCurrentAdminId(null);
        console.log("[ManageUsers] No admin user authenticated.");
        // Optionally redirect if not admin or not logged in
        // router.push('/login?error=notadmin');
      }
    }
    fetchCurrentUser();
  }, [supabase.auth]);


  const fetchUsers = useCallback(async () => {
    console.log("[ManageUsers] fetchUsers triggered.");
    setIsRefreshing(true);
    // Simulate delay for visual feedback if needed
    // await new Promise(res => setTimeout(res, 300));
    try {
      console.log("[ManageUsers] Fetching profiles from Supabase...");
      // Fetch users from the 'profiles' table, requires RLS policy allowing admins to select all
      const { data: fetchedUsers, error } = await supabase
        .from('profiles')
        .select('*') // Select all profile fields
        .order('updated_at', { ascending: false }); // Example ordering

      if (error) {
        console.error("[ManageUsers] Supabase fetch error:", error);
        toast({ title: "Error", description: `Could not fetch user list: ${error.message}`, variant: "destructive" });
        setUsers([]); // Clear users on error
        // Handle specific errors like RLS violation
        if (error.message.includes("security policies")) {
          toast({ title: "Permission Denied", description: "You might not have permission to view all users. Check RLS policies.", variant: "destructive", duration: 7000 });
        }
        return; // Stop execution if fetch failed
      }

      setUsers(fetchedUsers || []);
      console.log(`[ManageUsers] Fetched ${fetchedUsers?.length || 0} users successfully.`);

    } catch (error: any) {
      // Catch unexpected errors during fetch process
      console.error("[ManageUsers] Catch block: Error fetching users:", error);
      toast({ title: "Error", description: `Could not fetch user list: ${error.message || 'Unexpected error'}`, variant: "destructive" });
      setUsers([]); // Reset users on error
    } finally {
      console.log("[ManageUsers] fetchUsers finished.");
      setIsRefreshing(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    console.log("[ManageUsers] Component mounted, fetching initial users.");
    fetchUsers();
  }, [fetchUsers]); // Fetch on initial mount and if fetchUsers changes

  const handleRefresh = () => {
    console.log("[ManageUsers] Refresh button clicked.");
    fetchUsers();
  }

  // Callback after adding a user (if AddUserForm is implemented with Supabase Edge Function)
  const handleUserAdded = (newUser: Profile) => {
    console.log("[ManageUsers] User added callback triggered (refetching list)...", newUser);
    // Adding users client-side is generally discouraged due to security implications.
    // A Supabase Edge Function is the recommended way to securely add users from admin panel.
    fetchUsers(); // Refetch the list to include the new user
    setIsAddUserModalOpen(false);
  };

  // --- Action Handlers ---

  const handleEditUser = (userId: string) => {
    console.log("[ManageUsers] Edit user clicked:", userId);
    toast({ title: "Info", description: "Edit user functionality needs implementation (e.g., open a modal)." });
    // TODO: Implement opening an edit modal, pre-filled with user data from Supabase
  };

  const confirmDeleteUser = (user: Profile) => {
    console.log("[ManageUsers] confirmDeleteUser for:", user.email);
    if (user.id === currentAdminId) {
      toast({ title: "Action Denied", description: "You cannot delete your own account.", variant: "destructive" });
      return;
    }
    // Prevent deleting the last admin
    const adminUsers = users.filter(u => u.role === 'Admin');
    if (user.role === 'Admin' && adminUsers.length <= 1) {
      toast({ title: "Action Denied", description: "Cannot delete the last admin user.", variant: "destructive" });
      return;
    }
    setUserToDelete(user);
  };

  const confirmUpdateUser = (user: Profile, action: 'suspend' | 'activate' | 'makeAdmin' | 'makeUser') => {
    console.log(`[ManageUsers] confirmUpdateUser for: ${user.email}, action: ${action}`);

    if (user.id === currentAdminId && (action === 'suspend' || action === 'makeUser')) {
      toast({ title: "Action Denied", description: `You cannot ${action === 'suspend' ? 'suspend' : 'change the role of'} your own account.`, variant: "destructive" });
      return;
    }
    // Prevent demoting the last admin
    const adminUsers = users.filter(u => u.role === 'Admin');
    if (action === 'makeUser' && user.role === 'Admin' && adminUsers.length <= 1) {
      toast({ title: "Action Denied", description: "Cannot demote the last admin user.", variant: "destructive" });
      return;
    }
    setUserToUpdate(user);
    setUpdateAction(action);
  }

  // Handle final deletion after confirmation
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsLoading(true);
    console.log("[ManageUsers] Attempting to delete user ID:", userToDelete.id);

    try {
      // Call the Edge Function to delete the user
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      console.log("[ManageUsers] User deletion successful");
      toast({ title: "Success", description: `User ${userToDelete.full_name} has been deleted.` });
      fetchUsers(); // Refetch list

    } catch (error: any) {
      console.error("[ManageUsers] Error during user deletion process:", error);
      toast({ title: "Error", description: error.message || "Could not delete user.", variant: "destructive" });
    } finally {
      setUserToDelete(null);
      setIsLoading(false);
    }
  };

  // Handle status/role update after confirmation
  const handleUpdateUser = async () => {
    if (!userToUpdate || !updateAction) return;
    setIsLoading(true);
    console.log(`[ManageUsers] Updating user ${userToUpdate.email}, action: ${updateAction}`);

    let updateData: ProfileUpdate = {};
    let successMessage = "";

    switch (updateAction) {
      case 'suspend':
        updateData = { status: 'Inactive' };
        successMessage = `User ${userToUpdate.full_name} suspended.`;
        // Consider disabling the Supabase Auth user via Edge Function as well
        break;
      case 'activate':
        updateData = { status: 'Active' };
        successMessage = `User ${userToUpdate.full_name} activated.`;
        // Consider enabling the Supabase Auth user via Edge Function if needed
        break;
      case 'makeAdmin':
        updateData = { role: 'Admin' };
        successMessage = `User ${userToUpdate.full_name} promoted to Admin.`;
        break;
      case 'makeUser':
        updateData = { role: 'User' };
        successMessage = `User ${userToUpdate.full_name} changed to User role.`;
        break;
    }

    try {
      console.log("[ManageUsers] Sending update to Supabase profiles:", updateData);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(), // Update timestamp
        })
        .eq('id', userToUpdate.id);

      if (updateError) {
        console.error("[ManageUsers] Supabase profile update error:", updateError);
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      console.log("[ManageUsers] User update successful in Supabase.");
      toast({ title: "Success", description: successMessage });
      fetchUsers(); // Refetch the user list

    } catch (error: any) {
      console.error("[ManageUsers] Catch block: Error updating user:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update user.", variant: "destructive" });
      fetchUsers(); // Refetch list even on error
    } finally {
      setUserToUpdate(null);
      setUpdateAction(null);
      setIsLoading(false);
    }
  }

  const getStatusBadge = (status: Profile['status']) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><UserCheck className="mr-1 h-3 w-3" /> Active</Badge>;
      case 'Inactive':
        return <Badge variant="destructive"><UserX className="mr-1 h-3 w-3" /> Inactive</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const getRoleBadge = (role: Profile['role']) => {
    return (
      <Badge variant={role === 'Admin' ? 'default' : 'secondary'} className="capitalize">
        {role === 'Admin' ? <ShieldCheck className="mr-1 h-3 w-3" /> : null}
        {role || 'Unknown'}
      </Badge>
    );
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const getConfirmationDetails = () => {
    if (userToDelete) {
      return {
        title: "Are you absolutely sure?",
        description: `This action will delete the profile row for ${userToDelete.full_name} (${userToDelete.email}). Deleting the actual Supabase Authentication user requires a separate server-side action (Edge Function).`,
        actionText: "Confirm Profile Deletion",
        actionVariant: "destructive" as "destructive",
        onConfirm: handleDeleteUser
      }
    }
    if (userToUpdate && updateAction) {
      let actionDesc = "";
      let actionButtonText = "";
      let actionVariant: "destructive" | "default" = "default";
      switch (updateAction) {
        case 'suspend': actionDesc = `suspend the account for ${userToUpdate.full_name}`; actionButtonText = "Suspend User"; actionVariant = "destructive"; break;
        case 'activate': actionDesc = `reactivate the account for ${userToUpdate.full_name}`; actionButtonText = "Activate User"; break;
        case 'makeAdmin': actionDesc = `promote ${userToUpdate.full_name} to an Admin role`; actionButtonText = "Promote to Admin"; break;
        case 'makeUser': actionDesc = `change the role of ${userToUpdate.full_name} to a standard User`; actionButtonText = "Change to User"; actionVariant = "destructive"; break;
      }
      return {
        title: "Confirm Action",
        description: `Are you sure you want to ${actionDesc}?`,
        actionText: actionButtonText,
        actionVariant: actionVariant,
        onConfirm: handleUpdateUser
      }
    }
    return null;
  }
  const confirmationDetails = getConfirmationDetails();

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (user.full_name || '').toLowerCase().includes(searchLower) ||
      (user.email || '').toLowerCase().includes(searchLower) ||
      (user.department || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
        <Button
          onClick={() => setIsAddUserModalOpen(true)}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Add New User</span>
          <span className="sm:hidden">Add New User</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">User List</CardTitle>
          <CardDescription>View, search, and manage user accounts.</CardDescription>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="h-10 px-3 ml-auto"
                disabled={isRefreshing}
              >
                <RotateCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isRefreshing && users.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found matching your search criteria.</p>
              {searchTerm && (
                <Button
                  variant="link"
                  onClick={() => setSearchTerm('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle px-6">
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Department</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{user.full_name || 'Unnamed User'}</span>
                              {/* Mobile-only email display */}
                              <span className="text-xs text-muted-foreground md:hidden">
                                {user.email || 'No email'}
                              </span>
                              {/* Mobile-only status & role badges */}
                              <div className="flex gap-2 mt-1 sm:hidden">
                                {getStatusBadge(user.status)}
                                {getRoleBadge(user.role)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                          <TableCell className="hidden lg:table-cell">{user.department || 'N/A'}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />

                                  {user.status === 'Active' ? (
                                    <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'suspend')}>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Suspend User
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'activate')}>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Activate User
                                    </DropdownMenuItem>
                                  )}

                                  {user.role === 'User' ? (
                                    <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'makeAdmin')}>
                                      <ShieldCheck className="mr-2 h-4 w-4" />
                                      Make Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'makeUser')}>
                                      <ShieldOff className="mr-2 h-4 w-4" />
                                      Remove Admin
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => confirmDeleteUser(user)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationDetails()?.description ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update status/role confirmation dialog */}
      <AlertDialog open={!!userToUpdate && !!updateAction} onOpenChange={(open) => !open && (setUserToUpdate(null), setUpdateAction(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm User Update</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationDetails()?.description ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateUser}
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add user dialog - stubbed since likely using Edge Function */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              This feature requires creating a Supabase Edge Function to securely create new users.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 px-2 bg-muted/30 rounded-md border border-muted mt-4">
            <div className="text-center">
              <UserPlus className="h-10 w-10 mx-auto text-primary/50 mb-4" />
              <h3 className="text-lg font-medium">Edge Function Required</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Adding users requires admin API access, which should be implemented as a Supabase Edge Function for security.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline" onClick={() => setIsAddUserModalOpen(false)}>Cancel</Button>
                <a
                  href="https://supabase.com/docs/guides/functions"
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "default" })}
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
