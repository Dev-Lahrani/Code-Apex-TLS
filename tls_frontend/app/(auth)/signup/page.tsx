"use client"

import { Shield } from "lucide-react"
import { AuthForm } from "@/components/auth/auth-form"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">SECURE_Docs</span>
          </div>
        </div>

        <AuthForm type="signup" />
      </div>
    </div>
  )
}