<template>
  <Teleport to="body">
    <transition name="upload-task-popup">
      <div v-if="visible && tasks.length" class="upload-task-popup" @click.stop>
        <div class="upload-task-popup__header">
          <div class="upload-task-popup__title-wrap">
            <div class="upload-task-popup__icon">
              <el-icon><UploadFilled /></el-icon>
            </div>
            <div class="upload-task-popup__title">
              <span>上传任务</span>
              <span class="upload-task-popup__count">{{ doneCount }}/{{ tasks.length }}</span>
            </div>
          </div>

          <div class="upload-task-popup__actions">
            <el-tooltip content="清空全部" placement="top">
              <el-button
                class="upload-task-popup__action-btn"
                link
                type="info"
                aria-label="清空全部上传任务"
                @click="emit('clear-all')"
              >
                <el-icon><Brush /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="关闭" placement="top">
              <el-button
                class="upload-task-popup__action-btn"
                link
                type="info"
                aria-label="关闭上传任务弹窗"
                @click="emit('close')"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>

        <div class="upload-task-popup__body">
          <div v-for="task in tasks" :key="task.uid" class="upload-task-item">
            <div class="upload-task-item__icon" :class="`is-${getStatusTone(task.status)}`">
              <el-icon v-if="task.status === 'success'">
                <CircleCheckFilled />
              </el-icon>
              <el-icon v-else-if="task.status === 'fail'">
                <CircleCloseFilled />
              </el-icon>
              <el-icon v-else>
                <UploadFilled />
              </el-icon>
            </div>

            <div class="upload-task-item__content">
              <div class="upload-task-item__title-row">
                <div class="upload-task-item__name" :title="task.name">
                  {{ task.name }}
                </div>
                <div class="upload-task-item__status">{{ getStatusLabel(task.status) }}</div>
              </div>

              <el-progress
                :percentage="task.status === 'uploading' ? task.percent || 0 : 100"
                :stroke-width="4"
                :show-text="false"
                :color="getProgressColor(task.status)"
              />

              <div class="upload-task-item__meta">
                <span class="upload-task-item__meta-name" :title="task.name">{{ task.name }}</span>
                <span class="upload-task-item__meta-size">{{ formatSize(task.size) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CircleCheckFilled,
  CircleCloseFilled,
  Close,
  Brush,
  UploadFilled
} from '@element-plus/icons-vue'
import { formatFileSize } from '@/utils/file'

defineOptions({ name: 'RagAiKnowledgeBaseUploadTaskPopup' })

type UploadTaskStatus = 'uploading' | 'success' | 'fail' | 'parsing' | 'waiting'

interface UploadTaskItem {
  uid: string
  name: string
  size: number
  status: UploadTaskStatus
  percent?: number
  parsePercent?: number
}

const props = defineProps<{
  visible: boolean
  tasks: UploadTaskItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'clear-all'): void
}>()

const doneCount = computed(
  () =>
    props.tasks.filter((task) => task.status !== 'uploading' && task.status !== 'waiting').length
)

const formatSize = (size: number) => {
  if (!size && size !== 0) return '--'
  return formatFileSize(Number(size))
}

const getStatusLabel = (status: UploadTaskStatus) => {
  const map: Record<UploadTaskStatus, string> = {
    uploading: '上传中',
    success: '完成',
    fail: '失败',
    parsing: '解析中',
    waiting: '等待中'
  }
  return map[status] || '等待中'
}

const getStatusTone = (status: UploadTaskStatus) => {
  if (status === 'success') return 'success'
  if (status === 'fail') return 'danger'
  return 'primary'
}

const getProgressColor = (status: UploadTaskStatus) => {
  if (status === 'success') return '#22c55e'
  if (status === 'fail') return '#ef4444'
  return '#3b82f6'
}
</script>

<style scoped>
.upload-task-popup {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1;
  display: flex;
  width: min(320px, calc(100vw - 24px));
  max-height: min(360px, calc(100vh - 24px));
  overflow: hidden;
  background: #fff;
  border: 1px solid #d9e2f2;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgb(15 23 42 / 14%);
  flex-direction: column;
}

.upload-task-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e8eef8;
}

.upload-task-popup__title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.upload-task-popup__icon {
  display: flex;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: #1d69d9;
  background: #eef5ff;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-task-popup__title {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.upload-task-popup__count {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.upload-task-popup__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.upload-task-popup__action-btn {
  padding: 0;
  font-size: 16px;
}

.upload-task-popup__body {
  display: flex;
  padding: 10px;
  overflow: auto;
  flex-direction: column;
  gap: 8px;
}

.upload-task-item {
  display: flex;
  padding: 10px;
  background: #fff;
  border: 1px solid #e4eaf4;
  border-radius: 10px;
  gap: 10px;
}

.upload-task-item__icon {
  display: flex;
  width: 36px;
  height: 36px;
  font-size: 17px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-task-item__icon.is-primary {
  color: #1d69d9;
  background: #edf4ff;
}

.upload-task-item__icon.is-success {
  color: #16a34a;
  background: #e8f8ee;
}

.upload-task-item__icon.is-danger {
  color: #dc2626;
  background: #fef2f2;
}

.upload-task-item__content {
  min-width: 0;
  flex: 1;
}

.upload-task-item__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.upload-task-item__name {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  color: #24324b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-task-item__status {
  font-size: 11px;
  color: #64748b;
  flex-shrink: 0;
}

.upload-task-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.upload-task-item__meta-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-task-item__meta-size {
  flex-shrink: 0;
}

.upload-task-popup-enter-active,
.upload-task-popup-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.upload-task-popup-enter-from,
.upload-task-popup-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (width <= 640px) {
  .upload-task-popup {
    right: 10px;
    bottom: 10px;
    left: 10px;
    width: auto;
  }
}
</style>
