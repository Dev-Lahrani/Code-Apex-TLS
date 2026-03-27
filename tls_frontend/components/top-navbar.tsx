"use client"

import { Bell } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"

interface TopNavbarProps {
  title: string
}

export function TopNavbar({ title }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="sr-only">Notifications</span>
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
