"use client";

import { trpc } from "@/trpc/client";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Plus, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CoeDashboardPage() {
    const router = useRouter();

    // Get statistics
    const { data: papers, isLoading: papersLoading } =
        trpc.paper.getPapers.useQuery({});
    const { data: patterns, isLoading: patternsLoading } =
        trpc.pattern.getApprovedPatterns.useQuery();

    const totalPapers = papers?.length || 0;
    const finalizedPapers =
        papers?.filter((p: { isFinalized: boolean }) => p.isFinalized).length || 0;
    const draftPapers = totalPapers - finalizedPapers;
    const approvedPatterns = patterns?.length || 0;

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">COE Dashboard</h1>
                <p className="text-muted-foreground">
                    Controller of Examination - Manage Question Papers
                </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Papers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {papersLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <div className="text-3xl font-bold">{totalPapers}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Finalized Papers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {papersLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <div className="text-3xl font-bold">{finalizedPapers}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Draft Papers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {papersLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <div className="text-3xl font-bold">{draftPapers}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Approved Patterns
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {patternsLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <div className="text-3xl font-bold">{approvedPatterns}</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Generate and manage question papers
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <Button
                        onClick={() => router.push("/coe/dashboard/generate-paper")}
                        size="lg"
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Generate New Paper
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/coe/dashboard/view-papers")}
                        size="lg"
                    >
                        <Eye className="mr-2 h-5 w-5" />
                        View All Papers
                    </Button>
                </CardContent>
            </Card>

            {/* Recent Papers */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Papers</CardTitle>
                    <CardDescription>
                        Latest generated question papers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {papersLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : papers && papers.length > 0 ? (
                        <div className="space-y-3">
                            {papers.slice(0, 5).map((paper: {
                                id: string;
                                paperCode: string;
                                isFinalized: boolean;
                                generatedAt: Date;
                                pattern: {
                                    patternName: string;
                                    course: {
                                        course_code: string;
                                        name: string;
                                    };
                                };
                            }) => (
                                <div
                                    key={paper.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/coe/dashboard/paper/${paper.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{paper.paperCode}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {paper.pattern.course.course_code} -{" "}
                                                {paper.pattern.patternName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(paper.generatedAt).toLocaleDateString()}
                                        </span>
                                        {paper.isFinalized ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                                Finalized
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">
                                No papers generated yet
                            </p>
                            <Button onClick={() => router.push("/coe/dashboard/generate-paper")}>
                                <Plus className="mr-2 h-4 w-4" />
                                Generate Your First Paper
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
