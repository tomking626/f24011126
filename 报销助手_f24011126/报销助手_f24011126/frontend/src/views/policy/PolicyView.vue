<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报销制度查询</span>
          <el-select v-model="selectedCategory" placeholder="按类别筛选" clearable style="width: 200px">
            <el-option label="差旅 travel" value="travel" />
            <el-option label="招待 expense" value="expense" />
            <el-option label="设备 equipment" value="equipment" />
            <el-option label="其他 other" value="other" />
          </el-select>
        </div>
      </template>

      <el-empty v-if="filteredPolicies.length === 0" description="暂无有效制度" />

      <el-collapse v-else v-model="activeNames">
        <el-collapse-item
          v-for="policy in filteredPolicies"
          :key="policy.id"
          :name="policy.id"
          :title="policy.title"
        >
          <div class="policy-detail">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="制度类别">{{ categoryMap[policy.category] }}</el-descriptions-item>
              <el-descriptions-item label="金额上限">
                <span v-if="policy.amountLimit">¥{{ policy.amountLimit.toFixed(2) }}</span>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="生效日期">{{ policy.effectiveDate }}</el-descriptions-item>
              <el-descriptions-item label="失效日期">{{ policy.expireDate || '长期有效' }}</el-descriptions-item>
            </el-descriptions>
            <div class="policy-content">
              <h4>制度内容：</h4>
              <pre>{{ policy.content }}</pre>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listActivePolicies } from '@/api/policy'

const policies = ref([])
const selectedCategory = ref('')
const activeNames = ref([])

const categoryMap = {
  travel: '差旅',
  expense: '招待',
  equipment: '设备',
  other: '其他'
}

const filteredPolicies = computed(() => {
  if (!selectedCategory.value) return policies.value
  return policies.value.filter(p => p.category === selectedCategory.value)
})

const loadData = async () => {
  const res = await listActivePolicies()
  policies.value = res.data || []
  if (policies.value.length > 0) {
    activeNames.value = [policies.value[0].id]
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-container {
  padding: 10px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.policy-detail {
  padding: 10px 0;
}
.policy-content h4 {
  margin: 15px 0 8px;
  color: #303133;
}
.policy-content pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.8;
}
</style>
