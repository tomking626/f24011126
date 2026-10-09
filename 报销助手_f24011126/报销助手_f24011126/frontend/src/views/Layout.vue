<template>
  <el-container class="layout-container">
    <el-aside :width="collapsed ? '64px' : '220px'" class="layout-aside">
      <div class="logo">
        <el-icon :size="24" color="#fff"><Money /></el-icon>
        <span v-show="!collapsed" class="logo-text">报销助手</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="collapsed"
        router
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/home"><el-icon><HomeFilled /></el-icon><span>首页</span></el-menu-item>

        <el-sub-menu v-if="showPolicyMenu" index="policy">
          <template #title><el-icon><Document /></el-icon><span>报销制度</span></template>
          <el-menu-item index="/policies/view">制度查询</el-menu-item>
          <el-menu-item v-if="userStore.isCommissioner || userStore.isAdmin" index="/policies/manage">制度维护</el-menu-item>
        </el-sub-menu>

        <el-sub-menu v-if="showDocMenu" index="doc">
          <template #title><el-icon><Tickets /></el-icon><span>报销单据</span></template>
          <el-menu-item index="/documents/my">我的单据</el-menu-item>
          <el-menu-item v-if="userStore.isCommissioner || userStore.isAdmin" index="/documents/review">单据审核</el-menu-item>
        </el-sub-menu>

        <el-menu-item v-if="userStore.isSales || userStore.isAdmin" index="/business-facts">
          <el-icon><Briefcase /></el-icon><span>业务事实</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <el-icon class="collapse-btn" :size="20" @click="collapsed = !collapsed">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </el-icon>
        <el-dropdown class="user-dropdown" @command="handleCommand">
          <span class="user-info">
            <el-avatar :size="32" :src="avatar" />
            <span class="username">{{ userStore.userInfo?.realName || userStore.userInfo?.username }}</span>
            <el-tag v-for="role in displayRoles" :key="role" size="small" :type="roleType(role)" class="role-tag">{{ role }}</el-tag>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout"><el-icon><SwitchButton /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const collapsed = ref(false)

const activeMenu = computed(() => route.path)

const showPolicyMenu = computed(() => true)
const showDocMenu = computed(() => true)

const displayRoles = computed(() => {
  const map = {
    'ROLE_ADMIN': '管理员',
    'ROLE_STAFF': '员工',
    'ROLE_COMMISSIONER': '专员',
    'ROLE_SALES': '业务员'
  }
  return (userStore.userInfo?.roles || []).map(r => map[r] || r)
})

const roleType = (role) => {
  const map = {
    '管理员': 'danger',
    '员工': '',
    '专员': 'warning',
    '业务员': 'success'
  }
  return map[role] || ''
}

const avatar = computed(() => {
  const name = userStore.userInfo?.realName || 'U'
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
})

const handleCommand = async (command) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.layout-aside {
  background-color: #001529;
  transition: width 0.3s;
  overflow: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #001529;
  border-bottom: 1px solid #ffffff1a;
}
.logo-text {
  color: white;
  font-size: 18px;
  font-weight: bold;
}
.layout-aside :deep(.el-menu) {
  border-right: none;
}
.layout-header {
  background: white;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.collapse-btn {
  cursor: pointer;
  color: #606266;
}
.user-dropdown {
  cursor: pointer;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.role-tag {
  font-size: 12px;
}
.layout-main {
  background: #f5f7fa;
  padding: 20px;
}
</style>
