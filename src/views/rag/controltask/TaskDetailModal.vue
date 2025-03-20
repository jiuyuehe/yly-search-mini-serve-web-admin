<template>
  <Dialog title="任务执行详情" v-model="dialogVisible" width="1300px">
    <div class="task-progress-container">
      <div class="flex justify-between items-center mb-3">
        <div class="text-lg font-medium text-gray-700">任务执行进度</div>
        <div class="text-sm text-gray-500"
          >{{ completedFiles }}/{{ totalFiles }} 已完成/总文件数</div
        >
      </div>

      <!-- 进度条 -->
      <el-progress :percentage="progressPercent" :stroke-width="10" />
    </div>

    <el-table v-loading="loading" :data="fileList" border style="width: 100%">
      <el-table-column label="文件名" prop="fileName" min-width="160" />
      <el-table-column label="元数据提取" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.METADATA)">
            <Icon
              v-if="isTaskTypeCompleted(scope.row.succStatus, TaskTypes.METADATA)"
              icon="ep:check"
              class="text-green-500"
            />
            <Icon
              v-else-if="isTaskTypeError(scope.row.errStatus, TaskTypes.METADATA)"
              icon="ep:close"
              class="text-red-500"
            />
            <span v-else>🕒</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="内容提取" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.CONTENT)">
            <Icon v-if="scope.row.status === 0" icon="ep:check" class="text-green-500" />
            <span v-else-if="scope.row.status === 2 || scope.row.status === 3">🕒</span>
            <Icon
              v-else-if="scope.row.status === 1 || scope.row.status === 4"
              icon="ep:close"
              class="text-red-500"
            />
          </span>
        </template>
      </el-table-column>
      <el-table-column label="文档摘要" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.SUMMARY)">
            <Icon
              v-if="isTaskTypeCompleted(scope.row.succStatus, TaskTypes.SUMMARY)"
              icon="ep:check"
              class="text-green-500"
            />
            <Icon
              v-else-if="isTaskTypeError(scope.row.errStatus, TaskTypes.SUMMARY)"
              icon="ep:close"
              class="text-red-500"
            />
            <span v-else>🕒</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="语言识别" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.LANGUAGE)">
            <Icon
              v-if="isTaskTypeCompleted(scope.row.succStatus, TaskTypes.LANGUAGE)"
              icon="ep:check"
              class="text-green-500"
            />
            <Icon
              v-else-if="isTaskTypeError(scope.row.errStatus, TaskTypes.LANGUAGE)"
              icon="ep:close"
              class="text-red-500"
            />
            <span v-else>🕒</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="文本翻译" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.TRANSLATE)">
            <Icon
              v-if="isTaskTypeCompleted(scope.row.succStatus, TaskTypes.TRANSLATE)"
              icon="ep:check"
              class="text-green-500"
            />
            <Icon
              v-else-if="isTaskTypeError(scope.row.errStatus, TaskTypes.TRANSLATE)"
              icon="ep:close"
              class="text-red-500"
            />
            <span v-else>🕒</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="标签提取" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.TAG)">
            <Icon
              v-if="isTaskTypeCompleted(scope.row.succStatus, TaskTypes.TAG)"
              icon="ep:check"
              class="text-green-500"
            />
            <Icon
              v-else-if="isTaskTypeError(scope.row.errStatus, TaskTypes.TAG)"
              icon="ep:close"
              class="text-red-500"
            />
            <span v-else>🕒</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="实体提取" width="100" align="center">
        <template #default="scope">
          <span v-if="isTaskTypeEnabled(scope.row.parseStatus, TaskTypes.ENTITY)">
            <Icon
              v-if="isTaskTypeCompleted(scope.row.succStatus, TaskTypes.ENTITY)"
              icon="ep:check"
              class="text-green-500"
            />
            <Icon
              v-else-if="isTaskTypeError(scope.row.errStatus, TaskTypes.ENTITY)"
              icon="ep:close"
              class="text-red-500"
            />
            <span v-else>🕒</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120" align="center">
        <template #default="scope">
          <el-tag :type="getOverallStatus(scope.row).type">{{
            getOverallStatus(scope.row).text
          }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加分页组件，样式与截图一致 -->
    <div class="mt-3 flex justify-between items-center">
      <div>共 {{ totalFiles }} 条</div>
      <div class="flex items-center">
        <el-select v-model="pageInfo.pageSize" size="small" class="mr-2" @change="handleSizeChange">
          <el-option :value="10" label="10条/页" />
          <el-option :value="20" label="20条/页" />
          <el-option :value="50" label="50条/页" />
        </el-select>

        <el-pagination
          layout="prev, pager, next"
          :total="totalFiles"
          :page-size="pageInfo.pageSize"
          v-model:current-page="pageInfo.page"
          @current-change="handleCurrentChange"
          small
        />

        <span class="ml-3">前往</span>
        <el-input
          v-model="goToPage"
          size="small"
          style="width: 50px"
          class="mx-2"
          @keyup.enter="handleGoToPage"
        />
        <span>页</span>
      </div>
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
const goToPage = ref('')

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
const isTaskTypeCompleted = (succStatus, type) => {
  return (succStatus & type) === type
}

// 判断任务是否出错
const isTaskTypeError = (errStatus, type) => {
  return (errStatus & type) === type
}

// 获取整体状态
const getOverallStatus = (row) => {
  if (row.succStatus == row.parseStatus) {
    return { type: 'success', text: '成功' }
  } else if (row.errStatus == row.parseStatus) {
    return { type: 'danger', text: '失败' }
  } else if (row.succStatus > 0 || row.errStatus > 0) {
    return { type: 'warning', text: '部分成功' }
  } else if (row.status != undefined) {
    return { type: 'info', text: '已开始' }
  } else {
    return { type: 'info', text: '未开始' }
  }
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

// 处理手动跳转页面
const handleGoToPage = () => {
  const page = parseInt(goToPage.value)
  if (page && page > 0 && page <= Math.ceil(totalFiles.value / pageInfo.pageSize)) {
    pageInfo.page = page
    fetchTaskDetail()
  }
  goToPage.value = ''
}

// 打开弹窗
const open = (id: number) => {
  dialogVisible.value = true
  taskId.value = id
  pageInfo.page = 1
  goToPage.value = ''
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
