<template>
  <Dialog title="任务执行详情" v-model="dialogVisible" width="1300px">
    <div class="task-progress-container">
      <div class="flex justify-between items-center mb-3">
        <div class="text-lg font-medium text-gray-700">任务执行进度</div>
        <div class="text-sm text-gray-500">{{ completedFiles }}/{{ totalFiles }} 已完成/总文件数</div>
      </div>
      
      <!-- 进度条 -->
      <el-progress :percentage="progressPercent" :stroke-width="10" />
    </div>
    
    <el-table v-loading="loading" :data="fileList" border style="width: 100%">
      <el-table-column label="文件名" prop="fileName" min-width="160" />
      <el-table-column label="元数据提取" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.METADATA)" 
                :icon="getTaskStatusIcon(scope.row.status, TaskTypes.METADATA, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="内容提取" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.CONTENT)" 
                :icon="getTaskStatusIcon(scope.row.succStatus, TaskTypes.CONTENT, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="文档摘要" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.SUMMARY)" 
                :icon="getTaskStatusIcon(scope.row.succStatus, TaskTypes.SUMMARY, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="语言识别" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.LANGUAGE)" 
                :icon="getTaskStatusIcon(scope.row.succStatus, TaskTypes.LANGUAGE, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="文本翻译" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.TRANSLATE)" 
                :icon="getTaskStatusIcon(scope.row.succStatus, TaskTypes.TRANSLATE, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="标签提取" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.TAG)" 
                :icon="getTaskStatusIcon(scope.row.succStatus, TaskTypes.TAG, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="实体提取" width="100" align="center">
        <template #default="scope">
          <Icon
v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.ENTITY)" 
                :icon="getTaskStatusIcon(scope.row.succStatus, TaskTypes.ENTITY, scope.row.errStatus)" />
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120" align="center">
        <template #default="scope">
          <div class="flex items-center justify-center">
            <el-tooltip v-if="getFileStatus(scope.row).showWarning && scope.row.errMsg" :content="scope.row.errMsg">
              <Icon icon="ep:warning" class="mr-1 text-yellow-500" />
            </el-tooltip>
            <el-tag :type="getFileStatus(scope.row).type">{{ getFileStatus(scope.row).text }}</el-tag>
          </div>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 添加分页组件 -->
    <div class="mt-3 flex justify-end">
      <el-pagination
        v-model:current-page="pageInfo.page"
        v-model:page-size="pageInfo.pageSize"
        :total="totalFiles"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
    
    <template #footer>
      <el-button type="primary" @click="dialogVisible = false">关闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ControlTaskApi } from '@/api/rag/controltask'

defineOptions({ name: 'TaskDetailModal' })

const dialogVisible = ref(false)
const loading = ref(false)
const taskId = ref()
const fileList = ref([])
const totalFiles = ref(0)
const completedFiles = ref(0)

// 分页信息
const pageInfo = reactive({
  page: 1,
  pageSize: 10
})

// 计算完成百分比
const progressPercent = computed(() => {
  if (totalFiles.value === 0) return 0
  return Math.floor((completedFiles.value / totalFiles.value) * 100)
})

// 任务类型和状态定义
const TaskTypes = {
  METADATA: 1,
  CONTENT: 2,
  SUMMARY: 4,
  LANGUAGE: 8,
  TRANSLATE: 16,
  TAG: 32,  
  ENTITY: 64
}

// 判断任务类型是否启用
const isTaskTypeEnabled = (parseStatus, type) => {
  return (parseStatus & type) === type
}

// 判断任务类型是否完成
const isTaskTypeCompleted = (status, type) => {
  return (status & type) === type
}

// 获取任务状态图标
const getTaskStatusIcon = (status, type, errStatus) => {
  // 检查任务是否失败
  if (isTaskTypeEnabled(errStatus, type)) {
    return 'ep:close'
  }

  // 检查任务是否完成
  const done = isTaskTypeCompleted(status, type)
  return done ? 'ep:check' : 'ep:loading'
}

// 获取文件整体状态
const getFileStatus = (row) => {
  let status = { type: 'info', text: '未开始', showWarning: false }
  
  if (row.succStatus == 0 && row.errStatus == 0) {
    status = { type: 'info', text: '未开始', showWarning: false }
  } else if (row.succStatus != row.parseStatus && row.errStatus == 0) {
    status = { type: 'primary', text: '进行中', showWarning: false }
  } else if (row.succStatus == row.parseStatus) {
    status = { type: 'success', text: '成功', showWarning: false }
  } else if (row.errStatus == row.parseStatus) { 
    status = { type: 'danger', text: '失败', showWarning: true }
  } else {
    status = { type: 'warning', text: '部分成功', showWarning: true }
  }
  
  return status
}

// 获取任务列表数据
const fetchTaskDetail = async () => {
  if (!taskId.value) return
  
  loading.value = true
  try {
    const response = await ControlTaskApi.getControlTaskDetail(
      taskId.value, 
      pageInfo.page, 
      pageInfo.pageSize
    )
    fileList.value = response.pageResult.list || []
    totalFiles.value = response.pageResult.total || 0
    completedFiles.value = response.pageResult.completedCount || 0
  } catch (error) {
    console.error('获取任务详情失败', error)
  } finally {
    loading.value = false
  }
}

// 处理分页变化
const handleSizeChange = (size: number) => {
  pageInfo.pageSize = size
  fetchTaskDetail()
}

const handleCurrentChange = (page: number) => {
  pageInfo.page = page
  fetchTaskDetail()
}

// 打开弹窗
const open = (id: number) => {
  dialogVisible.value = true
  taskId.value = id
  pageInfo.page = 1
  fetchTaskDetail()
}

defineExpose({ open })
</script>

<style scoped>
.task-progress-container {
  padding: 16px;
  margin-bottom: 16px;
  background-color: #f5f5f5;
  border-radius: 4px;
}
</style>