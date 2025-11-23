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
import {
    AddCourseSheet,
    EditCourseDialog,
    DeleteCourseDialog,
    ClientCourse
} from "./course-management-components";
import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// useMutation is now handled by tRPC

interface Coordinator {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    facultyId: string;
    role: string;
}

interface CoordinatorsData {
    courseCoordinators: Coordinator[];
    moduleCoordinators: Coordinator[];
    programCoordinators: Coordinator[];
}

interface CoursesManagementClientProps {
    initialData: ClientCourse[];
    coordinators: CoordinatorsData;
}

export function CoursesManagementClient({ initialData, coordinators }: CoursesManagementClientProps) {
    const [selectedCourse, setSelectedCourse] = useState<ClientCourse | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const router = useRouter();
    const addCourseMutation = trpc.admin.addCourse.useMutation();
    const updateCourseMutation = trpc.admin.updateCourse.useMutation();
    const deleteCourseMutation = trpc.admin.deleteCourse.useMutation();

    const handleAddCourse = async (data: {
        courseCode: string;
        courseName: string;
        description?: string;
        courseCoordinatorId: string;
        moduleCoordinatorId: string;
        programCoordinatorId: string;
    }) => {
        try {
            const result = await addCourseMutation.mutateAsync(data);
            if (result?.success) {
                toast.success("Course created successfully");
                router.refresh();
            } else {
                toast.error(result?.message || "Failed to create course");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create course");
        }
    };

    const handleUpdateCourse = async (data: {
        id: string;
        courseCode?: string;
        courseName?: string;
        description?: string;
        courseCoordinatorId?: string;
        moduleCoordinatorId?: string;
        programCoordinatorId?: string;
    }) => {
        try {
            const result = await updateCourseMutation.mutateAsync(data);
            if (result?.success) {
                toast.success("Course updated successfully");
                setEditDialogOpen(false);
                router.refresh();
            } else {
                toast.error(result?.message || "Failed to update course");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update course");
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;
        try {
            const result = await deleteCourseMutation.mutateAsync({ id: selectedCourse.id });
            if (result?.success) {
                toast.success("Course deleted successfully");
                setDeleteDialogOpen(false);
                router.refresh();
            } else {
                toast.error(result?.message || "Failed to delete course");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete course");
        }
    };

    const columns: ColumnDef<ClientCourse>[] = [
        {
            accessorKey: "course_code",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Course Code
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-mono text-xs px-2 py-1">
                    {row.getValue("course_code")}
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
                    Course Name
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-medium text-foreground">
                    {row.getValue("name")}
                </div>
            ),
        },
        {
            id: "courseCoordinator",
            header: "Course Coordinator",
            cell: ({ row }) => {
                const course = row.original;
                return course.courseCoordinator ? (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-sm">
                            {course.courseCoordinator.firstName} {course.courseCoordinator.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                            {course.courseCoordinator.designation.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {course.courseCoordinator.email}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground italic">Not assigned</span>
                );
            },
        },
        {
            id: "moduleCoordinator",
            header: "Module Coordinator",
            cell: ({ row }) => {
                const course = row.original;
                return course.moduleCoordinator ? (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-sm">
                            {course.moduleCoordinator.firstName} {course.moduleCoordinator.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                            {course.moduleCoordinator.designation.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {course.moduleCoordinator.email}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground italic">Not assigned</span>
                );
            },
        },
        {
            id: "programCoordinator",
            header: "Program Coordinator",
            cell: ({ row }) => {
                const course = row.original;
                return course.programCoordinator ? (
                    <div className="flex flex-col gap-0.5">
                        <div className="font-medium text-sm">
                            {course.programCoordinator.firstName} {course.programCoordinator.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                            {course.programCoordinator.designation.replace(/_/g, ' ').toLowerCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {course.programCoordinator.email}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground italic">Not assigned</span>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
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
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedCourse(course);
                                    setEditDialogOpen(true);
                                }}
                                className="cursor-pointer"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Course
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedCourse(course);
                                    setDeleteDialogOpen(true);
                                }}
                                className="cursor-pointer text-destructive focus:text-destructive"
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

    return (
        <div className="flex flex-col gap-6 h-full">
            <AdvancedDataTable
                columns={columns}
                data={initialData}
                searchKeys={["name", "course_code"]}
                searchPlaceholder="Search courses by name or code..."
                title="Courses Management"
                description={`Manage your course catalog and coordinator assignments. ${initialData.length} courses available.`}
                onAdd={() => document.getElementById("add-course-trigger")?.click()}
                addLabel="Add Course"
                emptyState={{
                    title: "No courses found",
                    description: "Get started by creating your first course with coordinator assignments.",
                    action: (
                        <AddCourseSheet
                            onSubmit={handleAddCourse}
                            coordinators={coordinators}
                        >
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Course
                            </Button>
                        </AddCourseSheet>
                    )
                }}
            />

            {/* Hidden trigger for the add button */}
            <AddCourseSheet
                onSubmit={handleAddCourse}
                coordinators={coordinators}
            >
                <button id="add-course-trigger" className="hidden" />
            </AddCourseSheet>

            {selectedCourse && (
                <>
                    <EditCourseDialog
                        course={selectedCourse}
                        open={editDialogOpen}
                        onClose={() => setEditDialogOpen(false)}
                        onSubmit={handleUpdateCourse}
                        coordinators={coordinators}
                    />
                    <DeleteCourseDialog
                        course={selectedCourse}
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                        onConfirm={handleDeleteCourse}
                    />
                </>
            )}
        </div>
    );
}