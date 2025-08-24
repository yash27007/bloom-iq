import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { handleSignOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default async function CoordinatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/sign-in");
    }

    // If user is an admin, redirect to admin dashboard
    if (session.user.role === "ADMIN") {
        redirect("/admin/dashboard");
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-semibold text-gray-900">
                                Coordinator Portal
                            </h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-700">
                                Welcome, {session.user.email}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                {session.user.role.replace(/_/g, ' ')}
                            </span>
                            <form action={handleSignOut}>
                                <Button variant="outline" size="sm" type="submit">
                                    Sign Out
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
