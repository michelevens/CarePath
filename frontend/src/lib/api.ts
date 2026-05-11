import axios from "axios"

const TOKEN_KEY = "carepath_token"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}
