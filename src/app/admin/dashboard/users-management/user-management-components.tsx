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
    DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"

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
        "HOD",
        "DEAN",
        "CONTROLLER_OF_EXAMINATION"
    ] as const),
    designation: z.enum([
        "ASSISTANT_PROFESSOR",
        "ASSOCIATE_PROFESSOR",
        "PROFESSOR"
    ] as const),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    departmentId: z.string().optional(),
    isActive: z.boolean(),
})

const editUserFormSchema = userFormSchema.omit({ password: true })

type UserFormValues = z.infer<typeof userFormSchema>
type EditUserFormValues = z.infer<typeof editUserFormSchema>

interface AddUserSheetProps {
    children: React.ReactNode
    onSubmit: (data: UserFormValues & { password: string }) => Promise<void>
    departments?: Array<{ id: string; code: string; name: string }>
}

export function AddUserSheet({ children, onSubmit, departments = [] }: AddUserSheetProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            facultyId: "",
            role: "ADMIN",
            designation: "PROFESSOR",
            password: "",
            departmentId: "none",
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
            await onSubmit({
                ...data,
                departmentId: data.departmentId === "none" ? undefined : data.departmentId,
                password: data.password,
            })
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
                                                        <SelectItem value="HOD">Head of Department</SelectItem>
                                                        <SelectItem value="DEAN">Dean</SelectItem>
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
                                    name="departmentId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium text-foreground">Department</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-11 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
                                                        <SelectValue placeholder="Select department" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">No department</SelectItem>
                                                    {departments.map((department) => (
                                                        <SelectItem key={department.id} value={department.id}>
                                                            {department.code} - {department.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
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
    departments?: Array<{ id: string; code: string; name: string }>
}

export function EditUserDialog({ user, open, onClose, onSubmit, departments = [] }: EditUserDialogProps) {
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
            departmentId: "none",
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
                departmentId: user.department?.id || "none",
                isActive: user.isActive,
            })
        }
    }, [user, form])

    const handleSubmit = async (data: EditUserFormValues) => {
        setIsLoading(true)
        try {
            await onSubmit({
                ...data,
                departmentId: data.departmentId === "none" ? undefined : data.departmentId,
            })
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
                                                        <SelectItem value="HOD">Head of Department</SelectItem>
                                                        <SelectItem value="DEAN">Dean</SelectItem>
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
                                    name="departmentId"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-sm font-medium">Department</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 bg-background border-input focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all">
                                                        <SelectValue placeholder="Select department" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">No department</SelectItem>
                                                    {departments.map((department) => (
                                                        <SelectItem key={department.id} value={department.id}>
                                                            {department.code} - {department.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
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

interface DepartmentOption {
    id: string
    code: string
    name: string
    description?: string | null
    hod?: { id: string; firstName: string; lastName: string } | null
    dean?: { id: string; firstName: string; lastName: string } | null
    _count?: { members: number; courses: number }
}

interface LeaderOption {
    id: string
    firstName: string
    lastName: string
    facultyId: string
}

interface DepartmentManagementDialogProps {
    children: React.ReactNode
    departments: DepartmentOption[]
    hodOptions: LeaderOption[]
    deanOptions: LeaderOption[]
    onCreate: (input: {
        code: string
        name: string
        description?: string
        hodId?: string
        deanId?: string
    }) => Promise<void>
    onUpdate: (input: {
        id: string
        code?: string
        name?: string
        description?: string
        hodId?: string | null
        deanId?: string | null
    }) => Promise<void>
    onDelete: (id: string) => Promise<void>
}

export function DepartmentManagementDialog({
    children,
    departments,
    hodOptions,
    deanOptions,
    onCreate,
    onUpdate,
    onDelete,
}: DepartmentManagementDialogProps) {
    const [open, setOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [createCode, setCreateCode] = useState("")
    const [createName, setCreateName] = useState("")
    const [createDescription, setCreateDescription] = useState("")
    const [createHodId, setCreateHodId] = useState("none")
    const [createDeanId, setCreateDeanId] = useState("none")

    const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
    const [editCode, setEditCode] = useState("")
    const [editName, setEditName] = useState("")
    const [editDescription, setEditDescription] = useState("")
    const [editHodId, setEditHodId] = useState("none")
    const [editDeanId, setEditDeanId] = useState("none")

    const startEdit = (department: DepartmentOption) => {
        setEditingDepartmentId(department.id)
        setEditCode(department.code)
        setEditName(department.name)
        setEditDescription(department.description || "")
        setEditHodId(department.hod?.id || "none")
        setEditDeanId(department.dean?.id || "none")
    }

    const resetCreate = () => {
        setCreateCode("")
        setCreateName("")
        setCreateDescription("")
        setCreateHodId("none")
        setCreateDeanId("none")
    }

    const handleCreate = async () => {
        setIsSaving(true)
        try {
            await onCreate({
                code: createCode.trim(),
                name: createName.trim(),
                description: createDescription.trim() || undefined,
                hodId: createHodId === "none" ? undefined : createHodId,
                deanId: createDeanId === "none" ? undefined : createDeanId,
            })
            resetCreate()
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingDepartmentId) return
        setIsSaving(true)
        try {
            await onUpdate({
                id: editingDepartmentId,
                code: editCode.trim(),
                name: editName.trim(),
                description: editDescription.trim() || undefined,
                hodId: editHodId === "none" ? null : editHodId,
                deanId: editDeanId === "none" ? null : editDeanId,
            })
            setEditingDepartmentId(null)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Department Management</DialogTitle>
                    <DialogDescription>
                        Create departments and assign HoD and Dean for governance flow.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="rounded-lg border p-4 space-y-4">
                        <h3 className="font-semibold">Create Department</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                placeholder="Department code (e.g., CSE)"
                                value={createCode}
                                onChange={(e) => setCreateCode(e.target.value)}
                            />
                            <Input
                                placeholder="Department name"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                            />
                        </div>
                        <Textarea
                            placeholder="Description (optional)"
                            value={createDescription}
                            onChange={(e) => setCreateDescription(e.target.value)}
                            rows={2}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Select value={createHodId} onValueChange={setCreateHodId}>
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
                            <Select value={createDeanId} onValueChange={setCreateDeanId}>
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
                        <div className="flex justify-end">
                            <Button
                                onClick={handleCreate}
                                disabled={isSaving || !createCode.trim() || !createName.trim()}
                            >
                                Create Department
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-lg border divide-y">
                        {departments.length === 0 && (
                            <div className="p-6 text-sm text-muted-foreground">
                                No departments created yet.
                            </div>
                        )}
                        {departments.map((department) => {
                            const isEditing = editingDepartmentId === department.id

                            if (isEditing) {
                                return (
                                    <div key={department.id} className="p-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                        </div>
                                        <Textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            rows={2}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Select value={editHodId} onValueChange={setEditHodId}>
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
                                            <Select value={editDeanId} onValueChange={setEditDeanId}>
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
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={() => setEditingDepartmentId(null)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleUpdate}
                                                disabled={isSaving || !editCode.trim() || !editName.trim()}
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div key={department.id} className="p-4 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{department.code} - {department.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            HoD: {department.hod ? `${department.hod.firstName} ${department.hod.lastName}` : "Not assigned"}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Dean: {department.dean ? `${department.dean.firstName} ${department.dean.lastName}` : "Not assigned"}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Members: {department._count?.members || 0} • Courses: {department._count?.courses || 0}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => startEdit(department)}>
                                            Edit
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => onDelete(department.id)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}