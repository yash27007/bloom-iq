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
import { useTRPC } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

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
    const trpc = useTRPC();
    const addCourseMutation = useMutation(trpc.admin.addCourse.mutationOptions());
    const updateCourseMutation = useMutation(trpc.admin.updateCourse.mutationOptions());
    const deleteCourseMutation = useMutation(trpc.admin.deleteCourse.mutationOptions());

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
            accessorKey: "name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Course Details
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const course = row.original;
                return (
                    <div className="flex flex-col gap-1.5">
                        <div className="font-medium text-foreground text-sm">
                            {course.name}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                                {course.course_code}
                            </Badge>
                            {course._count && course._count.questions > 0 && (
                                <Badge variant="outline" className="text-xs">
                                    {course._count.questions} questions
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: "coordinators",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                >
                    Coordinators
                    {column.getIsSorted() === "asc" ? " ↑" : column.getIsSorted() === "desc" ? " ↓" : ""}
                </Button>
            ),
            cell: ({ row }) => {
                const course = row.original;
                return (
                    <div className="flex flex-col gap-2">
                        {/* Course Coordinator */}
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 font-medium">
                                CC
                            </Badge>
                            {course.courseCoordinator ? (
                                <div className="text-sm">
                                    <span className="font-medium">{course.courseCoordinator.firstName} {course.courseCoordinator.lastName}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">Not assigned</span>
                            )}
                        </div>

                        {/* Module Coordinator */}
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 font-medium">
                                MC
                            </Badge>
                            {course.moduleCoordinator ? (
                                <div className="text-sm">
                                    <span className="font-medium">{course.moduleCoordinator.firstName} {course.moduleCoordinator.lastName}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">Not assigned</span>
                            )}
                        </div>

                        {/* Program Coordinator */}
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800 font-medium">
                                PC
                            </Badge>
                            {course.programCoordinator ? (
                                <div className="text-sm">
                                    <span className="font-medium">{course.programCoordinator.firstName} {course.programCoordinator.lastName}</span>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">Not assigned</span>
                            )}
                        </div>
                    </div>
                );
            },
        },

        {
            id: "status",
            header: "Setup Status",
            cell: ({ row }) => {
                const course = row.original;
                const hasAllCoordinators = course.courseCoordinator && course.moduleCoordinator && course.programCoordinator;
                const totalResources = course._count.questions + course._count.material + course._count.questionGenerationJobs;

                return (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasAllCoordinators ? 'bg-green-500' : 'bg-orange-500'}`} />
                            <Badge
                                variant={hasAllCoordinators ? "default" : "secondary"}
                                className={hasAllCoordinators
                                    ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 text-xs"
                                    : "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 text-xs"
                                }
                            >
                                {hasAllCoordinators ? "Complete" : "Incomplete"}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {totalResources} resource{totalResources !== 1 ? 's' : ''} available
                        </div>
                    </div>
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