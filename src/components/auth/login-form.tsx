"use client"
import {
    Form,
    FormField,
    FormLabel,
    FormItem,
    FormControl,
    FormMessage,
} from "@/components/ui/form"
import { useState } from "react"
import { loginSchema } from "@/types/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { getDashboardRoute, type UserRole } from "@/lib/auth-utils"

export const LoginForm = () => {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        setError("");
        setSuccess("");
        setIsLoading(true);

        try {
            // Use custom sign-in endpoint that works with our User.password field
            const response = await fetch("/api/auth/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: values.email,
                    password: values.password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                // Check for account deactivation
                if (result.error?.includes("deactivated")) {
                    router.push("/unauthorized");
                    return;
                }
                setError(result.error || "Invalid email or password. Please check your credentials and try again.");
                return;
            }

            if (result.user) {
                setSuccess("Login successful! Redirecting...");

                // Get user role and redirect to appropriate dashboard
                const userRole = result.user.role as UserRole | undefined;
                if (userRole) {
                    const normalizedRole = String(userRole).trim().toUpperCase();
                    const dashboardRoute = getDashboardRoute(normalizedRole as UserRole);
                    router.push(dashboardRoute);
                } else {
                    router.push("/dashboard");
                }
            }
        } catch (error: any) {
            console.error("Login error:", error);
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <FormField
                        name="email"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="Enter your email address"
                                        className="h-11 px-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                        disabled={isLoading}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        name="password"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            className="h-11 px-4 pr-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                            disabled={isLoading}
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={isLoading}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormError message={error} />
                <FormSuccess message={success} />

                <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:transform-none disabled:hover:shadow-md"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        "Sign in"
                    )}
                </Button>
            </form>
        </Form>
    )
}
