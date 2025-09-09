
import { serverTrpc } from "@/trpc/server";
import { DataTable } from "@/components/DataTable";
import { columns } from "./columns";

export default async function UsersManagement() {
    const trpc = await serverTrpc();
    const usersResponse = await trpc.admin.getUsers({});

    const users = (usersResponse.data || []).map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        facultyId: user.facultyId,
        email: user.email,
        course: user.CourseCoordinatorCourse?.courseName || 
                user.ModuleCoordinatorCourses?.[0]?.courseName || 
                user.ProgramCoordinatorCourses?.[0]?.courseName || 
                'No Course Assigned',
        role: user.role
    }));

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-6">Users Management</h1>
            <DataTable columns={columns} data={users} />
        </div>
    );
}