import { SidebarProvider } from "@/components/ui/sidebar";
import { CoeDashboardSidebar } from "./_components/coe-dashboard-sidebar";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function CoeDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession(await headers());

    // Check if user is authenticated
    if (!session?.user) {
        redirect("/sign-in");
    }

    // Check if user has COE role
    if (session.user.role !== "CONTROLLER_OF_EXAMINATION") {
        redirect("/unauthorized");
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full">
                <CoeDashboardSidebar user={session.user} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </SidebarProvider>
    );
}
