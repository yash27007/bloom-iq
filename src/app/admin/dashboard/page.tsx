"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Role } from "@/generated/prisma"
import { Users, BookOpen, FileText, Brain } from "lucide-react"

interface User {
    id: string
    firstName: string
    lastName: string
    email: string
    role: Role
    createdAt: string
}

interface Course {
    id: string
    courseCode: string
    courseName: string
    courseCoordinator: {
        id: string
        firstName: string
        lastName: string
        email: string
        role: Role
    }
    moduleCoordinator: {
        id: string
        firstName: string
        lastName: string
        email: string
        role: Role
    }
    programCoordinator: {
        id: string
        firstName: string
        lastName: string
        email: string
        role: Role
    }
    _count: {
        questions: number
        courseMaterials: number
    }
}

export default function AdminDashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    // User form state
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState<Role>("COURSE_COORDINATOR")

    // Course form state
    const [courseCode, setCourseCode] = useState("")
    const [courseName, setCourseName] = useState("")
    const [courseCoordinatorId, setCourseCoordinatorId] = useState("")
    const [moduleCoordinatorId, setModuleCoordinatorId] = useState("")
    const [programCoordinatorId, setProgramCoordinatorId] = useState("")

    useEffect(() => {
        if (status === "loading") return

        if (!session || session.user.role !== "ADMIN") {
            router.push("/auth/signin")
            return
        }

        fetchUsers()
        fetchCourses()
    }, [session, status, router])

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/admin/users")
            if (response.ok) {
                const data = await response.json()
                setUsers(data.users)
            }
        } catch (err) {
            console.error("Failed to fetch users:", err)
        }
    }

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/admin/courses")
            if (response.ok) {
                const data = await response.json()
                setCourses(data.courses)
            }
        } catch (err) {
            console.error("Failed to fetch courses:", err)
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        setSuccess("")

        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password,
                    role
                })
            })

            if (response.ok) {
                setSuccess("User created successfully")
                setFirstName("")
                setLastName("")
                setEmail("")
                setPassword("")
                setRole("COURSE_COORDINATOR")
                fetchUsers()
            } else {
                const data = await response.json()
                setError(data.error || "Failed to create user")
            }
        } catch (err) {
            console.error("Create user error:", err)
            setError("An error occurred while creating the user")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")
        setSuccess("")

        try {
            const response = await fetch("/api/admin/courses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    courseCode,
                    courseName,
                    courseCoordinatorId,
                    moduleCoordinatorId,
                    programCoordinatorId
                })
            })

            if (response.ok) {
                setSuccess("Course created successfully")
                setCourseCode("")
                setCourseName("")
                setCourseCoordinatorId("")
                setModuleCoordinatorId("")
                setProgramCoordinatorId("")
                fetchCourses()
            } else {
                const data = await response.json()
                setError(data.error || "Failed to create course")
            }
        } catch (err) {
            console.error("Create course error:", err)
            setError("An error occurred while creating the course")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignOut = () => {
        signOut({ callbackUrl: "/auth/signin" })
    }

    const getRoleDisplayName = (role: Role) => {
        return role.split("_").map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(" ")
    }

    const getRoleBadgeColor = (role: Role) => {
        switch (role) {
            case "ADMIN": return "bg-red-100 text-red-800"
            case "COURSE_COORDINATOR": return "bg-blue-100 text-blue-800"
            case "MODULE_COORDINATOR": return "bg-green-100 text-green-800"
            case "PROGRAM_COORDINATOR": return "bg-purple-100 text-purple-800"
            case "CONTROLLER_OF_EXAMINATION": return "bg-orange-100 text-orange-800"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    if (status === "loading") {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>
    }

    if (!session || session.user.role !== "ADMIN") {
        return null
    }

    // Get users by role for course assignment
    const courseCoordinators = users.filter(u => u.role === "COURSE_COORDINATOR" || u.role === "ADMIN")
    const moduleCoordinators = users.filter(u => u.role === "MODULE_COORDINATOR" || u.role === "ADMIN")
    const programCoordinators = users.filter(u => u.role === "PROGRAM_COORDINATOR" || u.role === "ADMIN")

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-gray-600">
                        Welcome, {session.user.firstName} {session.user.lastName}
                    </p>
                </div>
                <Button onClick={handleSignOut} variant="outline">
                    Sign Out
                </Button>
            </div>

            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{users.length}</div>
                        <p className="text-xs text-blue-600 mt-1">
                            {users.filter(u => u.role === 'ADMIN').length} Admins, {' '}
                            {users.filter(u => u.role === 'COURSE_COORDINATOR').length} Coordinators
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Active Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{courses.length}</div>
                        <p className="text-xs text-green-600 mt-1">
                            Academic programs managed
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700">AI Question Bank</CardTitle>
                        <Brain className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {courses.reduce((sum, course) => sum + (course._count?.questions || 0), 0)}
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                            RAG-generated questions
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700">Course Materials</CardTitle>
                        <FileText className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">
                            {courses.reduce((sum, course) => sum + (course._count?.courseMaterials || 0), 0)}
                        </div>
                        <p className="text-xs text-orange-600 mt-1">
                            PDF documents uploaded
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="courses">Course Management</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Create User Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Create New User</CardTitle>
                                <CardDescription>Add a new user to the system</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name</Label>
                                            <Input
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password (Optional)</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Leave blank to use email as password"
                                        />
                                        <p className="text-xs text-gray-500">
                                            If left blank, the email will be used as the initial password
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="COURSE_COORDINATOR">Course Coordinator</SelectItem>
                                                <SelectItem value="MODULE_COORDINATOR">Module Coordinator</SelectItem>
                                                <SelectItem value="PROGRAM_COORDINATOR">Program Coordinator</SelectItem>
                                                <SelectItem value="CONTROLLER_OF_EXAMINATION">Controller of Examination</SelectItem>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    {success && (
                                        <Alert>
                                            <AlertDescription>{success}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading ? "Creating..." : "Create User"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Users List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>System Users</CardTitle>
                                <CardDescription>All users in the system</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {users.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{`${user.firstName} ${user.lastName}`}</p>
                                                <p className="text-sm text-gray-600">{user.email}</p>
                                            </div>
                                            <Badge className={getRoleBadgeColor(user.role)}>
                                                {getRoleDisplayName(user.role)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="courses" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Create Course Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Create New Course</CardTitle>
                                <CardDescription>Add a new course and assign coordinators</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateCourse} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="courseCode">Course Code</Label>
                                        <Input
                                            id="courseCode"
                                            value={courseCode}
                                            onChange={(e) => setCourseCode(e.target.value)}
                                            placeholder="e.g., CS101"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="courseName">Course Name</Label>
                                        <Input
                                            id="courseName"
                                            value={courseName}
                                            onChange={(e) => setCourseName(e.target.value)}
                                            placeholder="e.g., Introduction to Computer Science"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="courseCoordinator">Course Coordinator</Label>
                                        <Select value={courseCoordinatorId} onValueChange={setCourseCoordinatorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Course Coordinator" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {courseCoordinators.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {`${user.firstName} ${user.lastName} (${user.email})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="moduleCoordinator">Module Coordinator</Label>
                                        <Select value={moduleCoordinatorId} onValueChange={setModuleCoordinatorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Module Coordinator" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {moduleCoordinators.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {`${user.firstName} ${user.lastName} (${user.email})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="programCoordinator">Program Coordinator</Label>
                                        <Select value={programCoordinatorId} onValueChange={setProgramCoordinatorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Program Coordinator" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {programCoordinators.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {`${user.firstName} ${user.lastName} (${user.email})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading ? "Creating..." : "Create Course"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Courses List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>System Courses</CardTitle>
                                <CardDescription>All courses in the system</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {courses.map((course) => (
                                        <div key={course.id} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-semibold">{course.courseCode}</h3>
                                                <div className="flex space-x-2 text-xs">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                        Q: {course._count.questions}
                                                    </span>
                                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                                        M: {course._count.courseMaterials}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">{course.courseName}</p>
                                            <div className="space-y-1 text-xs">
                                                <p><strong>Course:</strong> {course.courseCoordinator.firstName} {course.courseCoordinator.lastName}</p>
                                                <p><strong>Module:</strong> {course.moduleCoordinator.firstName} {course.moduleCoordinator.lastName}</p>
                                                <p><strong>Program:</strong> {course.programCoordinator.firstName} {course.programCoordinator.lastName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}