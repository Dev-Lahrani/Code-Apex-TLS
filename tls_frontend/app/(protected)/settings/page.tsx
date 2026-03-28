"use client"

import { useState } from "react"
import { Shield, Check, User, Copy, TriangleAlert } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [isSaving, setIsSaving] = useState(false)
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U"

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSaving(false)
    toast({
      title: "Settings saved",
      description: "Your profile has been updated successfully.",
    })
  }

  const handleCopyAccountId = async () => {
    if (!user?.id) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(user.id)
      } else {
        const input = window.document.createElement("textarea")
        input.value = user.id
        input.style.position = "fixed"
        input.style.left = "-9999px"
        window.document.body.appendChild(input)
        input.focus()
        input.select()
        const copied = window.document.execCommand("copy")
        window.document.body.removeChild(input)
        if (!copied) throw new Error("copy failed")
      }
      toast({ title: "Account ID copied", description: "UUID copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy account ID.", variant: "destructive" })
    }
  }

  const handleClearLocalSession = () => {
    localStorage.clear()
    window.location.reload()
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-md border border-border p-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                <AvatarFallback className="bg-muted text-muted-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">Avatar updates coming soon</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                <User className="mr-2 h-3.5 w-3.5" />
                Change Avatar
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-id">Account ID</Label>
              <div className="flex items-center gap-2">
                <Input id="account-id" value={user?.id || ""} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={handleCopyAccountId}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme preference</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Security</CardTitle>
            <CardDescription>Your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">SECURE_Docs Mode</p>
                  <p className="text-sm text-muted-foreground">
                    All documents require threshold approval
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-success text-success gap-1">
                <Check className="h-3 w-3" />
                Enabled
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Key Algorithm</p>
                <p className="text-sm font-medium">AES-256-GCM</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Sharing Scheme</p>
                <p className="text-sm font-medium">Shamir&apos;s Secret Sharing</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Audit Method</p>
                <p className="text-sm font-medium">SHA-256 hash chain</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-destructive/30 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            <CardDescription>Use with caution. This clears local browser session data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleClearLocalSession}>
              <TriangleAlert className="mr-2 h-4 w-4" />
              Clear local session
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
