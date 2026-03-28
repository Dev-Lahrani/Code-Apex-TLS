"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Activity, Shield, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Audit Feed", href: "/activity", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface AppSidebarProps {
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const handleSignOut = () => {
    logout()
    onNavigate?.()
    router.push("/login")
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary ring-1 ring-primary/20">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-sidebar-foreground leading-tight">CodeApex TLS</span>
          <span className="text-[10px] text-muted-foreground">v1.0 · TLS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground ring-1 ring-border"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.name}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <div className="px-3 pb-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 transition-all duration-150"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      {/* User Profile */}
      <div className="border-t border-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-accent transition-all duration-150"
        >
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-sidebar bg-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || "user@company.com"}</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
