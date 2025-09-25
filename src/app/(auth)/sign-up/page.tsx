import { CardWrapper } from "@/components/auth/card-wrapper";
import { RegisterForm } from "@/components/auth/register-form";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
            <CardWrapper
                header="Create your account"
                redirectLink="/sign-in"
                backButtonText="Already have an account? Sign in instead"
            >
                <RegisterForm />
            </CardWrapper>
        </div>
    )
}