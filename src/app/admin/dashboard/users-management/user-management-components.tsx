"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import type { UserTableData } from "./columns"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

const userFormSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    facultyId: z.string().min(1, "Faculty ID is required"),
    role: z.enum([
        "ADMIN",
        "COURSE_COORDINATOR",
        "MODULE_COORDINATOR",
        "PROGRAM_COORDINATOR",
        "CONTROLLER_OF_EXAMINATION"
    ] as const),
    designation: z.enum([
        "ASSISTANT_PROFESSOR",
        "ASSOCIATE_PROFESSOR",
        "PROFESSOR"
    ] as const),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    isActive: z.boolean(),
})

const editUserFormSchema = userFormSchema.omit({ password: true })

type UserFormValues = z.infer<typeof userFormSchema>
type EditUserFormValues = z.infer<typeof editUserFormSchema>

interface AddUserSheetProps {
    children: React.ReactNode
    onSubmit: (data: UserFormValues & { password: string }) => Promise<void>
}

export function AddUserSheet({ children, onSubmit }: AddUserSheetProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            facultyId: "",
            role: "COURSE_COORDINATOR",
            designation: "ASSISTANT_PROFESSOR",
            password: "",
            isActive: true,
        },
    })

    const handleSubmit = async (data: UserFormValues) => {
        if (!data.password) {
            form.setError("password", { message: "Password is required" })
            return
        }

        setIsLoading(true)
        try {
            await onSubmit({ ...data, password: data.password })
            form.reset()
            setOpen(false)
        } catch (_error) {
            // Error is handled by parent component
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto p-0">
                <div className="flex h-full flex-col">
                    <SheetHeader className="border-b bg-muted/40 px-6 py-4">
                        <SheetTitle className="text-xl font-semibold text-foreground">Add New User</SheetTitle>
                        <SheetDescription className="text-sm text-muted-foreground">
                            Create a new user account with the required information below.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium text-foreground">First Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter first name"
                                                        className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium text-foreground">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter last name"
                                                        className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium text-foreground">Email Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="user@example.com"
                                                    className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="facultyId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium text-foreground">Faculty ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., FAC001"
                                                    className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium text-foreground">Role</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                        <SelectItem value="COURSE_COORDINATOR">Course Coordinator</SelectItem>
                                                        <SelectItem value="MODULE_COORDINATOR">Module Coordinator</SelectItem>
                                                        <SelectItem value="PROGRAM_COORDINATOR">Program Coordinator</SelectItem>
                                                        <SelectItem value="CONTROLLER_OF_EXAMINATION">Controller of Examination</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="designation"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium text-foreground">Designation</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
                                                            <SelectValue placeholder="Select designation" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ASSISTANT_PROFESSOR">Assistant Professor</SelectItem>
                                                        <SelectItem value="ASSOCIATE_PROFESSOR">Associate Professor</SelectItem>
                                                        <SelectItem value="PROFESSOR">Professor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                                                <p className="text-sm text-muted-foreground">
                                                    User will be able to login and access the system
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium text-foreground">Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Enter a secure password (min 6 characters)"
                                                    className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </div>
                    <div className="border-t bg-muted/20 px-6 py-4">
                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                                className="h-10 px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={form.handleSubmit(handleSubmit)}
                                disabled={isLoading}
                                className="h-10 px-6"
                            >
                                {isLoading ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

interface EditUserDialogProps {
    user: UserTableData | null
    open: boolean
    onClose: () => void
    onSubmit: (data: Partial<EditUserFormValues>) => Promise<void>
}

export function EditUserDialog({ user, open, onClose, onSubmit }: EditUserDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<EditUserFormValues>({
        resolver: zodResolver(editUserFormSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            facultyId: "",
            role: "COURSE_COORDINATOR",
            designation: "ASSISTANT_PROFESSOR",
            isActive: true,
        },
    })

    // Update form when user changes
    useEffect(() => {
        if (user) {
            form.reset({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                facultyId: user.facultyId,
                role: user.role as EditUserFormValues['role'],
                designation: user.designation as EditUserFormValues['designation'],
                isActive: user.isActive,
            })
        }
    }, [user, form])

    const handleSubmit = async (data: EditUserFormValues) => {
        setIsLoading(true)
        try {
            await onSubmit(data)
            onClose()
        } catch (_error) {
            // Error is handled by parent component
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl font-semibold">Edit User</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Update user information. Changes will be saved when you submit the form.
                    </DialogDescription>
                </DialogHeader>
                {user && (
                    <div className="py-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">First Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="facultyId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium">Faculty ID</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Role</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                        <SelectItem value="COURSE_COORDINATOR">Course Coordinator</SelectItem>
                                                        <SelectItem value="MODULE_COORDINATOR">Module Coordinator</SelectItem>
                                                        <SelectItem value="PROGRAM_COORDINATOR">Program Coordinator</SelectItem>
                                                        <SelectItem value="CONTROLLER_OF_EXAMINATION">Controller of Examination</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="designation"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel className="text-sm font-medium">Designation</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ASSISTANT_PROFESSOR">Assistant Professor</SelectItem>
                                                        <SelectItem value="ASSOCIATE_PROFESSOR">Associate Professor</SelectItem>
                                                        <SelectItem value="PROFESSOR">Professor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                                                <p className="text-sm text-muted-foreground">
                                                    Enable or disable this user account
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter className="pt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="h-10 px-6"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="h-10 px-6"
                                    >
                                        {isLoading ? "Updating..." : "Update User"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

interface DeleteUserDialogProps {
    user: UserTableData | null
    open: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
}

export function DeleteUserDialog({ user, open, onClose, onConfirm }: DeleteUserDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        setIsLoading(true)
        try {
            await onConfirm()
            onClose()
        } catch (_error) {
            // Error is handled by parent component
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader className="space-y-3">
                    <AlertDialogTitle className="text-xl font-semibold text-destructive">
                        Delete User
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                            {user?.firstName} {user?.lastName}
                        </span>
                        {" "}({user?.email})?
                        <br /><br />
                        This action cannot be undone and will permanently remove the user and all associated data from the system.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 pt-6">
                    <AlertDialogCancel
                        onClick={onClose}
                        disabled={isLoading}
                        className="h-10 px-6"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="h-10 px-6 bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive/20"
                    >
                        {isLoading ? "Deleting..." : "Delete User"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}