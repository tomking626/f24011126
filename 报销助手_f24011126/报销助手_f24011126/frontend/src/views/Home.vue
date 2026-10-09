<template>
  <div class="home-container">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="welcome-card">
          <h2>欢迎回来，{{ userStore.userInfo?.realName || userStore.userInfo?.username }}！</h2>
          <p>您当前角色：{{ displayRoles.join('、') }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="feature-row">
      <el-col :span="8">
        <el-card shadow="hover" class="feature-card" @click="goTo('/policies/view')">
          <el-icon :size="48" color="#409EFF"><Document /></el-icon>
          <h3>查询报销制度</h3>
          <p>查看当前有效的报销制度</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="feature-card" @click="goTo('/documents/my')">
          <el-icon :size="48" color="#67C23A"><Tickets /></el-icon>
          <h3>查询我的单据</h3>
          <p>查看本人报销单据状态</p>
        </el-card>
      </el-col>
      <el-col v-if="userStore.isSales || userStore.isAdmin" :span="8">
        <el-card shadow="hover" class="feature-card" @click="goTo('/business-facts')">
          <el-icon :size="48" color="#E6A23C"><Briefcase /></el-icon>
          <h3>维护业务事实</h3>
          <p>新增和维护业务事实记录</p>
        </el-card>
      </el-col>
      <el-col v-if="userStore.isCommissioner || userStore.isAdmin" :span="8">
        <el-card shadow="hover" class="feature-card" @click="goTo('/policies/manage')">
          <el-icon :size="48" color="#F56C6C"><Setting /></el-icon>
          <h3>维护报销制度</h3>
          <p>管理和更新报销制度</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const displayRoles = computed(() => {
  const map = { 'ROLE_ADMIN': '管理员', 'ROLE_STAFF': '员工', 'ROLE_COMMISSIONER': '专员', 'ROLE_SALES': '业务员' }
  return (userStore.userInfo?.roles || []).map(r => map[r] || r)
})

const goTo = (path) => router.push(path)
</script>

<style scoped>
.home-container {
  padding: 10px;
}
.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}
.welcome-card :deep(.el-card__body) {
  color: white;
}
.welcome-card h2 {
  margin: 0 0 10px;
  color: white;
}
.welcome-card p {
  margin: 0;
  opacity: 0.9;
}
.feature-row {
  margin-top: 20px;
}
.feature-card {
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}
.feature-card:hover {
  transform: translateY(-5px);
}
.feature-card h3 {
  margin: 15px 0 8px;
  color: #303133;
}
.feature-card p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}
</style>
