import { createCaller } from "@/trpc/server";
import { DepartmentsManagementClient } from "./departments-management-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DepartmentsManagementPage() {
    try {
        const caller = await createCaller();
        const [response, usersResponse] = await Promise.all([
            caller.admin.getDepartments(),
            caller.admin.getUsers({ page: 1, limit: 500 }),
        ]);

        const departments =
            response.data?.map((department) => ({
                id: department.id,
                code: department.code,
                name: department.name,
                description: department.description,
                hod: department.hod,
                dean: department.dean,
                _count: department._count,
            })) || [];

        const allUsers = usersResponse.data || [];

        const hodOptions =
            allUsers
                .filter((item) => item.role === "HOD" && (item.isActive ?? true))
                .map((item) => ({
                    id: item.id,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    facultyId: item.facultyId,
                })) || [];

        const deanOptions =
            allUsers
                .filter((item) => item.role === "DEAN" && (item.isActive ?? true))
                .map((item) => ({
                    id: item.id,
                    firstName: item.firstName,
                    lastName: item.lastName,
                    facultyId: item.facultyId,
                })) || [];

        return (
            <DepartmentsManagementClient
                initialData={departments}
                hodOptions={hodOptions}
                deanOptions={deanOptions}
            />
        );
    } catch (error) {
        console.error("Error loading departments:", error);
        return <DepartmentsManagementClient initialData={[]} hodOptions={[]} deanOptions={[]} />;
    }
}
