import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
                    <div className="w-20 h-20 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Access Denied
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Your account has been deactivated or you don&apos;t have permission to access this page. Please contact your administrator for assistance.
                    </p>

                    <div className="space-y-3">
                        <Button asChild className="w-full">
                            <Link href="/sign-in">
                                Return to Login
                            </Link>
                        </Button>

                        <Button asChild variant="outline" className="w-full">
                            <Link href="/">
                                Go Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}