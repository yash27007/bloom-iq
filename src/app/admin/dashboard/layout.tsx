import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { ReactNode } from "react";
import { AdminDashboardSidebar } from "./_components/AdminDashboardSidebar";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";
export const metadata: Metadata = {
    title: "Admin Dashboard | Bloom IQ",
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
    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
    const session = await auth();
    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <AdminDashboardSidebar user={session?.user} />
            <div className="w-full">
                <Navbar />
                {children}
            </div>
        </SidebarProvider>
    )
}