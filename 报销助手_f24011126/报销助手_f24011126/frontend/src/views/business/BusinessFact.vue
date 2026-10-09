<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>业务事实维护</span>
          <div>
            <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 140px; margin-right: 10px" @change="loadData">
              <el-option label="草稿" :value="0" />
              <el-option label="已提交" :value="1" />
              <el-option label="已关联单据" :value="2" />
              <el-option label="已取消" :value="3" />
            </el-select>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon>新增业务
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="records" border stripe v-loading="loading">
        <el-table-column prop="factCode" label="业务单号" width="140" />
        <el-table-column prop="title" label="业务标题" min-width="180" />
        <el-table-column prop="factType" label="业务类型" width="120">
          <template #default="{ row }">{{ typeMap[row.factType] }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="业务金额" width="120">
          <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="factDate" label="发生日期" width="120" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status].type">{{ statusMap[row.status].label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)" v-if="canEdit(row)">编辑</el-button>
            <el-button link type="success" size="small" @click="submitFact(row)" v-if="row.status === 0">提交</el-button>
            <el-button link type="warning" size="small" @click="cancelFact(row)" v-if="row.status === 0 || row.status === 1">取消</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)" v-if="canEdit(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑业务事实' : '新增业务事实'" width="600px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="业务标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入业务标题" />
        </el-form-item>
        <el-form-item label="业务类型" prop="factType">
          <el-select v-model="form.factType" placeholder="请选择业务类型" style="width: 100%">
            <el-option label="客户拜访" value="client_visit" />
            <el-option label="会议" value="meeting" />
            <el-option label="项目" value="project" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="发生日期" prop="factDate">
          <el-date-picker v-model="form.factDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="业务金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="2" :step="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="关联制度">
          <el-select v-model="form.policyId" placeholder="请选择关联制度（可选）" filterable clearable style="width: 100%">
            <el-option v-for="p in policies" :key="p.id" :label="p.title" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务描述">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入业务描述" />
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
import { pageBusinessFacts, createBusinessFact, updateBusinessFact, deleteBusinessFact, submitBusinessFact, cancelBusinessFact } from '@/api/businessFact'
import { listActivePolicies } from '@/api/policy'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const formRef = ref(null)
const records = ref([])
const total = ref(0)
const policies = ref([])

const typeMap = { client_visit: '客户拜访', meeting: '会议', project: '项目', other: '其他' }

const statusMap = {
  0: { label: '草稿', type: 'info' },
  1: { label: '已提交', type: 'warning' },
  2: { label: '已关联单据', type: 'success' },
  3: { label: '已取消', type: 'danger' }
}

const queryParams = reactive({ pageNum: 1, pageSize: 10, status: null })

const form = reactive({
  id: null, title: '', factType: '', factDate: '', amount: 0, description: '', policyId: null
})

const formRules = {
  title: [{ required: true, message: '请输入业务标题', trigger: 'blur' }],
  factType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  factDate: [{ required: true, message: '请选择发生日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入业务金额', trigger: 'blur' }]
}

const canEdit = (row) => row.status === 0

const loadData = async () => {
  loading.value = true
  try {
    const params = { ...queryParams }
    if (params.status === '' || params.status === null) delete params.status
    const res = await pageBusinessFacts(params)
    records.value = res.data.records
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const loadPolicies = async () => {
  const res = await listActivePolicies()
  policies.value = res.data || []
}

const openDialog = (row) => {
  loadPolicies()
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, {
      id: null, title: '', factType: '', factDate: '', amount: 0, description: '', policyId: null
    })
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (form.id) {
      await updateBusinessFact(form)
      ElMessage.success('更新成功')
    } else {
      await createBusinessFact(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const submitFact = async (row) => {
  await ElMessageBox.confirm('确定提交该业务事实吗？', '提示', { type: 'warning' })
  await submitBusinessFact(row.id)
  ElMessage.success('提交成功')
  loadData()
}

const cancelFact = async (row) => {
  await ElMessageBox.confirm('确定取消该业务事实吗？', '提示', { type: 'warning' })
  await cancelBusinessFact(row.id)
  ElMessage.success('已取消')
  loadData()
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' })
  await deleteBusinessFact(row.id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 10px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
