import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();
    
    if (!session?.user) {
        redirect("/sign-in");
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-r from-primary to-blue-600 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Welcome to BloomIQ Dashboard! 🎉
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Authentication successful. You are now logged in.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">User Information</h3>
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
                                    <span className="font-medium">Role:</span> {session.user.role}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Designation:</span> {session.user.designation}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Quick Actions</h3>
                            <div className="space-y-3">
                                <button className="w-full bg-white dark:bg-gray-700 text-left p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-900 dark:text-white">Manage Courses</span>
                                </button>
                                <button className="w-full bg-white dark:bg-gray-700 text-left p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-900 dark:text-white">View Reports</span>
                                </button>
                                <button className="w-full bg-white dark:bg-gray-700 text-left p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-900 dark:text-white">Settings</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}