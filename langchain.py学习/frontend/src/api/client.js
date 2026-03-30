import axios from 'axios'

// 统一的 axios 实例，后面其他接口也可以复用。
const client = axios.create({
  baseURL: '/api',
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || '请求失败'
    return Promise.reject(new Error(message))
  },
)

export default client
