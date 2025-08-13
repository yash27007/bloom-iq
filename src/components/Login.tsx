
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export const Login = () => {
  const router = useRouter()

  useEffect(() => {
    router.push("/auth/signin")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <p className="text-center">Redirecting to login...</p>
      </div>
    </div>
  )
}
