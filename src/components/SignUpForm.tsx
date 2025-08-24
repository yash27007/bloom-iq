"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { signUpSchema } from "@/types/auth-schema";

// 👇 form types
type SignUpFormValues = z.infer<typeof signUpSchema>;

const roleOptions = [
  { value: Role.ADMIN, label: "Admin" },
  { value: Role.CONTROLLER_OF_EXAMINATION, label: "Controller of Examination" },
  { value: Role.COURSE_COORDINATOR, label: "Course Coordinator" },
  { value: Role.MODULE_COORDINATOR, label: "Module Coordinator" },
  { value: Role.PROGRAM_COORDINATOR, label: "Program Coordinator" },
];

const SignUpForm: React.FC = () => {
  const trpc = useTRPC();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      facultyId: "",
      role: Role.ADMIN,
      email: "",
      password: "",
    },
  });

  // ✅ mutation for signUp
  const signUpMutation = useMutation(trpc.user.signUp.mutationOptions());

  const onSubmit = async (data: SignUpFormValues) => {
    try {
      const response = await signUpMutation.mutateAsync(data);
      if (!response?.success) {
        console.log(response?.message)
      }
      console.log(response)
      form.reset();
    } catch (err) {
      console.log(err)
    }
  };

  return (
    <Card className="w-full border-0 shadow-xl bg-white/80 backdrop-blur-md">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl text-center font-bold text-gray-900">
          Create your account
        </CardTitle>
        <p className="text-center text-gray-600">
          Join educators worldwide in revolutionizing assessment creation
        </p>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 px-6 pb-6"
        >
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">First Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John"
                      {...field}
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                  <FormLabel className="text-gray-700 font-medium">Last Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Doe"
                      {...field}
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="facultyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Faculty ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="FAC001"
                    {...field}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
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
                <FormLabel className="text-gray-700 font-medium">Role</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-700 font-medium">Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john.doe@university.edu"
                    {...field}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
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
                <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Create a strong password"
                    {...field}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error/Success Messages */}
          {signUpMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm font-medium">
                {String(signUpMutation.error)}
              </p>
            </div>
          )}

          {signUpMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-green-600 text-sm font-medium">
                ✅ Account created successfully!
              </p>
            </div>
          )}

          <CardFooter className="px-0 pt-4">
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-medium"
              disabled={signUpMutation.isPending}
            >
              {signUpMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </CardFooter>

          <div className="text-center text-sm text-gray-500 pt-2">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
          </div>
        </form>
      </Form>
    </Card>
  );
};

export default SignUpForm;
