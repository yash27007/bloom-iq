import { CardWrapper } from "@/components/auth/card-wrapper";
import { RegisterForm } from "@/components/auth/register-form";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-emerald-900 dark:to-blue-900">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-400/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-blue-400/30 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
                <div className="absolute bottom-1/4 left-3/4 w-3 h-3 bg-indigo-400/20 rounded-full animate-ping" style={{ animationDelay: '5s' }}></div>
            </div>
            
            {/* Main Content */}
            <div className="relative z-10 w-full max-w-lg px-6">
                <CardWrapper
                    header="Create your BloomIQ account"
                    redirectLink="/sign-in"
                    backButtonText="Already have an account? Sign in instead"
                >
                    <RegisterForm />
                </CardWrapper>
            </div>
        </div>
    )
}
