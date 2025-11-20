"use client";

import {
    Home,
    FileText,
    Eye,
    Layout,
    PanelLeftOpen,
    LogOut,
} from "lucide-react";
import { FaFilePen } from "react-icons/fa6";
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
import { logout } from "@/actions/auth";

// Navigation items for COE Dashboard
const navigationItems = {
    main: [
        {
            title: "Home",
            url: "/coe/dashboard",
            icon: Home,
        },
    ],
    paperManagement: [
        {
            title: "Generate Paper",
            url: "/coe/dashboard/generate-paper",
            icon: FaFilePen,
        },
        {
            title: "View Papers",
            url: "/coe/dashboard/view-papers",
            icon: Eye,
        },
    ],
};

interface MenuItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface CoeDashboardSidebarProps {
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
}

export function CoeDashboardSidebar({ user }: CoeDashboardSidebarProps) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="flex items-center gap-2 px-4 py-4">
                    <PanelLeftOpen className="h-6 w-6" />
                    {!isCollapsed && (
                        <span className="font-bold text-lg">COE Dashboard</span>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.main.map((item: MenuItem) => (
                                <SidebarMenuItem key={item.title}>
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <SidebarMenuButton asChild>
                                                    <Link href={item.url}>
                                                        <item.icon className="h-4 w-4" />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </TooltipTrigger>
                                            {isCollapsed && (
                                                <TooltipContent side="right">
                                                    {item.title}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator />

                {/* Paper Management */}
                <SidebarGroup>
                    <SidebarGroupLabel>Paper Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.paperManagement.map((item: MenuItem) => (
                                <SidebarMenuItem key={item.title}>
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <SidebarMenuButton asChild>
                                                    <Link href={item.url}>
                                                        <item.icon className="h-4 w-4" />
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </TooltipTrigger>
                                            {isCollapsed && (
                                                <TooltipContent side="right">
                                                    {item.title}
                                                </TooltipContent>
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
                    {/* User Profile */}
                    {user && !isCollapsed && (
                        <SidebarMenuItem>
                            <div className="px-4 py-3 text-sm">
                                <p className="font-medium">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                            </div>
                        </SidebarMenuItem>
                    )}

                    {/* Logout Button */}
                    <SidebarMenuItem>
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <SidebarMenuButton asChild>
                                        <button
                                            onClick={() => logout()}
                                            className="w-full"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            <span>Logout</span>
                                        </button>
                                    </SidebarMenuButton>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right">Logout</TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </SidebarMenuItem>

                    {/* Sidebar Toggle */}
                    <SidebarMenuItem>
                        <SidebarTrigger />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
