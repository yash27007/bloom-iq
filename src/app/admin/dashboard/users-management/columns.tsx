"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, Edit, Trash } from "lucide-react"

// Type that matches the actual API response
export type UserTableData = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    facultyId: string;
    role: string;
    designation: string;
    isActive: boolean;
    courseCoordinatorCourses?: Array<{ id: string; course_code: string; name: string }>;
    moduleCoordinatorCourses?: Array<{ id: string; course_code: string; name: string }>;
    programCoordinatorCourses?: Array<{ id: string; course_code: string; name: string }>;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ColumnsProps {
    onEdit: (user: UserTableData) => void;
    onDelete: (user: UserTableData) => void;
}

export const createColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<UserTableData>[] => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "facultyId",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Faculty ID
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        }
    },
    {
        accessorKey: "firstName",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{`${user.firstName} ${user.lastName}`}</span>
                    <span className="text-sm text-muted-foreground">{user.facultyId}</span>
                </div>
            );
        }
    },
    {
        accessorKey: "email",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        }
    },
    {
        accessorKey: "designation",
        header: "Designation",
        cell: ({ getValue }) => {
            const designation = getValue() as string;
            return (
                <Badge variant="outline">
                    {designation.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
            );
        }
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ getValue }) => {
            const role = getValue() as string;
            const roleColors = {
                ADMIN: "destructive",
                COURSE_COORDINATOR: "default",
                MODULE_COORDINATOR: "secondary",
                PROGRAM_COORDINATOR: "default",
                CONTROLLER_OF_EXAMINATION: "default",
            } as const;

            return (
                <Badge variant={roleColors[role as keyof typeof roleColors] || "default"}>
                    {role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        id: "courses",
        header: "Assigned Course",
        cell: ({ row }) => {
            const user = row.original;
            const allCourses = [
                ...(user.courseCoordinatorCourses || []),
                ...(user.moduleCoordinatorCourses || []),
                ...(user.programCoordinatorCourses || [])
            ];

            if (allCourses.length === 0) {
                return <span className="text-muted-foreground">No course assigned</span>;
            }

            // Based on your requirement: each user can have only one course
            const course = allCourses[0];
            return (
                <Badge variant="outline" className="text-xs">
                    {course.course_code}
                </Badge>
            );
        }
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const user = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(user.email)}
                        >
                            Copy email address
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onEdit(user)}
                            className="cursor-pointer"
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit user
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(user)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                        >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete user
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]