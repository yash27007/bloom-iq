"use client"
import {
    Home,
    Users,
    Library,
    NotepadText,
    User2,
    PanelLeftOpen,
    LogOut,
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";

import Link from "next/link";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { handleSignOut } from "@/app/actions";
const items = [
    {
        title: "Home",
        url: "/admin/dashboard",
        icon: Home,
    },
    {
        title: "User Management",
        url: "/admin/dashboard/users-management",
        icon: Users
    },
    {
        title: "Course Management",
        url: "/admin/dashboard/course-management",
        icon: Library,
    },
    {
        title: "Question Papers",
        url: "/admin/dashboard/question-paper",
        icon: NotepadText,
    }
];

interface AdminDashboardSidebarProps {
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        email: string;
    };
}

export const AdminDashboardSidebar = ({ user }: AdminDashboardSidebarProps) => {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    return (
        <Sidebar collapsible="icon" className="group/sidebar">
            <SidebarHeader className="py-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex w-full items-center justify-between h-max">
                            {isCollapsed ? (
                                // Collapsed: logo by default, open icon on hover
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <SidebarTrigger
                                                className={cn(
                                                    "flex items-center justify-center w-full cursor-pointer group/trigger"
                                                )}
                                            >
                                                <PanelLeftOpen
                                                    size={20}
                                                    className={cn(
                                                        "absolute opacity-0 transition-opacity",
                                                        "group-hover/trigger:opacity-100"
                                                    )}
                                                />
                                            </SidebarTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">Open sidebar</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (
                                <>
                                    <Link href="/" className="flex gap-2 items-center">
                                        <span className="font-medium text-xl">Dashboard</span>
                                    </Link>
                                    <SidebarTrigger className="cursor-pointer" />
                                </>
                            )}
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <SidebarMenuButton asChild>
                                                    <Link href={item.url}>
                                                        <item.icon />
                                                        <span className="group-data-[state=collapsed]/sidebar:hidden">
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </TooltipTrigger>
                                            {isCollapsed && (
                                                <TooltipContent side="right">{item.title}</TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center justify-between w-full p-2">
                            <div className="flex items-center gap-2">
                                <User2 className="h-4 w-4" />
                                <span className="group-data-[state=collapsed]/sidebar:hidden text-sm">
                                    {user ? `${user.firstName} ${user.lastName}` : "Admin User"}
                                </span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="group-data-[state=collapsed]/sidebar:hidden text-destructive hover:bg-destructive/10 p-1 rounded">
                                <LogOut
                                    className="h-4 w-4" />
                            </button>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}