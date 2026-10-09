<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>我的报销单据</span>
          <div>
            <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 140px; margin-right: 10px" @change="loadData">
              <el-option label="待审核" :value="0" />
              <el-option label="审核中" :value="1" />
              <el-option label="已通过" :value="2" />
              <el-option label="已驳回" :value="3" />
              <el-option label="已付款" :value="4" />
            </el-select>
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon>新建报销
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="records" border stripe v-loading="loading">
        <el-table-column prop="docNo" label="单据编号" width="140" />
        <el-table-column prop="title" label="报销标题" min-width="180" />
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="submitTime" label="提交时间" width="170" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status].type">{{ statusMap[row.status].label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reviewRemark" label="审核备注" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            <el-button link type="primary" size="small" v-if="row.status === 0 || row.status === 3" @click="openDialog(row)">编辑</el-button>
            <el-button link type="success" size="small" v-if="row.status === 0 || row.status === 3" @click="submitDoc(row)">提交</el-button>
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

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑报销单' : '新建报销单'" width="600px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="报销标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入报销标题" />
        </el-form-item>
        <el-form-item label="报销金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="2" :step="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="关联制度">
          <el-select v-model="form.policyId" placeholder="请选择关联制度（可选）" filterable style="width: 100%">
            <el-option v-for="p in policies" :key="p.id" :label="p.title" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联业务事实">
          <el-select v-model="form.businessFactId" placeholder="请选择业务事实（可选）" filterable style="width: 100%">
            <el-option v-for="f in myBusinessFacts" :key="f.id" :label="f.title + ' (' + f.factCode + ')'" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报销事由" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="请输入报销事由" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存草稿</el-button>
        <el-button type="success" @click="handleSubmitAndSubmit">保存并提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="单据详情" width="500px">
      <el-descriptions v-if="currentDetail" :column="1" border>
        <el-descriptions-item label="单据编号">{{ currentDetail.docNo }}</el-descriptions-item>
        <el-descriptions-item label="报销标题">{{ currentDetail.title }}</el-descriptions-item>
        <el-descriptions-item label="报销金额">¥{{ currentDetail.amount.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusMap[currentDetail.status].type">{{ statusMap[currentDetail.status].label }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ currentDetail.submitTime }}</el-descriptions-item>
        <el-descriptions-item label="报销事由">{{ currentDetail.reason }}</el-descriptions-item>
        <el-descriptions-item label="审核备注">{{ currentDetail.reviewRemark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { myDocuments, createDocument, updateDocument, submitDocument } from '@/api/document'
import { listActivePolicies } from '@/api/policy'
import { myBusinessFacts as apiMyBusinessFacts } from '@/api/businessFact'

const loading = ref(false)
const dialogVisible = ref(false)
const detailVisible = ref(false)
const formRef = ref(null)
const records = ref([])
const total = ref(0)
const policies = ref([])
const myBusinessFacts = ref([])
const currentDetail = ref(null)

const statusMap = {
  0: { label: '待审核', type: 'info' },
  1: { label: '审核中', type: 'warning' },
  2: { label: '已通过', type: 'success' },
  3: { label: '已驳回', type: 'danger' },
  4: { label: '已付款', type: '' }
}

const queryParams = reactive({ pageNum: 1, pageSize: 10, status: null })

const form = reactive({
  id: null, title: '', amount: 0, reason: '', policyId: null, businessFactId: null
})

const formRules = {
  title: [{ required: true, message: '请输入报销标题', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入报销金额', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入报销事由', trigger: 'blur' }]
}

const loadData = async () => {
  loading.value = true
  try {
    const params = { ...queryParams }
    if (params.status === '' || params.status === null) delete params.status
    const res = await myDocuments(params)
    records.value = res.data.records
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const loadOptions = async () => {
  const [pRes, fRes] = await Promise.all([
    listActivePolicies(),
    apiMyBusinessFacts({ pageNum: 1, pageSize: 100 })
  ])
  policies.value = pRes.data || []
  myBusinessFacts.value = fRes.data?.records || []
}

const openDialog = (row) => {
  loadOptions()
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, { id: null, title: '', amount: 0, reason: '', policyId: null, businessFactId: null })
  }
  dialogVisible.value = true
}

const viewDetail = (row) => {
  currentDetail.value = row
  detailVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  if (form.id) {
    await updateDocument(form)
    ElMessage.success('保存成功')
  } else {
    await createDocument(form)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  loadData()
}

const handleSubmitAndSubmit = async () => {
  await formRef.value.validate()
  let docId = form.id
  if (form.id) {
    await updateDocument(form)
  } else {
    const res = await createDocument(form)
    docId = res.data.id
  }
  await submitDocument(docId)
  ElMessage.success('提交成功')
  dialogVisible.value = false
  loadData()
}

const submitDoc = async (row) => {
  await ElMessageBox.confirm('确定提交该单据进行审核吗？', '提示', { type: 'warning' })
  await submitDocument(row.id)
  ElMessage.success('提交成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 10px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
