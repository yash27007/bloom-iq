"use client"
import {
    Form,
    FormMessage,
    FormControl,
    FormItem,
    FormLabel,
    FormField,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { signUpSchema } from "@/types/auth"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "../ui/button"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useTRPC } from "@/trpc/client"
import { useMutation } from "@tanstack/react-query"

export const RegisterForm = () => {
    const trpc = useTRPC();
    const signUpmutation = useMutation(trpc.user.signUp.mutationOptions())

    const [showPassword, setShowPassword] = useState(false)
    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            facultyId: "",
            email: "",
            password: "",
            designation: "ASSISTANT_PROFESSOR",
            role: "COURSE_COORDINATOR"
        }
    })

    function onSubmit(values: z.infer<typeof signUpSchema>) {
        signUpmutation.mutate(values)
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder="Bruce" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input type="text" placeholder="Wayne" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="brucewayne@batman.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="facultyId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Faculty Id</FormLabel>
                            <FormControl>
                                <Input type="text" placeholder="Bruce001" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Designation</FormLabel>
                            <FormControl>
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select the designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASSISTANT_PROFESSOR">Assistant Professor</SelectItem>
                                        <SelectItem value="ASSOCIATE_PROFESSOR">Associate Professor</SelectItem>
                                        <SelectItem value="PROFESSOR">Professor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select the role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="COURSE_COORDINATOR">Course Coordinator</SelectItem>
                                        <SelectItem value="MODULE_COORDINATOR">Module Coordinator</SelectItem>
                                        <SelectItem value="PROGRAM_COORDINATOR">Program Coordinator</SelectItem>
                                        <SelectItem value="CONTROLLER_OF_EXAMINATION">Controller of Examination</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <div className="relative flex items-center">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password must be atleast 6 characters"
                                        {...field}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary focus:outline-none"
                                        onClick={() => setShowPassword((v) => !v)}
                                    >
                                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                    </button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" size="lg" className="w-full">
                    Sign up
                </Button>
            </form>
        </Form>
    )
}