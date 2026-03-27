"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createUser, getUsers } from "./api"
import { validateEmail, validatePassword, validateName } from "./auth-utils"

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "zerotrust-auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const persistUser = useCallback((nextUser: User) => {
    setUser(nextUser)
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    }
  }, [])

  const ensureBackendUser = useCallback(async (name: string) => {
    const normalizedName = name.trim() || "User"
    const users = await getUsers()
    const existing = users.find((u) => u.name.toLowerCase() === normalizedName.toLowerCase())
    if (existing) return existing
    return createUser(normalizedName)
  }, [])

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(AUTH_STORAGE_KEY) : null
    const restoreUser = async () => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as User
          const backendUser = await ensureBackendUser(parsed.name)
          persistUser({
            ...parsed,
            id: backendUser.id,
            name: backendUser.name,
          })
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY)
          setUser(null)
        }
      }
      setIsLoading(false)
    }
    restoreUser()
  }, [ensureBackendUser, persistUser])

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true)

        if (!validateEmail(email) || !validatePassword(password)) {
          return { success: false, error: "Invalid email or password" }
        }

        const normalizedEmail = email.toLowerCase()
        const name = normalizedEmail.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        const backendUser = await ensureBackendUser(name)

        persistUser({
          id: backendUser.id,
          name: backendUser.name,
          email: normalizedEmail,
        })

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unable to login",
        }
      } finally {
        setIsLoading(false)
      }
    },
    [ensureBackendUser, persistUser]
  )

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true)

        if (!validateName(name)) {
          return { success: false, error: "Name must be at least 2 characters" }
        }

        if (!validateEmail(email)) {
          return { success: false, error: "Please enter a valid email" }
        }

        if (!validatePassword(password)) {
          return { success: false, error: "Password must be at least 6 characters" }
        }

        const normalizedEmail = email.toLowerCase()
        const backendUser = await ensureBackendUser(name)

        persistUser({
          id: backendUser.id,
          name: backendUser.name,
          email: normalizedEmail,
        })

        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unable to sign up",
        }
      } finally {
        setIsLoading(false)
      }
    },
    [ensureBackendUser, persistUser]
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
