"use server"
import { auth } from "@/lib/auth"
export const Navbar = async() =>{
    const session = await auth();
    return (
        <nav className="flex flex-row p-4 justify-between">
            <h1 className="font-medium text-xl">Hello, {session?.user.firstName} {session?.user.lastName}</h1>
        </nav>
    )
}