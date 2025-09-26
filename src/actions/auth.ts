"use server"
import {signIn} from "@/auth"
import { AuthError } from "next-auth"

export const login = async(formData : FormData) =>{
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
        return {
            error: "Email and password are required"
        }
    }

    try{
        const result = await signIn("credentials",{
            email,
            password,
            redirect: false
        })

        if (result?.error) {
            return {
                error: "Invalid credentials"
            }
        }

        return {
            success: true
        }
    } catch(error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return {
                        error: "Invalid credentials"
                    }
                default:
                    return {
                        error: "Something went wrong"
                    }
            }
        }
        
        return {
            error: "An unexpected error occurred"
        }
    }
}

