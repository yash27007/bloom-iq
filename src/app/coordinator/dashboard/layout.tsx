import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { ReactNode } from "react";
import { CoordinatorDashboardSidebar } from "./_components/coordinator-dashboard-sidebar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
    title: "Coordinator Dashboard | Bloom IQ",
    description: "Proprietary college software for generating question papers using AI and Bloom's Taxonomy",
    applicationName: "Bloom-Iq",
    authors: [{ name: "Yashwanth Aravind" }, { name: "Aakash U" }, { name: "Anisha M" }, { name: "Sushmitha" }],
    category: "Education",
    creator: "Yashwanth Aravind, Aakash, Anisha and Sushmitha",
    keywords: ["question paper generator", "blooms taxonomy", "question generation system", "ai based question generation system", "ai based questions"
    ],
    publisher: "Kalasalingam Academy of Research and Education"
};


export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const session = await auth();

    if (!session?.user) {
        redirect("/sign-in");
    }

    const allowedRoles = ["COURSE_COORDINATOR", "MODULE_COORDINATOR", "PROGRAM_COORDINATOR", "CONTROLLER_OF_EXAMINATION"];

    if (!allowedRoles.includes(session.user.role)) {
        redirect("/unauthorized");
    }
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <CoordinatorDashboardSidebar user={session?.user} />
            <div className="w-full flex flex-col min-h-screen">
                <Navbar />
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
            </div>
        </SidebarProvider>
    )
}