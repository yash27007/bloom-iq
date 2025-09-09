'use client';

import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  SortingState,
} from '@tanstack/react-table';
import {
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Users
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTRPC } from '@/trpc/client';
import { Role } from '@/generated/prisma';
import AddUserDialog from './add-user-dialog';
import EditUserDialog from './edit-user-dialog';
import DeleteUserDialog from './delete-user-dialog';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  facultyId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  CourseCoordinatorCourses: {
    id: string;
    courseCode: string;
    courseName: string;
  }[];
  ModuleCoordinatorCourses: {
    id: string;
    courseCode: string;
    courseName: string;
  }[];
  ProgramCoordinatorCourses: {
    id: string;
    courseCode: string;
    courseName: string;
  }[];
};

const roleColors = {
  [Role.ADMIN]: 'bg-red-100 text-red-800',
  [Role.COURSE_COORDINATOR]: 'bg-blue-100 text-blue-800',
  [Role.MODULE_COORDINATOR]: 'bg-green-100 text-green-800',
  [Role.PROGRAM_COORDINATOR]: 'bg-purple-100 text-purple-800',
  [Role.CONTROLLER_OF_EXAMINATION]: 'bg-orange-100 text-orange-800',
};

export default function UserManagement() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');

  // Dialog states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users with tRPC
  const trpc = useTRPC();
  const { data: usersData, isLoading, refetch } = useQuery(
    trpc.admin.getUsers.queryOptions({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: globalFilter || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
      sortBy: sorting[0]?.id as 'firstName' | 'lastName' | 'email' | 'facultyId' | 'role' | 'createdAt' | 'updatedAt' | undefined,
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    })
  );

  const users = usersData?.data || [];
  const totalUsers = usersData?.pagination?.total || 0;
  const totalPages = usersData?.pagination?.totalPages || 0;

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'sno',
      header: 'S.No',
      cell: ({ row }) => pagination.pageIndex * pagination.pageSize + row.index + 1,
      enableSorting: false,
    },
    {
      accessorKey: 'facultyId',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Faculty ID
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            First Name
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: 'lastName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Last Name
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Email
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Role
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const role = row.getValue('role') as Role;
        return (
          <Badge className={roleColors[role]}>
            {role.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'courses',
      header: 'Assigned Courses',
      cell: ({ row }) => {
        const user = row.original;
        const allCourses = [
          ...user.CourseCoordinatorCourses,
          ...user.ModuleCoordinatorCourses,
          ...user.ProgramCoordinatorCourses,
        ];

        if (allCourses.length === 0) {
          return <span className="text-gray-500 text-sm">No courses assigned</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {allCourses.slice(0, 3).map((course, index) => (
              <Badge
                key={`${course.id}-${index}`}
                variant="secondary"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
              >
                {course.courseCode}
              </Badge>
            ))}
            {allCourses.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{allCourses.length - 3} more
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
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
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setEditUserOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUser(user);
                  setDeleteUserOpen(true);
                }}
                className="text-red-600"
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

  const table = useReactTable({
    data: users,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    pageCount: totalPages,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500">Manage system users and permissions</p>
          </div>
        </div>
        <Button
          onClick={() => setAddUserOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{totalUsers}</div>
          </CardContent>
        </Card>
        {Object.values(Role).map((role) => {
          return (
            <Card key={role} className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  {role.replace(/_/g, ' ')}
                </CardTitle>
                <Users className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">
                  {users.filter(user => user.role === role).length}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as Role | 'all')}
            >
              <SelectTrigger className="w-[200px] border-gray-300 focus:border-gray-400 focus:ring-gray-400">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.values(Role).map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-0">
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-gray-200">
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="font-medium text-gray-700">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse"></div>
                        <span>Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-gray-700">
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
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalUsers)} of{' '}
          {totalUsers} users
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="flex items-center space-x-1">
            <span className="text-sm">Page</span>
            <span className="text-sm font-medium">
              {pagination.pageIndex + 1} of {totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <AddUserDialog
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        onSuccess={() => {
          refetch();
          setAddUserOpen(false);
        }}
      />
      <EditUserDialog
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
        user={selectedUser}
        onSuccess={() => {
          refetch();
          setEditUserOpen(false);
          setSelectedUser(null);
        }}
      />
      <DeleteUserDialog
        open={deleteUserOpen}
        onOpenChange={setDeleteUserOpen}
        user={selectedUser}
        onSuccess={() => {
          refetch();
          setDeleteUserOpen(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}
