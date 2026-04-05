"use client";

import { AdvancedDataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ColumnDef } from "@tanstack/react-table";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

interface DepartmentRow {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    hod?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
    dean?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    } | null;
    _count?: {
        members: number;
        courses: number;
    };
}

interface DepartmentsManagementClientProps {
    initialData: DepartmentRow[];
    hodOptions: Array<{ id: string; firstName: string; lastName: string; facultyId: string }>;
    deanOptions: Array<{ id: string; firstName: string; lastName: string; facultyId: string }>;
}

type FormState = {
    code: string;
    name: string;
    description: string;
    hodId: string;
    deanId: string;
};

const EMPTY_FORM: FormState = {
    code: "",
    name: "",
    description: "",
    hodId: "none",
    deanId: "none",
};

export function DepartmentsManagementClient({
    initialData,
    hodOptions,
    deanOptions,
}: DepartmentsManagementClientProps) {
    const router = useRouter();
    const createDepartmentMutation = trpc.admin.createDepartment.useMutation();
    const updateDepartmentMutation = trpc.admin.updateDepartment.useMutation();
    const deleteDepartmentMutation = trpc.admin.deleteDepartment.useMutation();

    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<DepartmentRow | null>(null);
    const [deletingDepartment, setDeletingDepartment] = useState<DepartmentRow | null>(null);

    const isSaving =
        createDepartmentMutation.isPending ||
        updateDepartmentMutation.isPending ||
        deleteDepartmentMutation.isPending;

    const resetForm = () => setForm(EMPTY_FORM);

    const canSubmit = useMemo(() => {
        return form.code.trim().length > 0 && form.name.trim().length > 0;
    }, [form.code, form.name]);

    const openCreateDialog = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const openEditDialog = (department: DepartmentRow) => {
        setForm({
            code: department.code,
            name: department.name,
            description: department.description || "",
            hodId: department.hod?.id || "none",
            deanId: department.dean?.id || "none",
        });
        setEditingDepartment(department);
    };

    const handleCreate = async () => {
        try {
            const result = await createDepartmentMutation.mutateAsync({
                code: form.code.trim(),
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                hodId: form.hodId === "none" ? undefined : form.hodId,
                deanId: form.deanId === "none" ? undefined : form.deanId,
            });
            toast.success(result?.message || "Department created successfully!");
            setIsCreateOpen(false);
            resetForm();
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create department");
        }
    };

    const handleUpdate = async () => {
        if (!editingDepartment) return;
        try {
            const result = await updateDepartmentMutation.mutateAsync({
                id: editingDepartment.id,
                code: form.code.trim(),
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                hodId: form.hodId === "none" ? null : form.hodId,
                deanId: form.deanId === "none" ? null : form.deanId,
            });
            toast.success(result?.message || "Department updated successfully!");
            setEditingDepartment(null);
            resetForm();
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update department");
        }
    };

    const handleDelete = async () => {
        if (!deletingDepartment) return;
        try {
            const result = await deleteDepartmentMutation.mutateAsync({ id: deletingDepartment.id });
            toast.success(result?.message || "Department deleted successfully!");
            setDeletingDepartment(null);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete department");
        }
    };

    const columns: ColumnDef<DepartmentRow>[] = [
        {
            accessorKey: "code",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Code
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                    {row.getValue("code")}
                </Badge>
            ),
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Department
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.description || "No description"}</div>
                    </div>
                );
            },
        },
        {
            id: "hod",
            header: "HoD",
            cell: ({ row }) => {
                const hod = row.original.hod;
                if (!hod) {
                    return <span className="text-xs text-muted-foreground italic">Not assigned</span>;
                }

                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-medium">{hod.firstName} {hod.lastName}</div>
                        <div className="text-xs text-muted-foreground">{hod.email}</div>
                    </div>
                );
            },
        },
        {
            id: "dean",
            header: "Dean",
            cell: ({ row }) => {
                const dean = row.original.dean;
                if (!dean) {
                    return <span className="text-xs text-muted-foreground italic">Not assigned</span>;
                }

                return (
                    <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-medium">{dean.firstName} {dean.lastName}</div>
                        <div className="text-xs text-muted-foreground">{dean.email}</div>
                    </div>
                );
            },
        },
        {
            id: "members",
            header: "Members",
            cell: ({ row }) => <span>{row.original._count?.members ?? 0}</span>,
        },
        {
            id: "courses",
            header: "Courses",
            cell: ({ row }) => <span>{row.original._count?.courses ?? 0}</span>,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const department = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(department)}
                        >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingDepartment(department)}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="flex flex-col gap-6 h-full">
            <AdvancedDataTable
                columns={columns}
                data={initialData}
                searchKeys={["name", "code"]}
                searchPlaceholder="Search departments by name or code..."
                title="Departments Management"
                description={`View all departments with assigned HoD and Dean. ${initialData.length} departments available.`}
                onAdd={openCreateDialog}
                addLabel="Add Department"
                emptyState={{
                    title: "No departments found",
                    description: "Create your first department and assign HoD/Dean.",
                    action: (
                        <Button onClick={openCreateDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Department
                        </Button>
                    ),
                }}
            />

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Department</DialogTitle>
                        <DialogDescription>
                            Add a new department and optionally assign HoD and Dean.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            placeholder="Department code (e.g., CSE)"
                            value={form.code}
                            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                        />
                        <Input
                            placeholder="Department name"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <Textarea
                            placeholder="Description (optional)"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Select value={form.hodId} onValueChange={(value) => setForm((prev) => ({ ...prev, hodId: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign HoD" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No HoD</SelectItem>
                                    {hodOptions.map((hod) => (
                                        <SelectItem key={hod.id} value={hod.id}>
                                            {hod.firstName} {hod.lastName} ({hod.facultyId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={form.deanId} onValueChange={(value) => setForm((prev) => ({ ...prev, deanId: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign Dean" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Dean</SelectItem>
                                    {deanOptions.map((dean) => (
                                        <SelectItem key={dean.id} value={dean.id}>
                                            {dean.firstName} {dean.lastName} ({dean.facultyId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={!canSubmit || isSaving}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingDepartment} onOpenChange={(open) => !open && setEditingDepartment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                        <DialogDescription>
                            Update department details and HoD/Dean assignment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input
                            placeholder="Department code"
                            value={form.code}
                            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                        />
                        <Input
                            placeholder="Department name"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <Textarea
                            placeholder="Description (optional)"
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Select value={form.hodId} onValueChange={(value) => setForm((prev) => ({ ...prev, hodId: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign HoD" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No HoD</SelectItem>
                                    {hodOptions.map((hod) => (
                                        <SelectItem key={hod.id} value={hod.id}>
                                            {hod.firstName} {hod.lastName} ({hod.facultyId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={form.deanId} onValueChange={(value) => setForm((prev) => ({ ...prev, deanId: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign Dean" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Dean</SelectItem>
                                    {deanOptions.map((dean) => (
                                        <SelectItem key={dean.id} value={dean.id}>
                                            {dean.firstName} {dean.lastName} ({dean.facultyId})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDepartment(null)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={!canSubmit || isSaving}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingDepartment} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Department</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {deletingDepartment?.name}? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isSaving}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
