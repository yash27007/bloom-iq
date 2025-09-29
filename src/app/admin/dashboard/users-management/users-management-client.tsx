"use client";

import { AdvancedDataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { AddUserSheet, EditUserDialog, DeleteUserDialog } from "./user-management-components";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
// Client-side User type (without sensitive fields like password)
interface ClientUser {
    id: string;
    firstName: string;
    lastName: string;
    facultyId: string;
    email: string;
    role: string;
    designation: string;
    isActive: boolean;
    createdAt: Date;
    courseCoordinatorCourses?: Array<{ id: string; name: string; course_code: string }>;
    moduleCoordinatorCourses?: Array<{ id: string; name: string; course_code: string }>;
    programCoordinatorCourses?: Array<{ id: string; name: string; course_code: string }>;
}

interface UsersManagementClientProps {
    initialData: ClientUser[];
}

export function UsersManagementClient({ initialData }: UsersManagementClientProps) {
    const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const router = useRouter();
    const trpc = useTRPC();
    const addUserMutation = useMutation(trpc.admin.addUser.mutationOptions());
    const updateUserMutation = useMutation(trpc.admin.updateUser.mutationOptions());
    const deleteUserMutation = useMutation(trpc.admin.deleteUser.mutationOptions());

    const columns: ColumnDef<ClientUser>[] = [
        {
            accessorKey: "firstName",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    User
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {user.email}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "facultyId",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Faculty ID
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-mono text-xs bg-muted/50 px-2 py-1 rounded border max-w-fit">
                    {row.getValue("facultyId")}
                </div>
            ),
        },
        {
            accessorKey: "role",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Role & Designation
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const role = row.getValue("role") as string;
                const designation = row.original.designation;

                // Beautiful role badge styling with gradients and specific colors
                const getRoleBadgeStyles = (role: string) => {
                    switch (role) {
                        case "ADMIN":
                            return "bg-gradient-to-r from-red-500 to-pink-600 text-white border-0 shadow-md hover:shadow-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200";
                        case "COURSE_COORDINATOR":
                            return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200";
                        case "MODULE_COORDINATOR":
                            return "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200";
                        case "PROGRAM_COORDINATOR":
                            return "bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0 shadow-md hover:shadow-lg hover:from-purple-600 hover:to-violet-700 transition-all duration-200";
                        case "CONTROLLER_OF_EXAMINATION":
                            return "bg-gradient-to-r from-orange-500 to-amber-600 text-white border-0 shadow-md hover:shadow-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200";
                        default:
                            return "bg-gradient-to-r from-gray-500 to-slate-600 text-white border-0 shadow-md";
                    }
                };

                const formatRoleName = (role: string) => {
                    switch (role) {
                        case "COURSE_COORDINATOR":
                            return "Course Coordinator";
                        case "MODULE_COORDINATOR":
                            return "Module Coordinator";
                        case "PROGRAM_COORDINATOR":
                            return "Program Coordinator";
                        case "CONTROLLER_OF_EXAMINATION":
                            return "Controller of Examination";
                        case "ADMIN":
                            return "Administrator";
                        default:
                            return role.replace(/_/g, " ");
                    }
                };

                return (
                    <div className="flex flex-col gap-1.5">
                        <Badge
                            className={`max-w-fit px-2.5 py-1 text-xs font-medium ${getRoleBadgeStyles(role)}`}
                        >
                            {formatRoleName(role)}
                        </Badge>
                        <div className="text-xs text-muted-foreground font-medium">
                            {designation.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                    </div>
                );
            },
        },
        {
            id: "courseAssigned",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Course Assigned
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const user = row.original;
                const allCourses = [
                    ...(user.courseCoordinatorCourses || []),
                    ...(user.moduleCoordinatorCourses || []),
                    ...(user.programCoordinatorCourses || [])
                ];



                if (allCourses.length === 0) {
                    return (
                        <div className="text-xs text-muted-foreground italic">
                            No courses assigned
                        </div>
                    );
                }

                const displayCourse = allCourses[0];
                const additionalCount = allCourses.length - 1;

                return (
                    <div className="flex flex-col gap-1 m-2">
                        <div className="text-sm font-medium text-foreground">
                            {displayCourse.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                            {displayCourse.course_code}
                        </div>
                        {additionalCount > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                                +{additionalCount} more course{additionalCount > 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Status
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const isActive = row.getValue("isActive") as boolean;

                return (
                    <div className={`flex items-center gap-2 ${!isActive ? 'opacity-75' : ''}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'} shadow-sm`} />
                        <Badge
                            variant={isActive ? "default" : "destructive"}
                            className={isActive
                                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 font-medium"
                                : "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 font-medium shadow-sm"
                            }
                        >
                            {isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Created At
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const date = row.getValue("createdAt") as Date;
                const formattedDate = new Date(date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
                const daysDiff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="text-sm text-foreground">
                            {formattedDate}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {daysDiff < 30 ? relativeTime.format(-daysDiff, 'day') : ''}
                        </div>
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedUser(user);
                                    setEditDialogOpen(true);
                                }}
                                className="cursor-pointer"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedUser(user);
                                    setDeleteDialogOpen(true);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <div className="flex flex-col gap-6 h-full">
            <AdvancedDataTable
                columns={columns}
                data={initialData}
                searchKeys={["firstName", "lastName", "email", "facultyId"] as Array<keyof ClientUser>}
                searchPlaceholder="Search users by name, email, or faculty ID..."
                title="User Management"
                description={`Manage all users in the system. ${initialData.length} users total (${initialData.filter(u => u.isActive).length} active, ${initialData.filter(u => !u.isActive).length} inactive).`}
                onAdd={() => document.getElementById("add-user-trigger")?.click()}
                addLabel="Add User"
                filterOptions={[
                    {
                        key: "role",
                        label: "Role",
                        options: [
                            { label: "Administrator", value: "ADMIN" },
                            { label: "Course Coordinator", value: "COURSE_COORDINATOR" },
                            { label: "Module Coordinator", value: "MODULE_COORDINATOR" },
                            { label: "Program Coordinator", value: "PROGRAM_COORDINATOR" },
                            { label: "Controller of Examination", value: "CONTROLLER_OF_EXAMINATION" },
                        ]
                    },
                    {
                        key: "isActive",
                        label: "Status",
                        options: [
                            { label: "Active Users", value: "true" },
                            { label: "Inactive Users", value: "false" },
                        ]
                    }
                ]}
                emptyState={{
                    title: "No users found",
                    description: "Get started by creating your first user account.",
                    action: (
                        <AddUserSheet
                            onSubmit={async (data) => {
                                try {
                                    const result = await addUserMutation.mutateAsync(data);
                                    toast.success(result?.message || "User created successfully!");
                                    router.refresh(); // Refresh the page to show the new user
                                } catch (error) {
                                    console.error('Error creating user:', error);
                                    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while creating the user";
                                    toast.error(errorMessage);
                                }
                            }}
                        >
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First User
                            </Button>
                        </AddUserSheet>
                    )
                }}
            />

            {/* Hidden trigger for the add button in the toolbar */}
            <AddUserSheet
                onSubmit={async (data) => {
                    try {
                        const result = await addUserMutation.mutateAsync(data);
                        toast.success(result?.message || "User created successfully!");
                        router.refresh(); // Refresh the page to show the new user
                    } catch (error) {
                        console.error('Error creating user:', error);
                        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while creating the user";
                        toast.error(errorMessage);
                    }
                }}
            >
                <div id="add-user-trigger" style={{ display: 'none' }} />
            </AddUserSheet>

            {/* Dialogs */}
            {selectedUser && (
                <>
                    <EditUserDialog
                        user={selectedUser}
                        open={editDialogOpen}
                        onClose={() => {
                            setEditDialogOpen(false);
                            setSelectedUser(null);
                        }}
                        onSubmit={async (data) => {
                            if (!selectedUser) return;

                            try {
                                await updateUserMutation.mutateAsync({
                                    id: selectedUser.id,
                                    ...data,
                                });

                                toast.success("User updated successfully!");
                                router.refresh(); // Refresh to show updated data
                                setEditDialogOpen(false);
                                setSelectedUser(null);
                            } catch (error) {
                                // Error is already handled by the EditUserDialog component
                                console.error('Update failed:', error);
                            }
                        }}
                    />
                    <DeleteUserDialog
                        user={selectedUser}
                        open={deleteDialogOpen}
                        onClose={() => {
                            setDeleteDialogOpen(false);
                            setSelectedUser(null);
                        }}
                        onConfirm={async () => {
                            if (!selectedUser) return;

                            try {
                                await deleteUserMutation.mutateAsync({ id: selectedUser.id });
                                toast.success("User deleted successfully!");
                                router.refresh(); // Refresh to show updated data
                                setDeleteDialogOpen(false);
                                setSelectedUser(null);
                            } catch (error) {
                                console.error('Delete failed:', error);
                                const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
                                toast.error(errorMessage);
                            }
                        }}
                    />
                </>
            )}
        </div>
    );
}