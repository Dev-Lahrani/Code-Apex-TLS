"use client"

import { Lock, Shield, ShieldCheck, Database } from "lucide-react"
import { AuthForm } from "@/components/auth/auth-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-2">
        <div className="relative hidden overflow-hidden border-r border-border bg-slate-950 px-10 py-14 text-slate-100 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_45%)]" />
          <div className="relative space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600 shadow-[0_0_35px_rgba(56,189,248,0.45)] ring-1 ring-white/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Security Workspace</p>
                <p className="text-lg font-semibold text-white">CodeApex TLS</p>
              </div>
            </div>
            <div className="max-w-md space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-white">Secure document operations, built for high-trust outcomes.</h1>
              <p className="text-sm text-slate-300">
                Threshold-locked. Cryptographically secured.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                <Lock className="h-4 w-4 text-emerald-300" />
                AES-256-GCM document encryption
              </div>
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-sky-300" />
                Shamir&apos;s Secret Sharing key distribution
              </div>
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                <Shield className="h-4 w-4 text-indigo-300" />
                Immutable SHA-256 audit chain
              </div>
              <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                <Database className="h-4 w-4 text-violet-300" />
                IPFS-backed encrypted storage
              </div>
            </div>
          </div>
          <p className="relative text-xs text-slate-400">Built for high-assurance collaboration environments.</p>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="flex justify-center lg:hidden">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(56,189,248,0.4)] ring-1 ring-border">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-foreground">CodeApex TLS</span>
              </div>
            </div>
            <AuthForm type="login" />
            <p className="text-center text-xs text-muted-foreground">
              Demo: Use any email with password (min 6 chars)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
