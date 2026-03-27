// Simple client-side auth utilities
export interface User {
  id: string
  email: string
  name: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

const STORAGE_KEY = 'secure_docs_auth'

export function saveAuthState(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }
}

export function loadAuthState(): User | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : null
}

export function clearAuthState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Simple validation
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password: string): boolean {
  return password.length >= 6
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2
}

// Simulate async auth operations
export async function loginUser(email: string, password: string): Promise<User> {
  if (!validateEmail(email)) {
    throw new Error("Invalid email address")
  }
  if (!validatePassword(password)) {
    throw new Error("Password must be at least 6 characters")
  }

  const name = email.split("@")[0].replace(/\./g, " ").trim() || "User"
  const user: User = {
    id: "",
    email: email.toLowerCase(),
    name,
  }

  saveAuthState(user)
  return user
}

export async function signupUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  if (!validateEmail(email)) {
    throw new Error("Invalid email address")
  }
  if (!validatePassword(password)) {
    throw new Error("Password must be at least 6 characters")
  }
  if (!validateName(name)) {
    throw new Error("Name must be at least 2 characters")
  }

  const user: User = {
    id: "",
    email: email.toLowerCase(),
    name: name.trim(),
  }

  saveAuthState(user)
  return user
}
