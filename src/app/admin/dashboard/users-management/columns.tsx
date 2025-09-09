"use client"
import { ColumnDef } from "@tanstack/react-table"
import type { Role } from "@/generated/prisma"

export type User = {
    id: string,
    firstName: string,
    lastName: string,
    facultyId: string,
    email: string,
    course: string,
    role: Role
}

const formatRole = (role: Role): string => {
    switch (role) {
        case 'ADMIN':
            return 'Admin'
        case 'COURSE_COORDINATOR':
            return 'Course Coordinator'
        case 'MODULE_COORDINATOR':
            return 'Module Coordinator'
        case 'PROGRAM_COORDINATOR':
            return 'Program Coordinator'
        case 'CONTROLLER_OF_EXAMINATION':
            return 'Controller of Examinations'
        default:
            return role
    }
}

export const columns: ColumnDef<User>[] = [
    {
        accessorKey: "facultyId",
        header: "ID"
    },

    {
        accessorKey: "firstName",
        header: "First Name"
    },
    {
        accessorKey: "lastName",
        header: "Last Name"
    },
    {
        accessorKey: "email",
        header: "Email"
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => formatRole(row.getValue("role"))
    },
    {
        accessorKey: "course",
        header: "Assigned Course"
    }
]