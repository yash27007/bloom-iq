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
import { useTRPC } from "@/trpc/client"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { getDashboardRoute, type UserRole } from "@/lib/auth-utils"

export const LoginForm = () => {
    const trpc = useTRPC();
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");

    const loginMutation = useMutation(trpc.user.login.mutationOptions());

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        },
    });

    function onSubmit(values: z.infer<typeof loginSchema>) {
        setError("");
        setSuccess("");
        
        loginMutation.mutate(values, {
            onSuccess: async (data) => {
                setSuccess(data.message);
                
                // Use NextAuth signIn for proper session management
                try {
                    const result = await signIn("credentials", {
                        email: values.email,
                        password: values.password,
                        redirect: false,
                    });

                    if (result?.ok) {
                        // Get user role from tRPC response and redirect accordingly
                        const userRole = data.user?.role as UserRole;
                        const dashboardRoute = getDashboardRoute(userRole);
                        router.push(dashboardRoute);
                    } else {
                        setError("Session creation failed");
                    }
                } catch (error) {
                    console.error("NextAuth signIn error:", error);
                    setError("Failed to create session");
                }
            },
            onError: (error) => {
                setError(error.message);
            },
        });
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
                                        disabled={loginMutation.isPending}
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
                                            disabled={loginMutation.isPending}
                                            {...field} 
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={loginMutation.isPending}
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
                    disabled={loginMutation.isPending}
                >
                    {loginMutation.isPending ? (
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