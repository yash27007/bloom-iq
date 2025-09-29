"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Plus, Search, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface DataTablePagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DataTableServerSideProps<_TData> {
    serverSide?: true;
    pagination?: DataTablePagination;
    onPaginationChange?: (page: number, pageSize: number) => void;
    onSortChange?: (sortBy?: string, sortOrder?: "asc" | "desc") => void;
    onSearchChange?: (search: string) => void;
    onFilterChange?: (filters: Record<string, string>) => void;
    loading?: boolean;
}

export interface DataTableClientSideProps<TData> {
    serverSide?: false;
    searchKey?: keyof TData;
    searchKeys?: Array<keyof TData>;
}

export interface DataTableBaseProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    title?: string;
    description?: string;
    searchPlaceholder?: string;
    filterOptions?: Array<{
        key: string;
        label: string;
        options: Array<{ label: string; value: string }>;
    }>;
    onAdd?: () => void;
    addLabel?: string;
    showColumnVisibility?: boolean;
    showPagination?: boolean;
    className?: string;
    emptyState?: {
        title?: string;
        description?: string;
        action?: React.ReactNode;
    };
}

export type DataTableProps<TData, TValue> = DataTableBaseProps<TData, TValue> &
    (DataTableServerSideProps<TData> | DataTableClientSideProps<TData>);

export function AdvancedDataTable<TData, TValue>({
    columns,
    data,
    title,
    description,
    searchPlaceholder = "Search...",
    filterOptions = [],
    onAdd,
    addLabel = "Add New",
    showColumnVisibility = true,
    showPagination = true,
    className,
    emptyState,
    ...props
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});
    const [globalFilter, setGlobalFilter] = React.useState("");
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 50,
    });

    const isServerSide = props.serverSide === true;
    const serverSideProps = isServerSide ? props : null;
    const clientSideProps = !isServerSide ? props : null;

    // Debounce search for server-side
    const [searchValue, setSearchValue] = React.useState("");
    React.useEffect(() => {
        if (isServerSide && serverSideProps?.onSearchChange) {
            const timer = setTimeout(() => {
                serverSideProps?.onSearchChange?.(searchValue);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchValue, isServerSide, serverSideProps]);

    // Client-side global filter function
    const customGlobalFilter = React.useMemo(() => {
        if (isServerSide) return undefined;

        return (row: { original: TData }, _columnId: string, value: string) => {
            const searchValue = value.toLowerCase();

            // Type-safe access to search keys
            const clientProps = clientSideProps as DataTableClientSideProps<TData>;
            const keysToSearch = clientProps?.searchKeys
                ? clientProps.searchKeys
                : clientProps?.searchKey
                    ? [clientProps.searchKey]
                    : [];

            // If no specific keys defined, search all string values
            if (keysToSearch.length === 0) {
                return Object.values(row.original as Record<string, unknown>).some((val: unknown) =>
                    String(val).toLowerCase().includes(searchValue)
                );
            }

            // Search specified keys
            return keysToSearch.some(key => {
                const cellValue = row.original[key];
                if (cellValue == null) return false;
                return String(cellValue).toLowerCase().includes(searchValue);
            });
        };
    }, [clientSideProps, isServerSide]);
    const table = useReactTable({
        data,
        columns,
        onSortingChange: (updater) => {
            setSorting(updater);
            if (isServerSide && serverSideProps?.onSortChange) {
                const newSorting = typeof updater === "function" ? updater(sorting) : updater;
                const sortConfig = newSorting[0];
                if (sortConfig) {
                    serverSideProps.onSortChange(sortConfig.id, sortConfig.desc ? "desc" : "asc");
                } else {
                    serverSideProps.onSortChange();
                }
            }
        },
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: isServerSide ? undefined : getPaginationRowModel(),
        getSortedRowModel: isServerSide ? undefined : getSortedRowModel(),
        getFilteredRowModel: isServerSide ? undefined : getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: isServerSide ? undefined : setGlobalFilter,
        globalFilterFn: customGlobalFilter,
        manualPagination: isServerSide,
        manualSorting: isServerSide,
        manualFiltering: isServerSide,
        pageCount: isServerSide ? serverSideProps?.pagination?.totalPages ?? 0 : undefined,
        onPaginationChange: isServerSide ? undefined : setPagination,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter: isServerSide ? "" : globalFilter,
            pagination: isServerSide
                ? {
                    pageIndex: (serverSideProps?.pagination?.page ?? 1) - 1,
                    pageSize: serverSideProps?.pagination?.limit ?? 10,
                }
                : pagination,
        },
    });

    // Debug pagination state
    const paginationState = table.getState().pagination;
    React.useEffect(() => {
        if (!isServerSide) {
            console.log('AdvancedDataTable pagination debug:', {
                currentPageSize: paginationState.pageSize,
                currentPageIndex: paginationState.pageIndex,
                totalRows: data.length,
                pageCount: table.getPageCount(),
                canNextPage: table.getCanNextPage(),
                canPreviousPage: table.getCanPreviousPage(),
                isServerSide: isServerSide,
                rowsOnCurrentPage: table.getRowModel().rows.length,
            });
        }
    }, [paginationState.pageSize, paginationState.pageIndex, data.length, isServerSide, table]);

    const handlePageChange = React.useCallback((page: number) => {
        if (isServerSide && serverSideProps?.onPaginationChange) {
            serverSideProps.onPaginationChange(page, serverSideProps.pagination?.limit ?? 10);
        }
    }, [isServerSide, serverSideProps]);

    const handlePageSizeChange = React.useCallback((pageSize: number) => {
        if (isServerSide && serverSideProps?.onPaginationChange) {
            serverSideProps.onPaginationChange(1, pageSize);
        } else {
            setPagination(prev => ({ ...prev, pageSize, pageIndex: 0 }));
        }
    }, [isServerSide, serverSideProps]);

    const handleFilterChange = React.useCallback((key: string, value: string) => {
        if (isServerSide && serverSideProps?.onFilterChange) {
            const currentFilters = columnFilters.reduce((acc, filter) => {
                acc[filter.id] = filter.value as string;
                return acc;
            }, {} as Record<string, string>);

            const newFilters = { ...currentFilters };
            if (value === "all") {
                delete newFilters[key];
            } else {
                newFilters[key] = value;
            }

            serverSideProps.onFilterChange(newFilters);
        }

        table.getColumn(key)?.setFilterValue(value === "all" ? undefined : value);
    }, [isServerSide, serverSideProps, columnFilters, table]);

    return (
        <div className={`w-full space-y-4 ${className || ""}`}>
            {/* Header */}
            {(title || description) && (
                <div className="space-y-1">
                    {title && (
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
                            {isServerSide && serverSideProps?.pagination && (
                                <Badge variant="secondary" className="text-xs">
                                    {serverSideProps.pagination.total} total records
                                </Badge>
                            )}
                        </div>
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={isServerSide ? searchValue : globalFilter ?? ""}
                            onChange={(event) => {
                                const value = event.target.value;
                                if (isServerSide) {
                                    setSearchValue(value);
                                } else {
                                    setGlobalFilter(value);
                                }
                            }}
                            className="pl-9 h-10"
                        />
                        {isServerSide && serverSideProps?.loading && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                    </div>

                    {/* Filters */}
                    {filterOptions.map((filter) => (
                        <Select
                            key={filter.key}
                            value={(table.getColumn(filter.key)?.getFilterValue() as string) ?? "all"}
                            onValueChange={(value) => handleFilterChange(filter.key, value)}
                        >
                            <SelectTrigger className="h-10 w-[140px] shrink-0">
                                <SelectValue placeholder={`All ${filter.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All {filter.label}</SelectItem>
                                {filter.options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Column visibility */}
                    {showColumnVisibility && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-10">
                                    <ChevronDown className="mr-2 h-4 w-4" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id.replace(/([A-Z])/g, ' $1').trim()}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Add button */}
                    {onAdd && (
                        <Button onClick={onAdd} size="sm" className="h-10">
                            <Plus className="mr-2 h-4 w-4" />
                            {addLabel}
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="h-12 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isServerSide && serverSideProps?.loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-32 text-center"
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span>Loading...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-b hover:bg-muted/30 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-6 py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-32 text-center text-muted-foreground"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="text-lg font-medium">
                                            {emptyState?.title || "No results found"}
                                        </div>
                                        <div className="text-sm">
                                            {emptyState?.description || "Try adjusting your search or filter criteria"}
                                        </div>
                                        {emptyState?.action}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {showPagination && (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {isServerSide ? (
                            serverSideProps?.pagination ? (
                                <>
                                    Showing{" "}
                                    {((serverSideProps.pagination.page - 1) * serverSideProps.pagination.limit) + 1}-
                                    {Math.min(serverSideProps.pagination.page * serverSideProps.pagination.limit, serverSideProps.pagination.total)}{" "}
                                    of {serverSideProps.pagination.total} results
                                </>
                            ) : null
                        ) : (
                            <>
                                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                                {table.getFilteredRowModel().rows.length} row(s) selected
                            </>
                        )}
                    </div>
                    <div className="flex items-center justify-between lg:justify-end lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Rows per page</p>
                            <Select
                                value={`${isServerSide ? serverSideProps?.pagination?.limit ?? 10 : table.getState().pagination.pageSize}`}
                                onValueChange={(value) => handlePageSizeChange(Number(value))}
                            >
                                <SelectTrigger className="h-8 w-[70px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[5, 10, 20, 30, 50, 100].map((pageSize) => (
                                        <SelectItem key={pageSize} value={`${pageSize}`}>
                                            {pageSize}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                            Page{" "}
                            {isServerSide ? serverSideProps?.pagination?.page ?? 1 : table.getState().pagination.pageIndex + 1}{" "}
                            of{" "}
                            {isServerSide ? serverSideProps?.pagination?.totalPages ?? 1 : table.getPageCount()}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    if (isServerSide) {
                                        handlePageChange(1);
                                    } else {
                                        table.setPageIndex(0);
                                    }
                                }}
                                disabled={
                                    isServerSide
                                        ? (serverSideProps?.pagination?.page ?? 1) <= 1
                                        : !table.getCanPreviousPage()
                                }
                            >
                                <span className="sr-only">Go to first page</span>
                                «
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    if (isServerSide) {
                                        handlePageChange((serverSideProps?.pagination?.page ?? 1) - 1);
                                    } else {
                                        table.previousPage();
                                    }
                                }}
                                disabled={
                                    isServerSide
                                        ? (serverSideProps?.pagination?.page ?? 1) <= 1
                                        : !table.getCanPreviousPage()
                                }
                            >
                                <span className="sr-only">Go to previous page</span>
                                ‹
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    if (isServerSide) {
                                        handlePageChange((serverSideProps?.pagination?.page ?? 1) + 1);
                                    } else {
                                        table.nextPage();
                                    }
                                }}
                                disabled={
                                    isServerSide
                                        ? (serverSideProps?.pagination?.page ?? 1) >= (serverSideProps?.pagination?.totalPages ?? 1)
                                        : !table.getCanNextPage()
                                }
                            >
                                <span className="sr-only">Go to next page</span>
                                ›
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    if (isServerSide) {
                                        handlePageChange(serverSideProps?.pagination?.totalPages ?? 1);
                                    } else {
                                        table.setPageIndex(table.getPageCount() - 1);
                                    }
                                }}
                                disabled={
                                    isServerSide
                                        ? (serverSideProps?.pagination?.page ?? 1) >= (serverSideProps?.pagination?.totalPages ?? 1)
                                        : !table.getCanNextPage()
                                }
                            >
                                <span className="sr-only">Go to last page</span>
                                »
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}