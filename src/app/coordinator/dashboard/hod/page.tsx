import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HodDashboardPage() {
    const session = await getSession(await headers());

    if (!session?.user) {
        redirect("/sign-in");
    }

    if (session.user.role !== "HOD") {
        redirect("/unauthorized");
    }

    const userId = session.user.id;

    const [departmentCount, pendingPatterns, approvedPatterns] = await Promise.all([
        prisma.department.count({ where: { hodId: userId } }),
        prisma.questionPaperPattern.count({
            where: {
                status: "PENDING_HOD_APPROVAL",
                course: {
                    department: {
                        hodId: userId,
                    },
                },
            },
        }),
        prisma.questionPaperPattern.count({
            where: {
                status: "APPROVED",
                course: {
                    department: {
                        hodId: userId,
                    },
                },
            },
        }),
    ]);

    return (
        <div className="container mx-auto px-6 py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">HoD Dashboard</h1>
                <p className="text-muted-foreground">
                    Department-level visibility and approvals for question paper patterns.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Departments Assigned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{departmentCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Pending HoD Approval</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingPatterns}</div>
                        {pendingPatterns > 0 ? <Badge variant="warning">Action Needed</Badge> : <Badge variant="secondary">Up to Date</Badge>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Approved Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedPatterns}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link href="/coordinator/dashboard/question-paper/approve-patterns">Review Pending Patterns</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/coordinator/dashboard/question-paper/patterns">View Department Patterns</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/coordinator/dashboard/question-paper/question-bank">Question Bank</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
