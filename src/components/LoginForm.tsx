"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useActionState } from "react";
import { credentialsLogin } from "@/app/actions";

type FormState = {
  error?: string;
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: FormState | null, formData: FormData): Promise<FormState> => {
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const result = await credentialsLogin({ email, password });
      return result || {};
    },
    null
  );

  return (
    <Card className="w-full border-0 shadow-xl bg-white/80 backdrop-blur-md">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl text-center font-bold text-gray-900">
          Welcome back
        </CardTitle>
        <p className="text-center text-gray-600">
          Enter your credentials to access your account
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              name="email"
              required
              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              required
              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm font-medium">
                {state.error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-medium"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>

          <div className="text-center">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Forgot your password?
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
