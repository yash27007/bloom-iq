import { auth } from "@/auth";
import { ThemeToggle } from "./theme-toggle";

export const Navbar = async () => {
    const session = await auth();

    return (
        <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="container mx-auto px-6">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-lg font-semibold text-foreground">
                            BloomIQ Dashboard
                        </h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                            Welcome back, <span className="font-medium text-foreground">{session?.user.firstName} {session?.user.lastName}</span>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </nav>
    );
};