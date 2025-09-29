"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Schema for course form
const courseSchema = z.object({
    courseCode: z.string().min(2, "Course code must be at least 2 characters").max(20, "Course code must be less than 20 characters"),
    courseName: z.string().min(2, "Course name must be at least 2 characters").max(200, "Course name must be less than 200 characters"),
    description: z.string().optional(),
    courseCoordinatorId: z.string().min(1, "Course coordinator is required"),
    moduleCoordinatorId: z.string().min(1, "Module coordinator is required"),
    programCoordinatorId: z.string().min(1, "Program coordinator is required"),
});

const editCourseSchema = z.object({
    courseCode: z.string().min(2, "Course code must be at least 2 characters").max(20, "Course code must be less than 20 characters").optional(),
    courseName: z.string().min(2, "Course name must be at least 2 characters").max(200, "Course name must be less than 200 characters").optional(),
    description: z.string().optional(),
    courseCoordinatorId: z.string().min(1, "Course coordinator is required").optional(),
    moduleCoordinatorId: z.string().min(1, "Module coordinator is required").optional(),
    programCoordinatorId: z.string().min(1, "Program coordinator is required").optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;
type EditCourseFormData = z.infer<typeof editCourseSchema>;

// Client-side Course type (matches tRPC response structure)
export interface ClientCourse {
    id: string;
    course_code: string;
    name: string;
    courseCoordinator: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        designation: string;
    } | null;
    moduleCoordinator: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        designation: string;
    } | null;
    programCoordinator: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        designation: string;
    } | null;
    _count: {
        questions: number;
        material: number;
        questionGenerationJobs: number;
    };
}

interface Coordinator {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    facultyId: string;
    role: string;
}

interface AddCourseSheetProps {
    children: React.ReactNode;
    onSubmit: (data: CourseFormData) => Promise<void>;
    coordinators: {
        courseCoordinators: Coordinator[];
        moduleCoordinators: Coordinator[];
        programCoordinators: Coordinator[];
    };
}

export function AddCourseSheet({ children, onSubmit, coordinators }: AddCourseSheetProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CourseFormData>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            courseCode: "",
            courseName: "",
            description: "",
            courseCoordinatorId: "",
            moduleCoordinatorId: "",
            programCoordinatorId: "",
        },
    });

    const handleSubmit = async (data: CourseFormData) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
            form.reset();
            setOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create course");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="space-y-3 pb-6">
                    <SheetTitle>Add New Course</SheetTitle>
                    <SheetDescription>
                        Create a new course with assigned coordinators.
                    </SheetDescription>
                </SheetHeader>

                <div className="px-1">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="courseCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Code *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., CS101" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="courseName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Introduction to Computer Science" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Course description..."
                                                rows={3}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="courseCoordinatorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Coordinator *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select course coordinator" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {coordinators.courseCoordinators.map((coordinator) => (
                                                    <SelectItem key={coordinator.id} value={coordinator.id}>
                                                        {coordinator.firstName} {coordinator.lastName} ({coordinator.facultyId})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="moduleCoordinatorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Module Coordinator *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select module coordinator" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {coordinators.moduleCoordinators.map((coordinator) => (
                                                    <SelectItem key={coordinator.id} value={coordinator.id}>
                                                        {coordinator.firstName} {coordinator.lastName} ({coordinator.facultyId})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="programCoordinatorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Program Coordinator *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select program coordinator" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {coordinators.programCoordinators.map((coordinator) => (
                                                    <SelectItem key={coordinator.id} value={coordinator.id}>
                                                        {coordinator.firstName} {coordinator.lastName} ({coordinator.facultyId})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Course
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </SheetContent>
        </Sheet>
    );
}

interface EditCourseDialogProps {
    course: ClientCourse;
    open: boolean;
    onClose: () => void;
    onSubmit: (data: EditCourseFormData & { id: string }) => Promise<void>;
    coordinators: {
        courseCoordinators: Coordinator[];
        moduleCoordinators: Coordinator[];
        programCoordinators: Coordinator[];
    };
}

export function EditCourseDialog({ course, open, onClose, onSubmit, coordinators }: EditCourseDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EditCourseFormData>({
        resolver: zodResolver(editCourseSchema),
        defaultValues: {
            courseCode: course.course_code,
            courseName: course.name,
            courseCoordinatorId: course.courseCoordinator?.id || "",
            moduleCoordinatorId: course.moduleCoordinator?.id || "",
            programCoordinatorId: course.programCoordinator?.id || "",
        },
    });

    const handleSubmit = async (data: EditCourseFormData) => {
        setIsSubmitting(true);
        try {
            await onSubmit({ ...data, id: course.id });
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update course");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Course</DialogTitle>
                    <DialogDescription>
                        Update course information and assigned coordinators.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="courseCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Course Code</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="courseName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Course Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="courseCoordinatorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Course Coordinator</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select course coordinator" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {coordinators.courseCoordinators.map((coordinator) => (
                                                <SelectItem key={coordinator.id} value={coordinator.id}>
                                                    {coordinator.firstName} {coordinator.lastName} ({coordinator.facultyId})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="moduleCoordinatorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Module Coordinator</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select module coordinator" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {coordinators.moduleCoordinators.map((coordinator) => (
                                                <SelectItem key={coordinator.id} value={coordinator.id}>
                                                    {coordinator.firstName} {coordinator.lastName} ({coordinator.facultyId})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="programCoordinatorId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Program Coordinator</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select program coordinator" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {coordinators.programCoordinators.map((coordinator) => (
                                                <SelectItem key={coordinator.id} value={coordinator.id}>
                                                    {coordinator.firstName} {coordinator.lastName} ({coordinator.facultyId})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Course
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

interface DeleteCourseDialogProps {
    course: ClientCourse;
    open: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export function DeleteCourseDialog({ course, open, onClose, onConfirm }: DeleteCourseDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete course");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Course</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{course.name}</strong> ({course.course_code})?
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Course
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}