import { createCaller } from "@/trpc/server";
import { CoursesManagementClient } from "./courses-management-client";

// Force dynamic rendering to avoid static generation errors with auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Transform tRPC Course response to safe client-side format
function transformToClientCourse(course: {
    id: string;
    course_code: string;
    name: string;
    department?: {
        id: string;
        code: string;
        name: string;
    } | null;
    courseCoordinator: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        designation: string;
    } | null;
    moduleCoordinator: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        designation: string;
    } | null;
    programCoordinator: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        designation: string;
    } | null;
    _count: {
        questions: number;
        material: number;
        questionGenerationJobs: number;
    };
}) {
    return {
        id: course.id,
        course_code: course.course_code,
        name: course.name,
        department: course.department || null,
        courseCoordinator: course.courseCoordinator,
        moduleCoordinator: course.moduleCoordinator,
        programCoordinator: course.programCoordinator,
        _count: course._count,
    };
}

export default async function CoursesManagement() {
    try {
        const caller = await createCaller();
        const [response, courseCoordinators, moduleCoordinators, programCoordinators, departmentsResponse] = await Promise.all([
            caller.admin.getCourses({
                page: 1,
                limit: 500, // Increased limit for better performance
            }),
            caller.admin.getEligibleCoordinators({ role: "COURSE_COORDINATOR" }),
            caller.admin.getEligibleCoordinators({ role: "MODULE_COORDINATOR" }),
            caller.admin.getEligibleCoordinators({ role: "PROGRAM_COORDINATOR" }),
            caller.admin.getDepartments(),
        ]);

        const courses = (response.data || []).map(transformToClientCourse);

        const coordinators = {
            courseCoordinators: courseCoordinators.data || [],
            moduleCoordinators: moduleCoordinators.data || [],
            programCoordinators: programCoordinators.data || [],
        };

        const departments = departmentsResponse.data?.map((department) => ({
            id: department.id,
            code: department.code,
            name: department.name,
        })) || [];

        return (
            <CoursesManagementClient
                initialData={courses}
                coordinators={coordinators}
                departments={departments}
            />
        );
    } catch (error) {
        console.error("Error loading courses:", error);

        // Fallback with empty data if tRPC fails
        const emptyCoordinators = {
            courseCoordinators: [],
            moduleCoordinators: [],
            programCoordinators: [],
        };

        return (
            <CoursesManagementClient
                initialData={[]}
                coordinators={emptyCoordinators}
                departments={[]}
            />
        );
    }
}