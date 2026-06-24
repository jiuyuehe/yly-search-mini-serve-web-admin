<template>
  <el-drawer v-model="visible" title="任务进度" size="56%" destroy-on-close>
    <div v-loading="loading" class="space-y-4">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务名称">{{ summary.taskName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务ID">{{ summary.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <dict-tag v-if="summary.status !== undefined" :type="DICT_TYPE.CONTROL_STATUS" :value="summary.status" />
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="批次ID">{{ report.scanBatchId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最后执行时间">{{ summary.lastExecuteTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="最后扫描路径" :span="1">{{ report.lastVisitedPath || '-' }}</el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="report.failedShards || report.failedFileJobs"
        type="warning"
        :closable="false"
        show-icon
        :title="`存在失败项：分片 ${report.failedShards || 0} 个，文件任务 ${report.failedFileJobs || 0} 个`"
      />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="progress-panel">
          <div class="panel-title">分片进度</div>
          <el-progress :percentage="shardProgress" :stroke-width="10" />
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>总数：{{ report.totalShards || 0 }}</div>
            <div>成功：{{ report.successShards || 0 }}</div>
            <div>处理中：{{ report.processingShards || 0 }}</div>
            <div>等待：{{ report.waitingShards || 0 }}</div>
            <div>失败：{{ report.failedShards || 0 }}</div>
            <div>停止：{{ report.stoppedShards || 0 }}</div>
          </div>
        </div>

        <div class="progress-panel">
          <div class="panel-title">文件任务进度</div>
          <el-progress :percentage="fileProgress" :stroke-width="10" />
          <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>待处理：{{ report.waitingFileJobs || 0 }}</div>
            <div>处理中：{{ report.processingFileJobs || 0 }}</div>
            <div>成功：{{ report.successFileJobs || 0 }}</div>
            <div>失败：{{ report.failedFileJobs || 0 }}</div>
            <div>跳过：{{ report.skippedFileJobs || 0 }}</div>
            <div>活跃：{{ report.activeFileJobs || 0 }}</div>
          </div>
        </div>
      </div>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="累计扫描文件数">{{ report.scannedFiles || 0 }}</el-descriptions-item>
        <el-descriptions-item label="累计扫描目录数">{{ report.scannedDirs || 0 }}</el-descriptions-item>
        <el-descriptions-item label="跳过数量">{{ report.skippedCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="扫描失败数">{{ report.failedCount || 0 }}</el-descriptions-item>
        <el-descriptions-item label="活跃文件任务">{{ report.activeFileJobs || 0 }}</el-descriptions-item>
        <el-descriptions-item label="文件失败数">{{ report.failedFileJobs || 0 }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ControlTaskApi, ControlTaskScanReportVO, ControlTaskVO } from '@/api/rag/controltask'
import { DICT_TYPE } from '@/utils/dict'

defineOptions({ name: 'TaskProgressDrawer' })

const visible = ref(false)
const loading = ref(false)
const report = ref<ControlTaskScanReportVO>({ taskId: 0 })
const summary = ref<Partial<ControlTaskVO>>({})
let timer: ReturnType<typeof setInterval> | undefined

const shardProgress = computed(() => {
  const total = Number(report.value.totalShards || 0)
  if (!total) {
    return 0
  }
  const done = Number(report.value.successShards || 0)
  return Math.min(100, Math.floor((done / total) * 100))
})

const fileProgress = computed(() => {
  const total =
    Number(report.value.waitingFileJobs || 0) +
    Number(report.value.processingFileJobs || 0) +
    Number(report.value.successFileJobs || 0) +
    Number(report.value.failedFileJobs || 0) +
    Number(report.value.skippedFileJobs || 0)
  if (!total) {
    return 0
  }
  const done = Number(report.value.successFileJobs || 0) + Number(report.value.skippedFileJobs || 0)
  return Math.min(100, Math.floor((done / total) * 100))
})

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

const fetchReport = async () => {
  if (!summary.value.id) {
    return
  }
  loading.value = true
  try {
    const data = await ControlTaskApi.getScanReport(summary.value.id)
    report.value = data || { taskId: summary.value.id }
    if (report.value.taskName == null) {
      report.value.taskName = summary.value.taskName
    }
    if (report.value.status == null) {
      report.value.status = summary.value.status
    }
    if (report.value.lastExecuteTime == null) {
      report.value.lastExecuteTime = summary.value.lastExecuteTime as any
    }
  } finally {
    loading.value = false
  }
}

const open = async (row: ControlTaskVO) => {
  summary.value = { ...row }
  report.value = { taskId: row.id, taskName: row.taskName, status: row.status, lastExecuteTime: row.lastExecuteTime as any }
  visible.value = true
  await fetchReport()
  stopTimer()
  timer = setInterval(() => {
    if (!visible.value) {
      stopTimer()
      return
    }
    fetchReport()
  }, 5000)
}

watch(visible, (val) => {
  if (!val) {
    stopTimer()
  }
})

onBeforeUnmount(() => {
  stopTimer()
})

defineExpose({ open })
</script>

<style scoped>
.progress-panel {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  background: var(--el-fill-color-blank);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
</style>
