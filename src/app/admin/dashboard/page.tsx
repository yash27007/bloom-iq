import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    UserCheck,
    UserX,
    Settings,
    Building2,
    BookOpen,
    FileCheck2,
    FileText,
} from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
    const [
        totalUsers,
        activeUsers,
        totalDepartments,
        totalCourses,
        patternsAwaitingMc,
        patternsAwaitingPc,
        generatedPapers,
        finalizedPapers,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.department.count(),
        prisma.course.count(),
        prisma.questionPaperPattern.count({ where: { status: "PENDING_MC_APPROVAL" } }),
        prisma.questionPaperPattern.count({ where: { status: "PENDING_PC_APPROVAL" } }),
        prisma.questionPaper.count(),
        prisma.questionPaper.count({ where: { isFinalized: true } }),
    ]);

    const inactiveUsers = totalUsers - activeUsers;

    return (
        <div className="bg-background">
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8 space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Overview of your system and quick access to management tools
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalUsers}</div>
                            <p className="text-xs text-muted-foreground">All registered users</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{activeUsers}</div>
                            <p className="text-xs text-muted-foreground">
                                {totalUsers > 0 ? `${((activeUsers / totalUsers) * 100).toFixed(1)}% of total users` : "No users yet"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                            <UserX className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{inactiveUsers}</div>
                            <p className="text-xs text-muted-foreground">
                                {totalUsers > 0 ? `${((inactiveUsers / totalUsers) * 100).toFixed(1)}% of total users` : "No users yet"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">System Status</CardTitle>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                    Operational
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Users, patterns, and paper services running
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-lg bg-muted/50 p-4">
                                <h3 className="font-medium mb-2">User Management</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Manage user accounts, roles, and permissions
                                </p>
                                <Link href="/admin/dashboard/users-management" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                                    Go to User Management →
                                </Link>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-4">
                                <h3 className="font-medium mb-2">Department Management</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Manage departments and assign HoD/Dean ownership
                                </p>
                                <Link href="/admin/dashboard/departments-management" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                                    Go to Department Management →
                                </Link>
                            </div>

                            <div className="rounded-lg bg-muted/50 p-4">
                                <h3 className="font-medium mb-2">Course Management</h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Configure courses and coordinator assignments
                                </p>
                                <Link href="/admin/dashboard/courses-management" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                                    Go to Course Management →
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Operational Snapshot</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Departments</p>
                                        <p className="text-xs text-muted-foreground">{totalDepartments} configured departments</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Courses</p>
                                        <p className="text-xs text-muted-foreground">{totalCourses} active courses in catalog</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <FileCheck2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Pending Pattern Approvals</p>
                                        <p className="text-xs text-muted-foreground">MC: {patternsAwaitingMc} | PC: {patternsAwaitingPc}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Generated Papers</p>
                                        <p className="text-xs text-muted-foreground">{generatedPapers} total | {finalizedPapers} finalized</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}