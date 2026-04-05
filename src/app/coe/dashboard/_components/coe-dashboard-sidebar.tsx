"use client";

import {
    Home,
    Eye,
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
import { logout } from "@/actions/auth";

// Navigation items for paper committee dashboard
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
            roles: ["HOD"],
        },
        {
            title: "View Papers",
            url: "/coe/dashboard/view-papers",
            icon: Eye,
            roles: ["HOD", "DEAN", "CONTROLLER_OF_EXAMINATION"],
        },
    ],
};

interface MenuItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[];
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

function getHomeUrl(role?: string): string {
    void role;
    return "/coe/dashboard";
}

export function CoeDashboardSidebar({ user }: CoeDashboardSidebarProps) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const homeUrl = getHomeUrl(user?.role);
    const mainItems = [{ ...navigationItems.main[0], url: homeUrl }];

    const visiblePaperManagement = navigationItems.paperManagement.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true;
        return Boolean(user?.role && item.roles.includes(user.role));
    });

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="px-2 py-2">
                {isCollapsed ? (
                    <div className="flex justify-center">
                        <SidebarTrigger />
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2 px-2">
                        <Link href={homeUrl} className="flex min-w-0 items-center gap-2">
                            <PanelLeftOpen className="h-5 w-5 shrink-0" />
                            <span className="truncate font-bold text-base">Paper Committee</span>
                        </Link>
                        <SidebarTrigger className="shrink-0" />
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent className="overflow-x-hidden">
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel>Main</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainItems.map((item: MenuItem) => (
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
                            {visiblePaperManagement.map((item: MenuItem) => (
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
                            <div className="min-w-0 px-3 py-2 text-sm">
                                <p className="truncate font-medium">{user.firstName} {user.lastName}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                <p className="truncate text-xs text-muted-foreground capitalize">{user.role.replaceAll("_", " ")}</p>
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
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
