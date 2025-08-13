"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "loading") return

        if (!session) {
            router.push("/auth/signin")
        }
    }, [session, status, router])

    const handleSignOut = () => {
        signOut({ callbackUrl: "/auth/signin" })
    }

    if (status === "loading") {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>
    }

    if (!session) {
        return null
    }

    const getRoleDisplayName = (role: string) => {
        return role.split("_").map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(" ")
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-gray-600">
                        Welcome, {session.user.firstName} {session.user.lastName} ({getRoleDisplayName(session.user.role)})
                    </p>
                </div>
                <Button onClick={handleSignOut} variant="outline">
                    Sign Out
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Profile</CardTitle>
                        <CardDescription>View and update your profile information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p><strong>Name:</strong> {session.user.firstName} {session.user.lastName}</p>
                            <p><strong>Email:</strong> {session.user.email}</p>
                            <p><strong>Role:</strong> {getRoleDisplayName(session.user.role)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System Information</CardTitle>
                        <CardDescription>BloomIQ System Details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600">
                            You are logged into the BloomIQ Question Paper Generation System.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
