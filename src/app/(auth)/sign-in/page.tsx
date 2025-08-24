import { LoginForm } from '@/components/LoginForm';
import Link from "next/link";

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-gray-100 bg-[size:40px_40px] opacity-20"></div>

            <div className="relative min-h-screen flex">
                {/* Left Side - Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 p-12 flex-col justify-center text-white">
                    <div className="max-w-md">
                        <h1 className="text-4xl font-bold mb-6">
                            Welcome to Bloom IQ
                        </h1>
                        <p className="text-xl mb-8 opacity-90">
                            AI-powered question paper generator using Bloom&apos;s Taxonomy for better assessments.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                    ✓
                                </div>
                                <span>Generate comprehensive question papers</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                    ✓
                                </div>
                                <span>Automated answer keys with explanations</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                    ✓
                                </div>
                                <span>Multiple difficulty levels</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                    <div className="w-full max-w-md space-y-8">
                        {/* Header */}
                        <div className="text-center">
                            <div className="lg:hidden text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                                Bloom IQ
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">
                                Sign in to your account
                            </h2>
                            <p className="mt-2 text-gray-600">
                                Or{' '}
                                <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                                    create a new account
                                </Link>
                            </p>
                        </div>

                        {/* Login Form */}
                        <LoginForm />

                        {/* Footer */}
                        <div className="text-center text-sm text-gray-500">
                            <Link href="/" className="text-blue-600 hover:text-blue-700">
                                ← Back to home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}