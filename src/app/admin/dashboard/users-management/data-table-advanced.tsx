"use client"

import * as React from "react"
import {
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AddUserSheet, EditUserDialog, DeleteUserDialog } from "./user-management-components"
import { createColumns, UserTableData } from "./columns"
import { useTRPC } from "@/trpc/client"
import { toast } from "sonner"
import { useMutation } from "@tanstack/react-query"

interface DataTableAdvancedProps {
    initialData: UserTableData[]
}

export function DataTableAdvanced({ initialData }: DataTableAdvancedProps) {
    const [data, setData] = React.useState<UserTableData[]>(initialData)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const [selectedUser, setSelectedUser] = React.useState<UserTableData | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
    const [userToDelete, setUserToDelete] = React.useState<UserTableData | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

    const trpc = useTRPC()
    const updateUserMutation = useMutation(trpc.admin.updateUser.mutationOptions())
    const deleteUserMutation = useMutation(trpc.admin.deleteUser.mutationOptions())
    const addUserMutation = useMutation(trpc.admin.addUser.mutationOptions())

    const handleEditUser = (user: UserTableData) => {
        setSelectedUser(user)
        setIsEditDialogOpen(true)
    }

    const handleDeleteUser = (user: UserTableData) => {
        setUserToDelete(user)
        setIsDeleteDialogOpen(true)
    }

    const handleAddUser = async (formData: {
        firstName: string;
        lastName: string;
        email: string;
        facultyId: string;
        role: "ADMIN" | "COURSE_COORDINATOR" | "MODULE_COORDINATOR" | "PROGRAM_COORDINATOR" | "CONTROLLER_OF_EXAMINATION";
        designation: "ASSISTANT_PROFESSOR" | "ASSOCIATE_PROFESSOR" | "PROFESSOR";
        password?: string;
    }) => {
        try {
            // Ensure password is provided for new users
            if (!formData.password) {
                throw new Error("Password is required for new users")
            }

            const result = await addUserMutation.mutateAsync({
                ...formData,
                password: formData.password
            })

            if (result?.success && result?.data) {
                // Add the new user to local state
                setData(prev => [...prev, result.data as UserTableData])
                toast.success(result.message || "User created successfully")
            }
        } catch (_error) {
            toast.error("Failed to create user")
            throw _error
        }
    }

    const handleUpdateUser = async (formData: Partial<{
        firstName: string;
        lastName: string;
        email: string;
        facultyId: string;
        role: "ADMIN" | "COURSE_COORDINATOR" | "MODULE_COORDINATOR" | "PROGRAM_COORDINATOR" | "CONTROLLER_OF_EXAMINATION";
        designation: "ASSISTANT_PROFESSOR" | "ASSOCIATE_PROFESSOR" | "PROFESSOR";
    }>) => {
        if (!selectedUser) return

        try {
            await updateUserMutation.mutateAsync({
                id: selectedUser.id,
                ...formData
            })
            // Update local state
            setData(prev => prev.map(user =>
                user.id === selectedUser.id
                    ? { ...user, ...formData }
                    : user
            ))
            setIsEditDialogOpen(false)
            setSelectedUser(null)
            toast.success("User updated successfully")
        } catch (_error) {
            toast.error("Failed to update user")
            throw _error
        }
    }

    const handleConfirmDelete = async () => {
        if (!userToDelete) return

        try {
            await deleteUserMutation.mutateAsync({ id: userToDelete.id })
            setData(prev => prev.filter(u => u.id !== userToDelete.id))
            setIsDeleteDialogOpen(false)
            setUserToDelete(null)
            toast.success("User deleted successfully")
        } catch (_error) {
            toast.error("Failed to delete user")
        }
    }

    const columns = React.useMemo(() => createColumns({
        onEdit: handleEditUser,
        onDelete: handleDeleteUser
    }), [])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    })

    return (
        <div className="w-full">
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center space-x-2">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(String(event.target.value))}
                            className="pl-8"
                        />
                    </div>
                    <Select
                        value={(table.getColumn("role")?.getFilterValue() as string) ?? "all"}
                        onValueChange={(value) =>
                            table.getColumn("role")?.setFilterValue(value === "all" ? undefined : value)
                        }
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="COURSE_COORDINATOR">Course Coordinator</SelectItem>
                            <SelectItem value="MODULE_COORDINATOR">Module Coordinator</SelectItem>
                            <SelectItem value="PROGRAM_COORDINATOR">Program Coordinator</SelectItem>
                            <SelectItem value="CONTROLLER_OF_EXAMINATION">Controller</SelectItem>
                        </SelectContent>
                    </Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <AddUserSheet onSubmit={handleAddUser}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </AddUserSheet>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to first page</span>
                            «
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <span className="sr-only">Go to previous page</span>
                            ‹
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to next page</span>
                            ›
                        </Button>
                        <Button
                            variant="outline"
                            className="hidden h-8 w-8 p-0 lg:flex"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <span className="sr-only">Go to last page</span>
                            »
                        </Button>
                    </div>
                </div>
            </div>

            {/* Edit User Dialog */}
            <EditUserDialog
                user={selectedUser}
                open={isEditDialogOpen}
                onClose={() => {
                    setIsEditDialogOpen(false)
                    setSelectedUser(null)
                }}
                onSubmit={handleUpdateUser}
            />

            {/* Delete User Dialog */}
            <DeleteUserDialog
                user={userToDelete}
                open={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false)
                    setUserToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
            />
        </div>
    )
}