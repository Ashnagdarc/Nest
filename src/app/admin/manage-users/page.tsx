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

    // IMPORTANT: Deleting Supabase Auth users requires admin privileges.
    // This should ideally be done via a Supabase Edge Function for security.
    // Directly calling admin methods from the client is insecure.
    // The code below ONLY deletes the profile row.

    try {
      // **Placeholder for Edge Function call:**
      // const response = await fetch('/api/admin/delete-user', { // Your API route calling the Edge Function
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId: userToDelete.id }),
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to delete Supabase Auth user');
      // }
      // console.log("[ManageUsers] Supabase Auth user deletion successful (via Edge Function).");

      // Delete Supabase profile row
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (deleteError) {
        console.error("[ManageUsers] Error deleting Supabase profile row:", deleteError);
        throw new Error(`Failed to delete user profile: ${deleteError.message}`);
      }
      console.log("[ManageUsers] Supabase profile row deleted.");

      toast({ title: "Success", description: `User profile for ${userToDelete.full_name} deleted. Remember to implement Auth user deletion via an Edge Function.` });
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

  const filteredUsers = users.filter(user =>
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
        {/* TODO: Implement Admin Add User functionality securely via Edge Function */}
        <Button disabled>
          <UserPlus className="mr-2 h-4 w-4" /> Add New User (Requires Edge Function)
        </Button>
        {/*
         <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
           <DialogTrigger asChild>
             <Button>
               <UserPlus className="mr-2 h-4 w-4" /> Add New User
             </Button>
           </DialogTrigger>
           <DialogContent className="sm:max-w-[625px]">
             <DialogHeader>
               <DialogTitle>Add New User</DialogTitle>
               <DialogDescription>
                 Create a new user account. Requires Supabase Edge Function setup.
               </DialogDescription>
             </DialogHeader>
              <AddUserForm onUserAdded={handleUserAdded} /> // Needs adaptation for Supabase
           </DialogContent>
         </Dialog>
          */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>View, search, and manage user accounts.</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="icon" disabled>
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filter Users</span>
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
              <RotateCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AlertDialog open={!!userToDelete || !!userToUpdate} onOpenChange={(open) => !open && (setUserToDelete(null), setUserToUpdate(null), setUpdateAction(null))}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto"
            >
              {/* --- Confirmation Dialog Content --- */}
              <AlertDialogContent>
                {confirmationDetails && (
                  <>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{confirmationDetails.title}</AlertDialogTitle>
                      <AlertDialogDescription>{confirmationDetails.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => (setUserToDelete(null), setUserToUpdate(null), setUpdateAction(null))} disabled={isLoading}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={confirmationDetails.onConfirm}
                        className={buttonVariants({ variant: confirmationDetails.actionVariant })}
                        disabled={isLoading}
                      >
                        {isLoading ? "Processing..." : confirmationDetails.actionText}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </>
                )}
              </AlertDialogContent>

              {/* --- User Table --- */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRefreshing ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <RotateCcw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Refreshing user list...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <motion.tr key={user.id} variants={itemVariants}>
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{user.department || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          {/* Prevent actions on self */}
                          {user.id !== currentAdminId ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditUser(user.id)} disabled>
                                  <Edit className="mr-2 h-4 w-4" /> Edit Details (NYI)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status === 'Active' ? (
                                  <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'suspend')} className="text-orange-600 focus:text-orange-600 focus:bg-orange-100/50 cursor-pointer">
                                    <UserX className="mr-2 h-4 w-4" /> Suspend User
                                  </DropdownMenuItem>
                                ) : user.status === 'Inactive' ? (
                                  <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'activate')} className="text-green-600 focus:text-green-600 focus:bg-green-100/50 cursor-pointer">
                                    <UserCheck className="mr-2 h-4 w-4" /> Activate User
                                  </DropdownMenuItem>
                                ) : null}
                                {user.role === 'User' ? (
                                  <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'makeAdmin')} className="text-blue-600 focus:text-blue-600 focus:bg-blue-100/50 cursor-pointer">
                                    <ShieldCheck className="mr-2 h-4 w-4" /> Promote to Admin
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => confirmUpdateUser(user, 'makeUser')} className="text-purple-600 focus:text-purple-600 focus:bg-purple-100/50 cursor-pointer" disabled={users.filter(u => u.role === 'Admin').length <= 1}>
                                    <ShieldOff className="mr-2 h-4 w-4" /> Change to User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {/* Trigger deletion confirmation dialog */}
                                <AlertDialogTrigger asChild disabled={user.role === 'Admin' && users.filter(u => u.role === 'Admin').length <= 1}>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                    onSelect={(e) => { e.preventDefault(); confirmDeleteUser(user); }}
                                    disabled={user.role === 'Admin' && users.filter(u => u.role === 'Admin').length <= 1}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User Profile (Requires Server Action)
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Current User</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No users found matching your criteria or no users exist yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </motion.div>
          </AlertDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
}
