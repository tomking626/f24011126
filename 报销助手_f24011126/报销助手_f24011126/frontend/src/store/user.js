import { defineStore } from 'pinia'
import { login as loginApi, getCurrentUser } from '@/api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: JSON.parse(localStorage.getItem('userInfo') || 'null')
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    roles: (state) => state.userInfo?.roles || [],
    hasRole: (state) => (role) => {
      if (!state.userInfo?.roles) return false
      return state.userInfo.roles.includes(role) || state.userInfo.roles.includes('ROLE_ADMIN')
    },
    isAdmin: (state) => state.userInfo?.roles?.includes('ROLE_ADMIN') || false,
    isCommissioner: (state) => state.userInfo?.roles?.includes('ROLE_COMMISSIONER') || false,
    isSales: (state) => state.userInfo?.roles?.includes('ROLE_SALES') || false
  },

  actions: {
    async login(username, password) {
      const res = await loginApi({ username, password })
      this.token = res.data.token
      this.userInfo = res.data
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('userInfo', JSON.stringify(res.data))
      return res.data
    },

    async fetchUserInfo() {
      const res = await getCurrentUser()
      if (this.userInfo) {
        this.userInfo = { ...this.userInfo, ...res.data }
        localStorage.setItem('userInfo', JSON.stringify(this.userInfo))
      }
    },

    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }
})
