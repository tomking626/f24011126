<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>单据审核</span>
          <el-select v-model="queryParams.status" placeholder="全部状态" clearable style="width: 140px" @change="loadData">
            <el-option label="审核中" :value="1" />
            <el-option label="已通过" :value="2" />
            <el-option label="已驳回" :value="3" />
            <el-option label="已付款" :value="4" />
          </el-select>
        </div>
      </template>

      <el-table :data="records" border stripe v-loading="loading">
        <el-table-column prop="docNo" label="单据编号" width="140" />
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ row.userId }}</template>
        </el-table-column>
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
            <template v-if="row.status === 1">
              <el-button link type="success" size="small" @click="handleReview(row, 2)">通过</el-button>
              <el-button link type="danger" size="small" @click="handleReview(row, 3)">驳回</el-button>
            </template>
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

    <el-dialog v-model="detailVisible" title="单据详情" width="500px">
      <el-descriptions v-if="currentDetail" :column="1" border>
        <el-descriptions-item label="单据编号">{{ currentDetail.docNo }}</el-descriptions-item>
        <el-descriptions-item label="申请人ID">{{ currentDetail.userId }}</el-descriptions-item>
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

    <el-dialog v-model="reviewVisible" :title="reviewStatus === 2 ? '通过审核' : '驳回审核'" width="450px">
      <el-form label-width="100px">
        <el-form-item label="审核备注">
          <el-input v-model="reviewRemark" type="textarea" :rows="4" :placeholder="reviewStatus === 2 ? '请输入通过意见（可选）' : '请输入驳回原因'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewStatus === 2 ? 'success' : 'danger'" @click="confirmReview">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pageDocuments, reviewDocument } from '@/api/document'

const loading = ref(false)
const records = ref([])
const total = ref(0)
const detailVisible = ref(false)
const reviewVisible = ref(false)
const currentDetail = ref(null)
const reviewTarget = ref(null)
const reviewStatus = ref(2)
const reviewRemark = ref('')

const statusMap = {
  0: { label: '待审核', type: 'info' },
  1: { label: '审核中', type: 'warning' },
  2: { label: '已通过', type: 'success' },
  3: { label: '已驳回', type: 'danger' },
  4: { label: '已付款', type: '' }
}

const queryParams = reactive({ pageNum: 1, pageSize: 10, status: 1 })

const loadData = async () => {
  loading.value = true
  try {
    const params = { ...queryParams }
    if (params.status === '' || params.status === null) delete params.status
    const res = await pageDocuments(params)
    records.value = res.data.records
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const viewDetail = (row) => {
  currentDetail.value = row
  detailVisible.value = true
}

const handleReview = (row, status) => {
  reviewTarget.value = row
  reviewStatus.value = status
  reviewRemark.value = ''
  reviewVisible.value = true
}

const confirmReview = async () => {
  if (reviewStatus.value === 3 && !reviewRemark.value.trim()) {
    ElMessage.warning('驳回请填写原因')
    return
  }
  await reviewDocument(reviewTarget.value.id, reviewStatus.value, reviewRemark.value)
  ElMessage.success('审核成功')
  reviewVisible.value = false
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 10px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
