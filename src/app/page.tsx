"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import LandingPage from "./landing/page"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (session) {
      // Redirect based on role if authenticated
      if (session.user.role === "ADMIN") {
        router.push("/admin/dashboard")
      } else if (session.user.role === "COURSE_COORDINATOR") {
        router.push("/course-coordinator/dashboard")
      } else {
        router.push("/dashboard")
      }
    }
    // If not authenticated, show landing page (no redirect)
  }, [session, status, router])

  // Show landing page for non-authenticated users
  if (!session) {
    return <LandingPage />
  }

  // Show loading for authenticated users while redirecting
  return (
    <div className="flex justify-center items-center min-h-screen">
      <p>Loading...</p>
    </div>
  )
}
