<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报销制度维护</span>
          <div>
            <el-input v-model="queryParams.category" placeholder="类别" style="width: 120px; margin-right: 10px" clearable @clear="loadData" @keyup.enter="loadData">
              <template #prepend>
                <el-select v-model="queryParams.category" placeholder="全部" clearable @change="loadData">
                  <el-option label="差旅" value="travel" />
                  <el-option label="招待" value="expense" />
                  <el-option label="设备" value="equipment" />
                  <el-option label="其他" value="other" />
                </el-select>
              </template>
            </el-input>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon>新增制度
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="records" border stripe v-loading="loading">
        <el-table-column prop="title" label="制度标题" min-width="200" />
        <el-table-column prop="category" label="类别" width="100">
          <template #default="{ row }">{{ categoryMap[row.category] }}</template>
        </el-table-column>
        <el-table-column prop="amountLimit" label="金额上限" width="120">
          <template #default="{ row }">
            <span v-if="row.amountLimit">¥{{ row.amountLimit.toFixed(2) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="effectiveDate" label="生效日期" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '有效' : '已失效' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link :type="row.status === 1 ? 'warning' : 'success'" size="small" @click="toggleStatus(row)">
              {{ row.status === 1 ? '设为失效' : '设为有效' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="userStore.isAdmin">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadData"
        @current-change="loadData"
        style="margin-top: 16px; justify-content: flex-end"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑制度' : '新增制度'" width="600px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="制度标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入制度标题" />
        </el-form-item>
        <el-form-item label="制度类别" prop="category">
          <el-select v-model="form.category" placeholder="请选择类别">
            <el-option label="差旅" value="travel" />
            <el-option label="招待" value="expense" />
            <el-option label="设备" value="equipment" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额上限">
          <el-input-number v-model="form.amountLimit" :min="0" :precision="2" :step="100" />
        </el-form-item>
        <el-form-item label="生效日期" prop="effectiveDate">
          <el-date-picker v-model="form.effectiveDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="失效日期">
          <el-date-picker v-model="form.expireDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="制度内容" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="请输入制度内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pagePolicies, createPolicy, updatePolicy, deletePolicy, togglePolicyStatus } from '@/api/policy'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const formRef = ref(null)
const records = ref([])
const total = ref(0)

const categoryMap = { travel: '差旅', expense: '招待', equipment: '设备', other: '其他' }

const queryParams = reactive({ pageNum: 1, pageSize: 10, category: '' })

const form = reactive({
  id: null, title: '', category: '', content: '', amountLimit: null,
  effectiveDate: '', expireDate: '', status: 1
})

const formRules = {
  title: [{ required: true, message: '请输入制度标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择制度类别', trigger: 'change' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }],
  content: [{ required: true, message: '请输入制度内容', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await pagePolicies(queryParams)
    records.value = res.data.records
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, {
      id: null, title: '', category: '', content: '', amountLimit: null,
      effectiveDate: '', expireDate: '', status: 1
    })
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (form.id) {
      await updatePolicy(form)
      ElMessage.success('更新成功')
    } else {
      await createPolicy(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const toggleStatus = async (row) => {
  await togglePolicyStatus(row.id, row.status === 1 ? 0 : 1)
  ElMessage.success('操作成功')
  loadData()
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除制度「${row.title}」吗？`, '提示', { type: 'warning' })
  await deletePolicy(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 10px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
