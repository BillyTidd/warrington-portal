import axios from 'axios'
import { toast } from 'sonner'

const api = axios.create({
  baseURL: '/api', // Adjust this if your API has a different base URL
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized, redirect to login
      toast.error('Session expired. Please log in again.')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api