import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Mail, IdCard } from "lucide-react";
import { auth } from "@/auth";
import { createCaller } from "@/trpc/server";
import { redirect } from "next/navigation";

// Force dynamic rendering to avoid static generation errors with auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CoordinatorDashboardPage() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/sign-in");
    }

    // Fetch coordinator profile and course data
    let coordinatorProfile = null;
    let courseData = null;

    try {
        const caller = await createCaller();

        // Fetch coordinator profile
        coordinatorProfile = await caller.coordinator.getCoordinatorProfile({
            email: session.user.email
        });

        // Fetch coordinator course
        courseData = await caller.coordinator.getCoordinatorCourse({
            email: session.user.email
        });
    } catch (error) {
        console.error("Failed to fetch coordinator data:", error);
    }

    // Format role for display
    const formatRole = (role: string) => {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };



    return (
        <div className="bg-background">
            <div className="container mx-auto px-6 py-8">
                <div className="mb-8 space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Coordinator Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Welcome back, {coordinatorProfile ? `${coordinatorProfile.firstName} ${coordinatorProfile.lastName}` : 'Coordinator'}
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Profile Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {/* <User className="h-5 w-5" /> */}
                                Profile Details
                                {coordinatorProfile?.isActive && (
                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                        Active
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {coordinatorProfile ? (
                                <div className="space-y-4">
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <div className="flex items-center gap-3">
                                            <IdCard className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">
                                                    {coordinatorProfile.firstName} {coordinatorProfile.lastName}
                                                </p>
                                                <p className="text-sm text-muted-foreground">Full Name</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <div className="flex items-center gap-3">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{coordinatorProfile.email}</p>
                                                <p className="text-sm text-muted-foreground">Email Address</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="rounded-lg bg-muted/50 p-4">
                                            <div className="flex items-center gap-3">
                                                <IdCard className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-medium">{coordinatorProfile.facultyId}</p>
                                                    <p className="text-sm text-muted-foreground">Faculty ID</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-muted/50 p-4">
                                            <div className="flex items-center gap-3">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {formatRole(coordinatorProfile.role)}
                                                    </Badge>
                                                    <p className="text-sm text-muted-foreground mt-1">Role</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-8 text-muted-foreground">
                                    <p>Unable to load profile data</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Course Assignment Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {/* <BookOpen className="h-5 w-5" /> */}
                                Course Assignment
                                {courseData && (
                                    <Badge variant="outline" className="text-xs">
                                        {formatRole(courseData.coordinatorType)}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {courseData ? (
                                <div className="space-y-6">
                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <h3 className="font-semibold text-lg text-foreground mb-2">
                                            {courseData.name}
                                        </h3>
                                        <Badge variant="secondary" className="font-mono">
                                            {courseData.course_code}
                                        </Badge>
                                    </div>

                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="text-sm font-medium mb-2">Description</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {courseData.description}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-muted/50 p-4">
                                        <p className="text-sm font-medium mb-3">Coordinators</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Course Coordinator</span>
                                                <span className="text-sm font-medium">
                                                    {courseData.courseCoordinator.firstName} {courseData.courseCoordinator.lastName}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Module Coordinator</span>
                                                <span className="text-sm font-medium">
                                                    {courseData.moduleCoordinator.firstName} {courseData.moduleCoordinator.lastName}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Program Coordinator</span>
                                                <span className="text-sm font-medium">
                                                    {courseData.programCoordinator.firstName} {courseData.programCoordinator.lastName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">No Course Assigned</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            You are not currently assigned to coordinate any course.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}