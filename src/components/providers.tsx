"use client"

import { SessionProvider } from "next-auth/react"
import { TRPCReactProvider } from "@/trpc/client"
import { Toaster } from "react-hot-toast"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <TRPCReactProvider>
                {children}
                <Toaster position="top-right" />
            </TRPCReactProvider>
        </SessionProvider>
    )
}
