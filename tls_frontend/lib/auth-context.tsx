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

const AUTH_STORAGE_KEY = "secure_docs-auth"
const PASSWORD_STORAGE_KEY = "secure_docs-auth-passwords"

async function hashPassword(password: string): Promise<string> {
  // Pure JS SHA-256 — works on HTTP, SSR, and all browsers
  const msg = unescape(encodeURIComponent(password))
  const msgBytes = Array.from(msg).map((c) => c.charCodeAt(0))

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19

  msgBytes.push(0x80)
  while (msgBytes.length % 64 !== 56) msgBytes.push(0)
  const bitLen = msg.length * 8
  for (let i = 7; i >= 0; i--) msgBytes.push((bitLen / Math.pow(2, i * 8)) & 0xff)

  for (let chunk = 0; chunk < msgBytes.length; chunk += 64) {
    const w: number[] = []
    for (let i = 0; i < 16; i++) {
      w[i] =
        (msgBytes[chunk + i * 4] << 24) |
        (msgBytes[chunk + i * 4 + 1] << 16) |
        (msgBytes[chunk + i * 4 + 2] << 8) |
        msgBytes[chunk + i * 4 + 3]
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7]
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + s1 + ch + K[i] + w[i]) >>> 0
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (s0 + maj) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, "0"))
    .join("")
}

function rotr(n: number, x: number) {
  return (n >>> x) | (n << (32 - x))
}

function loadPasswordStore(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const raw = window.localStorage.getItem(PASSWORD_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function savePasswordHash(email: string, hash: string) {
  if (typeof window === "undefined") return
  const store = loadPasswordStore()
  store[email] = hash
  window.localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(store))
}

function getStoredPasswordHash(email: string): string | null {
  const store = loadPasswordStore()
  return store[email] ?? null
}

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
        const providedHash = await hashPassword(password)
        const storedHash = getStoredPasswordHash(normalizedEmail)

        if (!storedHash || storedHash !== providedHash) {
          return { success: false, error: "Invalid email or password" }
        }

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
        const passwordHash = await hashPassword(password)
        const backendUser = await ensureBackendUser(name)

        savePasswordHash(normalizedEmail, passwordHash)
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
