import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function CoordinatorDashboardPage() {
    const session = await auth();
    
    if (!session?.user) {
        redirect("/sign-in");
    }

    // Allow all coordinator roles to access this dashboard
    const allowedRoles = ["COURSE_COORDINATOR", "MODULE_COORDINATOR", "PROGRAM_COORDINATOR", "CONTROLLER_OF_EXAMINATION"];
    
    if (!allowedRoles.includes(session.user.role)) {
        redirect("/unauthorized");
    }

    const getRoleDisplayName = (role: string) => {
        switch (role) {
            case "COURSE_COORDINATOR":
                return "Course Coordinator";
            case "MODULE_COORDINATOR":
                return "Module Coordinator";
            case "PROGRAM_COORDINATOR":
                return "Program Coordinator";
            case "CONTROLLER_OF_EXAMINATION":
                return "Controller of Examination";
            default:
                return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "COURSE_COORDINATOR":
                return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
            case "MODULE_COORDINATOR":
                return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
            case "PROGRAM_COORDINATOR":
                return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
            case "CONTROLLER_OF_EXAMINATION":
                return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
            default:
                return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end mb-6">
                <LogoutButton />
            </div>
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Coordinator Dashboard 📋
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Welcome to your coordination management panel
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coordinator Information</h3>
                            <div className="space-y-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Name:</span> {session.user.firstName} {session.user.lastName}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Email:</span> {session.user.email}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Faculty ID:</span> {session.user.facultyId}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Role:</span> 
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(session.user.role)}`}>
                                        {getRoleDisplayName(session.user.role)}
                                    </span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Designation:</span> {session.user.designation}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coordination Overview</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Assigned Courses</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">12</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Active Students</span>
                                    <span className="text-lg font-bold text-green-600 dark:text-green-400">284</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending Tasks</span>
                                    <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">3</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button className="bg-white dark:bg-gray-700 text-left p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 group">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">My Courses</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage assigned courses</p>
                                </div>
                            </div>
                        </button>

                        <button className="bg-white dark:bg-gray-700 text-left p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 group">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">Students</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">View student progress</p>
                                </div>
                            </div>
                        </button>

                        <button className="bg-white dark:bg-gray-700 text-left p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 group">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">Reports</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Generate reports</p>
                                </div>
                            </div>
                        </button>

                        <button className="bg-white dark:bg-gray-700 text-left p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600 group">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800 transition-colors">
                                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white">Schedule</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage schedule</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}