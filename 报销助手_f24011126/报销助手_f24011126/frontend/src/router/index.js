import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },

  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/home',
    children: [
      { path: 'home', name: 'Home', component: () => import('@/views/Home.vue'), meta: { title: '首页' } },
      { path: 'policies/view', name: 'PolicyView', component: () => import('@/views/policy/PolicyView.vue'), meta: { title: '制度查询' } },
      { path: 'policies/manage', name: 'PolicyManage', component: () => import('@/views/policy/PolicyManage.vue'), meta: { title: '制度维护', roles: ['ROLE_COMMISSIONER', 'ROLE_ADMIN'] } },
      { path: 'documents/my', name: 'DocumentMy', component: () => import('@/views/document/DocumentMy.vue'), meta: { title: '我的单据' } },
      { path: 'documents/review', name: 'DocumentReview', component: () => import('@/views/document/DocumentReview.vue'), meta: { title: '单据审核', roles: ['ROLE_COMMISSIONER', 'ROLE_ADMIN'] } },
      { path: 'business-facts', name: 'BusinessFact', component: () => import('@/views/business/BusinessFact.vue'), meta: { title: '业务事实维护', roles: ['ROLE_SALES', 'ROLE_ADMIN'] } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.path === '/login') {
    next()
    return
  }

  if (!userStore.isLoggedIn) {
    next('/login')
    return
  }

  if (to.meta.roles && !userStore.isAdmin) {
    const hasAccess = to.meta.roles.some(role => userStore.hasRole(role))
    if (!hasAccess) {
      next('/home')
      return
    }
  }

  next()
})

export default router
