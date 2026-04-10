<template>
  <el-card class="ocr-progress-card">
    <template #header>
      <div class="card-header">
        <span>OCR 处理进度</span>
        <el-tag :type="getStatusType(progressInfo?.status)">
          {{ getStatusText(progressInfo?.status) }}
        </el-tag>
      </div>
    </template>

    <div v-if="progressInfo" class="progress-content">
      <!-- 基本信息 -->
      <el-descriptions :column="2" border>
        <el-descriptions-item label="文档ID">
          {{ getEsId(progressInfo) }}
        </el-descriptions-item>
        <el-descriptions-item label="用户ID">
          {{ progressInfo.userId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="总页数">
          {{ progressInfo.totalPages || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="已完成">
          {{ progressInfo.donePages || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="开始时间" :span="2">
          {{ formatTime(progressInfo.startTime) }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 进度条 -->
      <div class="progress-bar-section mt-4">
        <div class="progress-label">
          <span>处理进度</span>
          <span class="progress-percent">{{ progressInfo.progress || 0 }}%</span>
        </div>
        <el-progress
          :percentage="progressInfo.progress || 0"
          :status="getProgressStatus(progressInfo.status)"
          :stroke-width="20"
        />
      </div>

      <!-- 错误信息 -->
      <el-alert
        v-if="progressInfo.error && (progressInfo.status === 'failed' || progressInfo.status === 'cancelled')"
        :title="progressInfo.status === 'cancelled' ? '已取消' : '处理失败'"
        :type="progressInfo.status === 'cancelled' ? 'warning' : 'error'"
        :description="progressInfo.error"
        show-icon
        class="mt-4"
      />

      <!-- 操作按钮 -->
      <div class="action-buttons mt-4">
        <el-button
          v-if="progressInfo.status === 'processing'"
          type="danger"
          @click="$emit('cancel')"
        >
          <Icon icon="ep:video-pause" class="mr-1" />
          终止任务
        </el-button>
        <el-button
          v-if="isTerminalStatus(progressInfo.status)"
          type="primary"
          @click="$emit('restart')"
        >
          <Icon icon="ep:refresh" class="mr-1" />
          重新开始
        </el-button>
      </div>
    </div>

    <el-empty v-else description="暂无进度信息" />
  </el-card>
</template>

<script setup lang="ts">


interface ProgressInfo {
  esId?: string
  bizId?: string | number
  userId?: string
  status?: string
  progress?: number
  donePages?: number
  totalPages?: number
  startTime?: number
  error?: string
}

const props = defineProps<{
  progressInfo?: ProgressInfo
}>()

defineEmits<{
  cancel: []
  restart: []
}>()

/** 判断是否为终态 */
const isTerminalStatus = (status?: string) => {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

/** 提取文档 ID，兼容 esId / bizId */
const getEsId = (progressInfo?: ProgressInfo) => {
  return progressInfo?.esId || progressInfo?.bizId || '-'
}

/** 获取状态类型 */
const getStatusType = (status?: string) => {
  const types: Record<string, any> = {
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
    cancelled: 'info'
  }
  return types[status || ''] || 'info'
}

/** 获取状态文本 */
const getStatusText = (status?: string) => {
  const texts: Record<string, string> = {
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return texts[status || ''] || status || '未知'
}

/** 获取进度条状态 */
const getProgressStatus = (status?: string) => {
  if (status === 'completed') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'exception'
  return undefined
}

/** 格式化时间 */
const formatTime = (timestamp?: number) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped lang="scss">
.ocr-progress-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-content {
    .progress-bar-section {
      .progress-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
        color: #606266;

        .progress-percent {
          font-weight: bold;
          color: #409eff;
        }
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
  }
}
</style>
