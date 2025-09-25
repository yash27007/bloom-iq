"use client"
import {
    Form,
    FormField,
    FormLabel,
    FormItem,
    FormControl,
} from "@/components/ui/form"
import { useTransition } from "react"
import { loginSchema } from "@/types/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/auth/form-error"
import { FormSuccess } from "@/components/auth/form-success"

export const LoginForm = () => {
    const [_isPending, _startTransition] = useTransition();
    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: ""
        },
    })

    function onSubmit(values: z.infer<typeof loginSchema>) {
        console.log(values);
    }
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    name="email"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Email" {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    name="password"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormError message="Something went wrong!!" />
                            <FormSuccess message="You are all set!" />
                        </FormItem>
                    )}
                />
                <Button className="w-full" size="lg">
                    Sign in
                </Button>
            </form>
        </Form>
    )
}