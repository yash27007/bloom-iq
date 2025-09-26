import {
    Card,
    CardContent,
    CardFooter,
    CardHeader
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
type CardWrapperProps = {
    children: React.ReactNode,
    header: string,
    redirectLink?: string,
    backButtonText?: string
}
export const CardWrapper = ({ children, header, redirectLink, backButtonText }: CardWrapperProps) => {
    return (
        <Card className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-2xl border-0 rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
            <CardHeader className="space-y-2 pb-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h1 className="font-bold text-2xl text-center text-gray-900 dark:text-white leading-tight">
                    {header}
                </h1>
                <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                    {header.includes("Welcome") 
                        ? "Enter your credentials to access your account" 
                        : "Fill in your information to get started"
                    }
                </p>
            </CardHeader>
            <CardContent className="px-6 pb-6">
                {children}
            </CardContent>
            {redirectLink && (
                <CardFooter className="flex flex-col space-y-4 px-6 pb-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">or</span>
                        </div>
                    </div>
                    <Button 
                        asChild 
                        variant="ghost" 
                        className="w-full h-11 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary hover:bg-primary/5 transition-all duration-200"
                    >
                        <Link href={redirectLink}>
                            {backButtonText}
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
