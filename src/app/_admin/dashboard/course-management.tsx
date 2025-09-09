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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  BookOpen,
  HelpCircle,
  FileText,
  GraduationCap
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTRPC } from '@/trpc/client';
import AddCourseDialog from './add-course-dialog';
import EditCourseDialog from './edit-course-dialog';
import DeleteCourseDialog from './delete-course-dialog';

// API response type with included relations
type CourseWithRelations = {
  id: string;
  courseCode: string;
  courseName: string;
  courseCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  moduleCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  programCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  _count: {
    questions: number;
    materials: number;
    paperPatterns: number;
    generatedPapers: number;
  };
};

export default function CourseManagement() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Dialog states
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithRelations | null>(null);

  // Fetch courses with tRPC
  const trpc = useTRPC();
  const { data: coursesData, isLoading, refetch } = useQuery(
    trpc.admin.getCourses.queryOptions({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      search: globalFilter || undefined,
      sortBy: sorting[0]?.id as 'courseCode' | 'courseName' | undefined,
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    })
  );

  const courses = coursesData?.data || [];
  const totalCourses = coursesData?.pagination?.total || 0;
  const totalPages = coursesData?.pagination?.totalPages || 0;

  const columns: ColumnDef<CourseWithRelations>[] = [
    {
      accessorKey: 'sno',
      header: 'S.No',
      cell: ({ row }) => pagination.pageIndex * pagination.pageSize + row.index + 1,
      enableSorting: false,
    },
    {
      accessorKey: 'courseCode',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Course Code
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
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.getValue('courseCode')}
        </Badge>
      ),
    },
    {
      accessorKey: 'courseName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 font-semibold"
          >
            Course Name
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
      accessorKey: 'courseCoordinator',
      header: 'Course Coordinator',
      cell: ({ row }) => {
        const coordinator = row.original.courseCoordinator;
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {coordinator.firstName} {coordinator.lastName}
            </div>
            <div className="text-xs text-gray-500">{coordinator.email}</div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'moduleCoordinator',
      header: 'Module Coordinator',
      cell: ({ row }) => {
        const coordinator = row.original.moduleCoordinator;
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {coordinator.firstName} {coordinator.lastName}
            </div>
            <div className="text-xs text-gray-500">{coordinator.email}</div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'programCoordinator',
      header: 'Program Coordinator',
      cell: ({ row }) => {
        const coordinator = row.original.programCoordinator;
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">
              {coordinator.firstName} {coordinator.lastName}
            </div>
            <div className="text-xs text-gray-500">{coordinator.email}</div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'statistics',
      header: 'Statistics',
      cell: ({ row }) => {
        const count = row.original._count;
        return (
          <div className="space-y-1 text-sm">
            <div>Questions: {count.questions}</div>
            <div>Materials: {count.materials}</div>
            <div>Patterns: {count.paperPatterns}</div>
            <div>Papers: {count.generatedPapers}</div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const course = row.original;

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
                  setSelectedCourse(course);
                  setEditCourseOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Course
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCourse(course);
                  setDeleteCourseOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: courses,
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
            <BookOpen className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Courses</h1>
            <p className="text-sm text-gray-500">Manage courses and coordinators</p>
          </div>
        </div>
        <Button
          onClick={() => setAddCourseOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{totalCourses}</div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Questions</CardTitle>
            <HelpCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {courses.reduce((sum: number, course) => sum + course._count.questions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total Materials</CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {courses.reduce((sum: number, course) => sum + course._count.materials, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Generated Papers</CardTitle>
            <GraduationCap className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {courses.reduce((sum: number, course) => sum + course._count.generatedPapers, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search courses..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
                />
              </div>
            </div>
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
                        <span>Loading courses...</span>
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
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No courses found.
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
          {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCourses)} of{' '}
          {totalCourses} courses
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
      <AddCourseDialog
        open={addCourseOpen}
        onOpenChange={setAddCourseOpen}
        onSuccess={() => {
          refetch();
          setAddCourseOpen(false);
        }}
      />
      <EditCourseDialog
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
        course={selectedCourse ? {
          id: selectedCourse.id,
          courseCode: selectedCourse.courseCode,
          courseName: selectedCourse.courseName,
          courseCoordinatorId: selectedCourse.courseCoordinator.id,
          moduleCoordinatorId: selectedCourse.moduleCoordinator.id,
          programCoordinatorId: selectedCourse.programCoordinator.id,
          courseCoordinator: selectedCourse.courseCoordinator,
          moduleCoordinator: selectedCourse.moduleCoordinator,
          programCoordinator: selectedCourse.programCoordinator,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null}
        onSuccess={() => {
          refetch();
          setEditCourseOpen(false);
          setSelectedCourse(null);
        }}
      />
      <DeleteCourseDialog
        open={deleteCourseOpen}
        onOpenChange={setDeleteCourseOpen}
        course={selectedCourse ? {
          id: selectedCourse.id,
          courseCode: selectedCourse.courseCode,
          courseName: selectedCourse.courseName,
          courseCoordinatorId: selectedCourse.courseCoordinator.id,
          moduleCoordinatorId: selectedCourse.moduleCoordinator.id,
          programCoordinatorId: selectedCourse.programCoordinator.id,
          courseCoordinator: selectedCourse.courseCoordinator,
          moduleCoordinator: selectedCourse.moduleCoordinator,
          programCoordinator: selectedCourse.programCoordinator,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null}
        onSuccess={() => {
          refetch();
          setDeleteCourseOpen(false);
          setSelectedCourse(null);
        }}
      />
    </div>
  );
}
