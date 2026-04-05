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
    department?: { id: string; code: string; name: string } | null;
    isActive?: boolean;
    createdAt: Date;
    courseCoordinatorCourses?: Array<{ id: string; course_code: string; name: string }>;
    moduleCoordinatorCourses?: Array<{ id: string; course_code: string; name: string }>;
    programCoordinatorCourses?: Array<{ id: string; course_code: string; name: string }>;
}) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        facultyId: user.facultyId,
        email: user.email,
        role: user.role,
        designation: user.designation,
        department: user.department || null,
        isActive: user.isActive ?? true,
        createdAt: user.createdAt,
        courseCoordinatorCourses: user.courseCoordinatorCourses || [],
        moduleCoordinatorCourses: user.moduleCoordinatorCourses || [],
        programCoordinatorCourses: user.programCoordinatorCourses || [],
    };
}

export default async function UsersManagement() {
    try {
        const caller = await createCaller();
        const [response, departmentsResponse] = await Promise.all([
            caller.admin.getUsers({
                page: 1,
                limit: 100, // Safe limit to avoid validation error
            }),
            caller.admin.getDepartments(),
        ]);

        const departments = departmentsResponse.data?.map((department) => ({
            id: department.id,
            code: department.code,
            name: department.name,
            description: department.description,
            hod: department.hod,
            dean: department.dean,
            _count: department._count,
        })) || [];

        if (response.data && response.data.length > 0) {
            const users = response.data.map(transformToClientUser);
            console.log('Real user data sample:', {
                total: users.length,
                firstUser: users[0],
            });
            return <UsersManagementClient initialData={users} departments={departments} />;
        }

        return <UsersManagementClient initialData={[]} departments={departments} />;
    } catch (error) {
        console.error("Error loading users:", error);

        // Return empty state if data loading fails
        return <UsersManagementClient initialData={[]} departments={[]} />;
    }
}