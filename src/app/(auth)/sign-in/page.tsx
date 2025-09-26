import { CardWrapper } from "@/components/auth/card-wrapper";
import { LoginForm } from "@/components/auth/login-form";
export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-400/30 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
                <div className="absolute bottom-1/4 left-3/4 w-3 h-3 bg-purple-400/20 rounded-full animate-ping" style={{ animationDelay: '5s' }}></div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md px-6">
                <CardWrapper 
                    header="Welcome Back! Sign in to BloomIQ!"
                    redirectLink="/sign-up"
                    backButtonText="Don't have an account? Create one here"
                >
                    <LoginForm />
                </CardWrapper>
            </div>
        </div>
    )
}
