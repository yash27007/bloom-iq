import { CardWrapper } from "@/components/auth/card-wrapper";
import { LoginForm } from "@/components/auth/login-form";
export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
        <CardWrapper
            header="Welcome Back! Sign in to BloomIQ!"
        >
            <LoginForm />
        </CardWrapper>
        </div>
    )
}