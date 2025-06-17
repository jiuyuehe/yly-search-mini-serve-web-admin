<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="任务名称" prop="taskName">
        <el-input
          v-model="queryParams.taskName"
          placeholder="请输入"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-240px">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.CONTROL_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['rag:control-task:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['rag:control-task:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="ID" align="center" prop="id" />
      <el-table-column label="任务名称" align="center" prop="taskName" />
      <el-table-column label="存储介质" align="center" prop="storageId">
        <template #default="scope">
          {{ getStorageName(scope.row.storageId) }}
        </template>
      </el-table-column>
      <el-table-column label="基础信息扫描" align="center">
        <template #default="scope">
          {{ (scope.row.basicFileInfoCount || 0) + '/' + (scope.row.totalFiles || 0) }}
        </template>
      </el-table-column>
      <el-table-column label="内容扫描" align="center">
        <template #default="scope">
          {{ (scope.row.contentProcessedCount || 0) + '/' + (scope.row.totalFiles || 0) }}
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.CONTROL_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column
        label="更新时间"
        align="center"
        prop="lastExecuteTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" min-width="280px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            v-if="scope.row.status !== 2"
            @click="handleStart(scope.row)"
            :loading="actionLoading[scope.row.id]"
            v-hasPermi="['rag:control-task:update']"
          >
            {{ scope.row.lastExecuteTime ? '重新启动' : '启动' }}
          </el-button>
          <el-button
            link
            type="warning"
            v-if="scope.row.status === 2"
            @click="handlePause(scope.row)"
            :loading="actionLoading[scope.row.id]"
            v-hasPermi="['rag:control-task:update']"
          >
            停止
          </el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['rag:control-task:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['rag:control-task:delete']"
          >
            删除
          </el-button>
          <el-button
            link
            type="info"
            @click="openDetail(scope.row.id)"
            v-if="!isDatabaseStorage(scope.row.storageId)"
          >
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <ControlTaskForm ref="formRef" @success="getList" />
  
  <!-- 任务详情弹窗 -->
  <TaskDetailModal ref="detailRef" />
</template>

<script setup lang="ts">
import { ControlTaskApi, ControlTaskVO } from '@/api/rag/controltask'
import { useStorageMediumCache } from '@/hooks/web/useStorageMediumCache'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import download from '@/utils/download'
import { dateFormatter } from '@/utils/formatTime'
import ControlTaskForm from './ControlTaskForm.vue'
import TaskDetailModal from './TaskDetailModal.vue'

/** 布控任务 列表 */
defineOptions({ name: 'ControlTask' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化
const { getStorageName, getStorageList } = useStorageMediumCache() // 存储介质缓存

const loading = ref(true) // 列表的加载中
const list = ref<ControlTaskVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const storageList = ref<any[]>([]) // <--- Add this line to store the fetched list
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  indexId: undefined,
  taskName: undefined,
  taskDesc: undefined,
  contentJson: undefined,
  totalFiles: undefined,
  fileType: undefined,
  processTypes: undefined,
  storageId: undefined,
  knowledgeBaseId: undefined,
  scheduleType: undefined,
  scheduleConf: undefined,
  status: undefined,
  resultCount: undefined,
  lastExecuteTime: [],
  faceCount: undefined,
  textCount: undefined,
  objectCount: undefined,
  createTime: [],
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中
const actionLoading = ref<{ [key: number]: boolean }>({}) // 操作按钮的加载中

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ControlTaskApi.getControlTaskPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 详情操作 */
const detailRef = ref()
const openDetail = (id: number) => {
  detailRef.value.open(id)
}

/** 启动任务 */
const handleStart = async (row: any) => {
  if (actionLoading.value[row.id]) {
    return
  }
  if (row.lastExecuteTime) {
    try {
      await message.confirm('重新启动会重新扫描文件夹，请谨慎操作！！！')
    } catch {
      return // 用户取消
    }
  }
  actionLoading.value[row.id] = true
  setTimeout(async () => {
    try {
      await ControlTaskApi.handleControlTask({
        id: row.id,
        status: 2 // 处理中状态
      })
      message.success('启动成功！')
      await getList()
    } catch (error) {
      console.error('任务启动失败', error)
    } finally {
      actionLoading.value[row.id] = false
    }
  }, 3000)
}

/** 暂停任务 */
const handlePause = (row: any) => {
  if (actionLoading.value[row.id]) {
    return
  }
  actionLoading.value[row.id] = true
  setTimeout(async () => {
    try {
      await ControlTaskApi.handleControlTask({
        id: row.id,
        status: 3 // 已暂停状态
      })
      message.success('暂停成功！')
      await getList()
    } catch (error) {
      console.error('任务暂停失败', error)
    } finally {
      actionLoading.value[row.id] = false
    }
  }, 3000)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 查找要删除的任务
    const taskToDelete = list.value.find(item => item.id === id)
    if (taskToDelete?.status === 2) {
      message.warning('请先停止任务后再删除！！！')
      return
    }
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ControlTaskApi.deleteControlTask(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await ControlTaskApi.exportControlTask(queryParams)
    download.excel(data, '布控任务.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** New implementation for isDatabaseStorage */
const isDatabaseStorage = (storageId) => {
  if (!storageList.value || storageList.value.length === 0) {
    // console.warn('Storage list is not loaded yet or is empty.');
    return false; // Return false if list isn't loaded or is empty
  }
  const storage = storageList.value.find(item => item.id === storageId);
  if (!storage) {
    // console.warn(`Storage with id ${storageId} not found.`);
    return false; // Storage ID not found in the list
  }
  // Check if mediumType is '1' (which we infer means Database type)
  return storage.mediumType === '1'; 
}

/** 初始化 **/
onMounted(async () => {
  storageList.value = await getStorageList() // Fetch and store the list
  getList()
})
</script>