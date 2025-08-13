"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminLogin() {
    const router = useRouter()

    useEffect(() => {
        router.replace("/auth/signin")
    }, [router])

    return (
        <div className="flex justify-center items-center min-h-screen">
            <p>Redirecting to login...</p>
        </div>
    )
}