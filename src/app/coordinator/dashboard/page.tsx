export default function CoordinatorDashboard() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Coordinator Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Course Management</h2>
                    <p className="text-gray-600">Manage courses and curriculum</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Student Progress</h2>
                    <p className="text-gray-600">Track student performance</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">Reports</h2>
                    <p className="text-gray-600">Generate and view reports</p>
                </div>
            </div>
        </div>
    );
}
