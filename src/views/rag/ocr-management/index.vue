<template>
  <ContentWrap>
    <div class="ocr-management">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon running">
              <Icon icon="ep:video-play" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ statistics.runningTasks || 0 }}</div>
              <div class="stat-label">正在执行</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon completed">
              <Icon icon="ep:circle-check" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ todayCompleted }}</div>
              <div class="stat-label">成功总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon failed">
              <Icon icon="ep:circle-close" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ todayFailed }}</div>
              <div class="stat-label">失败+取消总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 任务列表 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span>OCR 任务管理</span>
          <el-button type="primary" @click="refreshStatistics">
            <Icon icon="ep:refresh" class="mr-1" />
            刷新
          </el-button>
        </div>
      </template>

      <!-- 筛选条件 -->
      <el-form :inline="true" :model="queryParams" class="mb-4">
        <el-form-item label="文档ID">
          <el-input
            v-model="queryParams.esId"
            placeholder="请输入文档ID"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryParams.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <Icon icon="ep:search" class="mr-1" />
            查询
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" class="mr-1" />
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 任务表格 -->
      <el-table
        v-loading="loading"
        :data="taskList"
        style="width: 100%"
      >
        <el-table-column prop="esId" label="文档ID" width="200" />
        <el-table-column prop="userId" label="用户ID" width="150" />
        <el-table-column prop="subType" label="操作类型" width="150">
          <template #default="{ row }">
            {{ getOperationText(row.subType) }}
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="status" label="当前状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'processing'"
              type="danger"
              size="small"
              @click="handleCancelTask(row)"
            >
              终止
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="queryParams.pageNo"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        class="mt-4"
        @size-change="getList"
        @current-change="getList"
      />
      <el-empty v-if="!loading && taskList.length === 0" description="暂无 OCR 任务数据" class="mt-4" />
    </el-card>
  </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  cancelOcrTask,
  getEnhancedStatistics,
  getOcrHistory,
  type OcrHistoryItem
} from '@/api/rag/ocr-management'

// 统计数据
const statistics = ref({
  runningTasks: 0
})
const todayCompleted = ref(0)
const todayFailed = ref(0)

// 查询参数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  esId: '',
  status: ''
})

// 任务列表
const taskList = ref<OcrHistoryItem[]>([])
const total = ref(0)
const loading = ref(false)

// 定时器
let refreshTimer: any = null

/** 获取统计信息 */
const getStatistics = async () => {
  try {
    const res = await getEnhancedStatistics()
    statistics.value = {
      runningTasks: res?.runningTasks || 0
    }
    todayCompleted.value = res?.completed || 0
    todayFailed.value = (res?.failed || 0) + (res?.cancelled || 0)
  } catch (error) {
    console.error('获取统计信息失败', error)
  }
}

/** 获取任务列表（从 system_operate_log 查询） */
const getList = async () => {
  loading.value = true
  try {
    const res = await getOcrHistory({
      userId: null, // TODO: 可以从用户上下文获取
      esId: queryParams.esId || undefined,
      status: queryParams.status || undefined,
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize
    })
    taskList.value = res?.list || []
    total.value = res?.total || 0
  } catch (error) {
    console.error('获取任务列表失败', error)
  } finally {
    loading.value = false
  }
}

/** 查询 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置 */
const resetQuery = () => {
  queryParams.esId = ''
  queryParams.status = ''
  handleQuery()
}

/** 刷新统计 */
const refreshStatistics = () => {
  getStatistics()
  getList()
  ElMessage.success('刷新成功')
}

/** 终止任务 */
const handleCancelTask = async (row: OcrHistoryItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要终止文档 ${row.esId} 的 OCR 任务吗？已完成的页面会保留。`,
      '终止确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await cancelOcrTask(row.esId)

    if (res) {
      ElMessage.success('任务已终止')
    } else {
      ElMessage.warning('任务可能已完成或不存在')
    }
    getStatistics()
    getList()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('终止任务失败', error)
      ElMessage.error('终止任务失败')
    }
  }
}

/** 获取操作类型文本 */
const getOperationText = (subType: string) => {
  const texts: Record<string, string> = {
    '启动 OCR 任务': '启动',
    '取消 OCR 任务': '取消',
    'OCR 任务完成': '完成',
    'OCR 任务失败': '失败'
  }
  return texts[subType] || subType
}

/** 查看详情 */
const handleViewDetail = (row: any) => {
  // TODO: 跳转到详情页或打开详情对话框
  ElMessage.info(`查看文档 ${row.esId} 的详情`)
}

/** 格式化时间 */
const formatTime = (value: string | number) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
}

/** 获取状态文本 */
const getStatusText = (status?: string) => {
  const texts: Record<string, string> = {
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    idle: '空闲'
  }
  return status ? texts[status] || status : '-'
}

/** 获取状态标签类型 */
const getStatusType = (status?: string) => {
  const types: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info',
    idle: ''
  }
  return status ? types[status] || 'info' : 'info'
}

/** 启动定时刷新 */
const startAutoRefresh = () => {
  refreshTimer = setInterval(() => {
    getStatistics()
    // 只刷新正在执行的任务
    const processingTasks = taskList.value.filter(t => t.status === 'processing')
    if (processingTasks.length > 0) {
      getList()
    }
  }, 5000) // 每5秒刷新一次
}

/** 停止定时刷新 */
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  getStatistics()
  getList()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped lang="scss">
.ocr-management {
  padding: 20px;

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;

      &.running {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.completed {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }

      &.failed {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      }
    }

    .stat-info {
      flex: 1;

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
      }
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
