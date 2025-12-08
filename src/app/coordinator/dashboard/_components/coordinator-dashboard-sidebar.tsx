"use client"
import {
    Home,
    Upload,
    FileCheck,
    Layout,
    User2,
    PanelLeftOpen,
    LogOut,
    Plus,
} from "lucide-react";
import { SiBookstack } from "react-icons/si";
import { RiGeminiFill } from "react-icons/ri";
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
// Navigation items organized by groups
const navigationItems = {
    main: [
        {
            title: "Home",
            url: "/coordinator/dashboard",
            icon: Home,
        }
    ],
    courseManagement: [
        {
            title: "Upload Material",
            url: "/coordinator/dashboard/course-management/upload-material",
            icon: Upload,
        },
        {
            title: "Generate Questions",
            url: "/coordinator/dashboard/course-management/generate-questions",
            icon: RiGeminiFill,
        },
    ],
    questionPaper: [
        {
            title: "Question Bank",
            url: "/coordinator/dashboard/question-paper/question-bank",
            icon: SiBookstack,
        },
        {
            title: "Create Pattern",
            url: "/coordinator/dashboard/question-paper/create-pattern",
            icon: Layout,
        },
        {
            title: "View Patterns",
            url: "/coordinator/dashboard/question-paper/patterns",
            icon: FaFilePen,
        },
        {
            title: "Approve Patterns",
            url: "/coordinator/dashboard/question-paper/approve-patterns",
            icon: FileCheck,
        }
    ]
};

interface MenuItem {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface CoordinatorDashboardSidebarProps {
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        email: string;
    };
}

// Simple Menu Item Component with Tooltip
const MenuItemWithTooltip = ({ item, isCollapsed }: { item: MenuItem; isCollapsed: boolean }) => {
    return (
        <SidebarMenuItem>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                            <Link href={item.url}>
                                <item.icon className="h-4 w-4" />
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
    );
};

export const CoordinatorDashboardSidebar = ({ user }: CoordinatorDashboardSidebarProps) => {
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
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.main.map((item) => (
                                <MenuItemWithTooltip
                                    key={item.title}
                                    item={item}
                                    isCollapsed={isCollapsed}
                                />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Course Management */}
                <SidebarGroup>
                    <SidebarGroupLabel>Course Management</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.courseManagement.map((item) => (
                                <MenuItemWithTooltip
                                    key={item.title}
                                    item={item}
                                    isCollapsed={isCollapsed}
                                />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Question Paper */}
                <SidebarGroup>
                    <SidebarGroupLabel>Question Paper</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navigationItems.questionPaper.map((item) => (
                                <MenuItemWithTooltip
                                    key={item.title}
                                    item={item}
                                    isCollapsed={isCollapsed}
                                />
                            ))}
                            {/* Show Generate Question Paper only for Controller of Examination */}
                            {user?.role === "CONTROLLER_OF_EXAMINATION" && (
                                <MenuItemWithTooltip
                                    item={{
                                        title: "Generate Question Paper",
                                        url: "/coordinator/dashboard/generate-paper",
                                        icon: Plus,
                                    }}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        {isCollapsed ? (
                            // Collapsed: Show only logout icon
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={logout}
                                            className="flex items-center justify-center w-full p-2 text-destructive hover:bg-destructive/10 rounded"
                                        >
                                            <LogOut className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">Logout</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            //      
                            <div className="flex items-center justify-between w-full p-2">
                                <div className="flex items-center gap-2">
                                    <User2 className="h-4 w-4" />
                                    <span className="text-sm">
                                        {user ? `${user.firstName} ${user.lastName}` : "Admin User"}
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}