<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="login-title">报销助手</h2>
      <p class="login-subtitle">Reimbursement Assistant</p>
      <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
      <div class="test-accounts">
        <p class="tip">测试账号（密码均为 123456）：</p>
        <el-tag class="account-tag" @click="fillAccount('zhangsan', '员工')">员工 zhangsan</el-tag>
        <el-tag class="account-tag" type="warning" @click="fillAccount('lisi', '专员')">专员 lisi</el-tag>
        <el-tag class="account-tag" type="success" @click="fillAccount('wangwu', '业务员')">业务员 wangwu</el-tag>
        <el-tag class="account-tag" type="danger" @click="fillAccount('admin', '管理员')">管理员 admin</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const fillAccount = (username) => {
  form.username = username
  form.password = '123456'
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    await userStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/home')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-box {
  width: 420px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}
.login-title {
  text-align: center;
  margin: 0;
  color: #303133;
  font-size: 28px;
}
.login-subtitle {
  text-align: center;
  margin: 8px 0 30px;
  color: #909399;
  font-size: 14px;
}
.login-form {
  margin-top: 20px;
}
.login-btn {
  width: 100%;
}
.test-accounts {
  margin-top: 20px;
  text-align: center;
}
.tip {
  margin: 0 0 10px;
  color: #909399;
  font-size: 12px;
}
.account-tag {
  cursor: pointer;
  margin: 2px 4px;
}
</style>
