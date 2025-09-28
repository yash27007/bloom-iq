import { createCaller } from "@/trpc/server";
import { UsersManagementClient } from "./users-management-client";

// Force dynamic rendering to avoid static generation errors with auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Transform Prisma User to safe client-side format
function transformToClientUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    facultyId: string;
    email: string;
    role: string;
    designation: string;
    isActive?: boolean;
    createdAt: Date;
}) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        facultyId: user.facultyId,
        email: user.email,
        role: user.role,
        designation: user.designation,
        isActive: user.isActive ?? true,
        createdAt: user.createdAt,
    };
}

export default async function UsersManagement() {
    try {
        const caller = await createCaller();
        const response = await caller.admin.getUsers({
            page: 1,
            limit: 100,
        });

        const users = (response.data || []).map(transformToClientUser);

        return <UsersManagementClient initialData={users} />;
    } catch (error) {
        console.error("Error loading users:", error);

        // Fallback mock data if tRPC fails
        const mockUsers = [
            {
                id: "1",
                firstName: "John",
                lastName: "Doe",
                facultyId: "ADMIN001",
                email: "admin@example.com",
                role: "ADMIN",
                designation: "PROFESSOR",
                isActive: true,
                createdAt: new Date("2024-01-15"),
            },
            {
                id: "2",
                firstName: "Jane",
                lastName: "Smith",
                facultyId: "COORD001",
                email: "coordinator@example.com",
                role: "COURSE_COORDINATOR",
                designation: "ASSOCIATE_PROFESSOR",
                isActive: true,
                createdAt: new Date("2024-02-10"),
            },
            {
                id: "3",
                firstName: "Bob",
                lastName: "Johnson",
                facultyId: "COORD002",
                email: "module.coord@example.com",
                role: "MODULE_COORDINATOR",
                designation: "ASSISTANT_PROFESSOR",
                isActive: false,
                createdAt: new Date("2024-01-20"),
            },
            {
                id: "4",
                firstName: "Alice",
                lastName: "Williams",
                facultyId: "COORD003",
                email: "program.coord@example.com",
                role: "PROGRAM_COORDINATOR",
                designation: "PROFESSOR",
                isActive: true,
                createdAt: new Date("2024-03-05"),
            },
        ];

        return (
            <div className="bg-background">
                <div className="container mx-auto px-6 py-8">
                    <div className="mb-8 space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">User Management</h1>
                        <p className="text-muted-foreground">Unable to load users from database, showing fallback data</p>
                    </div>
                    <UsersManagementClient initialData={mockUsers} />
                </div>
            </div>
        );
    }
}