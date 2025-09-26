"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function LogoutButton({ 
  variant = "outline", 
  size = "default", 
  className = "" 
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({
      callbackUrl: "/sign-in",
      redirect: true,
    });
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      size={size}
      className={`${className}`}
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
  );
}