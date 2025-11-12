"use client"

import { trpc } from "@/trpc/client";
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
import { Eye, EyeOff, Loader2 } from "lucide-react"
// tRPC and useMutation now handled by trpc import
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { useRouter } from "next/navigation"

export const RegisterForm = () => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");

    const signUpMutation = trpc.user.signUp.useMutation();
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
        setError("");
        setSuccess("");

        signUpMutation.mutate(values, {
            onSuccess: (data) => {
                setSuccess(data.message);
                form.reset();
                // Redirect to login page after successful signup
                setTimeout(() => {
                    router.push("/sign-in");
                }, 2000);
            },
            onError: (error) => {
                setError(error.message);
            },
        });
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
                                    <Input
                                        type="text"
                                        placeholder="Enter your first name"
                                        className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        disabled={signUpMutation.isPending}
                                        {...field}
                                    />
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
                                    <Input
                                        type="text"
                                        placeholder="Enter your last name"
                                        className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        disabled={signUpMutation.isPending}
                                        {...field}
                                    />
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
                                <Input
                                    type="email"
                                    placeholder="Enter your email address"
                                    className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                    disabled={signUpMutation.isPending}
                                    {...field}
                                />
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
                                <Input
                                    type="text"
                                    placeholder="Enter your faculty ID"
                                    className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                    disabled={signUpMutation.isPending}
                                    {...field}
                                />
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
                                    <SelectTrigger className="w-full h-11 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" disabled={signUpMutation.isPending}>
                                        <SelectValue placeholder="Select your designation" />
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
                                    <SelectTrigger className="w-full h-11 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200" disabled={signUpMutation.isPending}>
                                        <SelectValue placeholder="Select your role" />
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
                                        placeholder="Password must be at least 6 characters"
                                        className="h-11 px-4 pr-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        disabled={signUpMutation.isPending}
                                        {...field}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none"
                                        onClick={() => setShowPassword((v) => !v)}
                                        disabled={signUpMutation.isPending}
                                    >
                                        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormError message={error} />
                <FormSuccess message={success} />

                <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-md"
                    disabled={signUpMutation.isPending}
                >
                    {signUpMutation.isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        "Create Account"
                    )}
                </Button>
            </form>
        </Form>
    )
}