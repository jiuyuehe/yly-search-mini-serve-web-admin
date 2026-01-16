<template>
  <Dialog width="60%" :title="themeLibrary.themeName + ' - 文件列表'" v-model="dialogVisible">
    <div class="file-tabs-container">
      <!-- 文件限制说明 -->
      <div class="file-limit-notice">
        <el-alert
          title="Dify 文件限制说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            支持文件类型：{{ SUPPORTED_FILE_TYPES.join(', ') }} | 
            最大文件大小：{{ MAX_FILE_SIZE_MB }}MB
          </template>
        </el-alert>
      </div>

      <!-- 标签页 - 添加tab-change事件监听 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待入库" name="pending">
          <div class="tab-description">与主题库分类匹配相关的文件列表</div>
          
          <!-- 搜索框和批量操作按钮 -->
          <div class="action-bar">
            <el-input 
              v-model="pendingSearchText" 
              placeholder="搜索" 
              prefix-icon="Search"
              clearable
              @input="handlePendingSearch"
              class="search-box"
            />
            <div class="action-buttons">
              <!-- 刷新按钮 -->
              <el-button
                type="default"
                :loading="pendingFilesLoading"
                @click="loadPendingFiles"
              >
                <el-icon><Refresh /></el-icon>
                刷新当前列表
              </el-button>
              <!-- 重新匹配按钮 -->
              <el-button
                type="default"
                :loading="refreshLoading"
                @click="handleRefreshFiles"
              >
                <el-icon><Refresh /></el-icon>
                重新匹配
              </el-button>

              <!-- 批量入库按钮 -->
              <el-button 
                type="primary" 
                :disabled="selectedPendingFiles.length === 0 || !hasValidSelectedPendingFiles"
                @click="handleBatchAdd"
              >
                批量入库 ({{ validSelectedPendingCount }}/{{ selectedPendingFiles.length }})
              </el-button>
            </div>
          </div>
          
          <!-- 文件列表 -->
          <el-table 
            :data="filteredPendingFiles" 
            style="width: 100%" 
            v-loading="pendingFilesLoading"
            :stripe="true"
            :show-overflow-tooltip="true"
            @selection-change="handlePendingSelectionChange"
            :row-class-name="getRowClassName"
          >
            <el-table-column type="selection" width="55" :selectable="isFileSelectable" />
            <el-table-column label="#" width="50" type="index" />
            <el-table-column label="名称" prop="fileName">
              <template #default="scope">
                <div class="file-name-cell">
                  <span>{{ scope.row.fileName }}</span>
                  <el-tooltip 
                    v-if="!isFileValid(scope.row)"
                    :content="getFileErrorMessage(scope.row)"
                    placement="top"
                  >
                    <el-icon class="invalid-file-icon"><Warning /></el-icon>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="大小" prop="fileSize" width="100">
              <template #default="scope">
                {{ formatFileSize(scope.row.fileSize) }}
              </template>
            </el-table-column>
            <el-table-column label="匹配度" prop="score" width="100">
              <template #default="scope">
                {{ scope.row.score ? (scope.row.score * 100).toFixed(2) + '%' : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" prop="createTime" width="180" :formatter="dateFormatter" />
            <el-table-column label="更新时间" prop="updateTime" width="180" :formatter="dateFormatter" />
            <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                <el-button 
                  type="primary" 
                  link 
                  @click="handleFileAdd(scope.row)"
                  :disabled="!isFileValid(scope.row)"
                  :title="isFileValid(scope.row) ? '入库' : getFileErrorMessage(scope.row)"
                >
                  <el-icon><Plus /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 30, 50]"
              v-model:current-page="pendingPage"
              v-model:page-size="pendingPageSize"
              :total="pendingTotal"
              @size-change="handlePendingSizeChange"
              @current-change="handlePendingCurrentChange"
            />
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="已入库" name="stored">
          <!-- 已入库文件描述 -->
          <div class="tab-description">已经入库的文件为独立文件，删除云盘中的文件不会影响主题库中的文件</div>
          
          <!-- 搜索框和批量操作按钮 -->
          <div class="action-bar">
            <el-input 
              v-model="storedSearchText" 
              placeholder="搜索" 
              prefix-icon="Search"
              clearable
              @input="handleStoredSearch"
              class="search-box"
            />

            <div class="action-buttons">
              <!-- 批量出库按钮 -->
              <el-button
                type="danger"
                :disabled="selectedStoredFiles.length === 0"
                @click="handleBatchDelete"
              >
                批量出库
              </el-button>
            </div>
          </div>
          
          <!-- 文件列表 -->
          <el-table 
            :data="filteredStoredFiles" 
            style="width: 100%" 
            v-loading="storedFilesLoading"
            :stripe="true"
            :show-overflow-tooltip="true"
            @selection-change="handleStoredSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column label="#" width="50" type="index" />
            <el-table-column label="名称" prop="fileName" />
            <el-table-column label="大小" prop="fileSize" width="100">
              <template #default="scope">
                {{ formatFileSize(scope.row.fileSize) }}
              </template>
            </el-table-column>
            <el-table-column label="匹配度" prop="score" width="100">
              <template #default="scope">
                {{ scope.row.score ? (scope.row.score * 100).toFixed(2) + '%' : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="创建时间" prop="createTime" width="180" :formatter="dateFormatter" />
            <el-table-column label="更新时间" prop="updateTime" width="180" :formatter="dateFormatter" />
            <el-table-column label="操作" width="100" align="center">
              <template #default="scope">
                <el-button type="danger" link @click="handleFileDelete(scope.row)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next"
              :page-sizes="[10, 20, 30, 50]"
              v-model:current-page="storedPage"
              v-model:page-size="storedPageSize"
              :total="storedTotal"
              @size-change="handleStoredSizeChange"
              @current-change="handleStoredCurrentChange"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ThemeLibraryApi } from '@/api/rag/themelibrary'
import { useMessage } from '@/hooks/web/useMessage'
import { dateFormatter } from '@/utils/formatTime'
import { Delete, Plus, Refresh, Warning } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'

// 文件类型和大小限制常量
const SUPPORTED_FILE_TYPES = ['TXT', 'MARKDOWN', 'MDX', 'PDF', 'HTML', 'XLSX', 'XLS', 'DOCX', 'CSV', 'MD', 'HTM']
const MAX_FILE_SIZE_MB = 15
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// 文件接口定义
interface FileItem {
  id: number
  fileName: string
  fileSize: number
  score?: number
  createTime?: string
  updateTime?: string
}

// 文件操作参数接口
interface FileOperationParams {
  id: number
  themeName: string
  status: boolean
}

// 组件属性
const props = defineProps({
  themeLibraryId: {
    type: Number,
    required: true
  }
})

// 消息组件
const message = useMessage()

// 状态变量
const dialogVisible = ref(false)
const activeTab = ref('pending')  // 默认选中"待入库"标签
const themeLibrary = ref({} as any)  // 主题库信息

// 待入库状态
const pendingFilesLoading = ref(false)
const pendingFiles = ref<FileItem[]>([])
const pendingSearchText = ref('')
const pendingPage = ref(1)
const pendingPageSize = ref(10)
const pendingTotal = ref(0)
const selectedPendingFiles = ref<FileItem[]>([]) // 选中的待入库文件

// 刷新状态
const refreshLoading = ref(false)

// 已入库状态
const storedFilesLoading = ref(false)
const storedFiles = ref<FileItem[]>([])
const storedSearchText = ref('')
const storedPage = ref(1)
const storedPageSize = ref(10)
const storedTotal = ref(0)
const selectedStoredFiles = ref<FileItem[]>([]) // 选中的已入库文件

// 文件验证函数
const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.slice(lastDot + 1).toUpperCase() : ''
}

const isFileTypeValid = (fileName: string): boolean => {
  const extension = getFileExtension(fileName)
  return SUPPORTED_FILE_TYPES.includes(extension)
}

const isFileSizeValid = (fileSize: number): boolean => {
  return fileSize <= MAX_FILE_SIZE_BYTES
}

const isFileValid = (file: FileItem): boolean => {
  return isFileTypeValid(file.fileName) && isFileSizeValid(file.fileSize)
}

const getFileErrorMessage = (file: FileItem): string => {
  const errors: string[] = []
  if (!isFileTypeValid(file.fileName)) {
    errors.push(`不支持的文件类型（${getFileExtension(file.fileName)}）`)
  }
  if (!isFileSizeValid(file.fileSize)) {
    errors.push(`文件过大（${formatFileSize(file.fileSize)}，限制${MAX_FILE_SIZE_MB}MB）`)
  }
  return errors.join('，')
}

// 表格行样式
const getRowClassName = ({ row }: { row: FileItem }): string => {
  return isFileValid(row) ? '' : 'invalid-file-row'
}

// 文件选择性判断
const isFileSelectable = (row: FileItem): boolean => {
  return isFileValid(row)
}

// 计算有效选中文件数量
const validSelectedPendingCount = computed(() => {
  return selectedPendingFiles.value.filter(file => isFileValid(file)).length
})

const hasValidSelectedPendingFiles = computed(() => {
  return validSelectedPendingCount.value > 0
})

// 计算属性：根据搜索过滤文件
const filteredPendingFiles = computed(() => {
  if (!pendingSearchText.value) return pendingFiles.value
  const keyword = pendingSearchText.value.toLowerCase()
  return pendingFiles.value.filter(file => 
    file.fileName && file.fileName.toLowerCase().includes(keyword)
  )
})

const filteredStoredFiles = computed(() => {
  if (!storedSearchText.value) return storedFiles.value
  const keyword = storedSearchText.value.toLowerCase()
  return storedFiles.value.filter(file => 
    file.fileName && file.fileName.toLowerCase().includes(keyword)
  )
})

// 监听标签页切换
const handleTabChange = async (tabName) => {
  console.log('切换到标签页:', tabName)
  // 根据当前活动标签页加载数据
  if (tabName === 'pending') {
    await loadPendingFiles()
  } else if (tabName === 'stored') {
    await loadStoredFiles()
  }
}

// 处理搜索
const handlePendingSearch = () => {
  // 本地搜索，不需要重新请求
}

const handleStoredSearch = () => {
  // 本地搜索，不需要重新请求
}

// 新增：处理待入库文件选择变化
const handlePendingSelectionChange = (selection) => {
  selectedPendingFiles.value = selection
}

// 新增：处理已入库文件选择变化
const handleStoredSelectionChange = (selection) => {
  selectedStoredFiles.value = selection
}

// 刷新文件处理
const handleRefreshFiles = async () => {
  try {
    refreshLoading.value = true
    
    // 调用刷新接口
    await ThemeLibraryApi.refreshThemeLibraryFile(themeLibrary.value.id)
    
    message.success('文件刷新成功')
    
    // 重新加载待入库文件列表
    await loadPendingFiles()
  } catch (error) {
    console.error('刷新文件失败', error)
    message.error('刷新文件失败')
  } finally {
    refreshLoading.value = false
  }
}

// 批量入库处理
const handleBatchAdd = async () => {
  if (selectedPendingFiles.value.length === 0) {
    message.warning('请至少选择一个文件')
    return
  }
  
  // 过滤出有效文件
  const validFiles = selectedPendingFiles.value.filter(file => isFileValid(file))
  const invalidFiles = selectedPendingFiles.value.filter(file => !isFileValid(file))
  
  if (validFiles.length === 0) {
    message.warning('所选文件均不符合入库条件')
    return
  }
  
  try {
    let confirmMessage = `确定要将选中的${validFiles.length}个文件入库吗？`
    if (invalidFiles.length > 0) {
      confirmMessage += `\n注意：${invalidFiles.length}个文件不符合条件将被跳过`
    }
    
    // 显示确认对话框
    await message.confirm(confirmMessage)
    
    // 批量处理的加载状态
    pendingFilesLoading.value = true
    
    // 存储成功和失败的数量
    let successCount = 0
    let failCount = 0
    let validationFailCount = invalidFiles.length
    
    // 循环处理每个有效的选中文件
    for (const file of validFiles) {
      try {
        const params: FileOperationParams = {
          id: file.id,
          themeName: themeLibrary.value.themeName,
          status: true
        }
        await ThemeLibraryApi.handleThemeLibraryFile(params as any)
        successCount++
      } catch (error) {
        console.error('文件入库失败', error)
        failCount++
      }
    }
    
    // 显示结果消息
    let resultMessage = ''
    if (successCount > 0) {
      resultMessage += `成功入库${successCount}个文件`
    }
    if (failCount > 0) {
      resultMessage += `${resultMessage ? '，' : ''}${failCount}个文件入库失败`
    }
    if (validationFailCount > 0) {
      resultMessage += `${resultMessage ? '，' : ''}${validationFailCount}个文件因不符合条件被跳过`
    }
    
    if (successCount > 0 && failCount === 0) {
      message.success(resultMessage)
    } else if (successCount > 0) {
      message.warning(resultMessage)
    } else {
      message.error(resultMessage || '所有文件入库失败')
    }
    
    // 重新加载两个标签页的数据
    await loadPendingFiles()
    await loadStoredFiles()
  } catch (error) {
    // 用户取消操作，不做处理
  } finally {
    pendingFilesLoading.value = false
  }
}

// 新增：批量出库处理
const handleBatchDelete = async () => {
  if (selectedStoredFiles.value.length === 0) {
    message.warning('请至少选择一个文件')
    return
  }
  
  try {
    // 显示确认对话框
    await message.confirm('确定要将选中的' + selectedStoredFiles.value.length + '个文件出库吗？')
    
    // 批量处理的加载状态
    storedFilesLoading.value = true
    
    // 存储成功和失败的数量
    let successCount = 0
    let failCount = 0
    
    // 循环处理每个选中的文件
    for (const file of selectedStoredFiles.value) {
      try {
        const params: FileOperationParams = {
          id: file.id,
          themeName: themeLibrary.value.themeName,
          status: false
        }
        await ThemeLibraryApi.handleThemeLibraryFile(params as any)
        successCount++
      } catch (error) {
        console.error('文件出库失败', error)
        failCount++
      }
    }
    
    // 显示结果消息
    if (successCount > 0 && failCount === 0) {
      message.success(`成功出库${successCount}个文件`)
    } else if (successCount > 0 && failCount > 0) {
      message.warning(`成功出库${successCount}个文件，失败${failCount}个文件`)
    } else {
      message.error(`所有文件出库失败`)
    }
    
    // 重新加载两个标签页的数据
    await loadPendingFiles()
    await loadStoredFiles()
  } catch (error) {
    // 用户取消操作，不做处理
  } finally {
    storedFilesLoading.value = false
  }
}

// 打开弹窗方法
const open = async (themeLibraryData) => {
  // 设置主题库信息
  themeLibrary.value = themeLibraryData
  // 显示弹窗
  dialogVisible.value = true
  // 重置搜索和分页
  pendingSearchText.value = ''
  storedSearchText.value = ''
  pendingPage.value = 1
  storedPage.value = 1
  // 重置选中文件
  selectedPendingFiles.value = []
  selectedStoredFiles.value = []
  
  // 根据当前选中的标签页加载数据
  if (activeTab.value === 'pending') {
    await loadPendingFiles()
  } else {
    await loadStoredFiles()
  }
}

// 加载待入库文件
const loadPendingFiles = async () => {
  pendingFilesLoading.value = true
  try {
    const params = {
      pageNo: pendingPage.value,
      pageSize: pendingPageSize.value,
      themeLibraryId: themeLibrary.value.id,
      datasetId: themeLibrary.value.datasetId,
      status: false, // false表示未入库(0)
      fileName: pendingSearchText.value || undefined
    }

    const result = await ThemeLibraryApi.getThemeLibraryFilePage(params)
    pendingFiles.value = result.list || []
    pendingTotal.value = result.total || 0
    // 重置选中文件
    selectedPendingFiles.value = []
  } catch (error) {
    console.error('加载待入库文件列表失败', error)
    message.error('加载待入库文件列表失败')
  } finally {
    pendingFilesLoading.value = false
  }
}

// 加载已入库文件
const loadStoredFiles = async () => {
  storedFilesLoading.value = true
  try {
    const params = {
      pageNo: storedPage.value,
      pageSize: storedPageSize.value,
      themeLibraryId: props.themeLibraryId,
      datasetId: themeLibrary.value.datasetId,
      status: true, // true表示已入库(1)
      fileName: storedSearchText.value || undefined
    }

    const result = await ThemeLibraryApi.getThemeLibraryFilePage(params)
    storedFiles.value = result.list || []
    storedTotal.value = result.total || 0
    // 重置选中文件
    selectedStoredFiles.value = []
  } catch (error) {
    console.error('加载已入库文件列表失败', error)
    message.error('加载已入库文件列表失败')
  } finally {
    storedFilesLoading.value = false
  }
}

// 处理入库操作
const handleFileAdd = async (file: FileItem) => {
  // 验证文件
  if (!isFileValid(file)) {
    message.error(getFileErrorMessage(file))
    return
  }
  
  try {
    const params: FileOperationParams = {
      id: file.id,
      themeName: themeLibrary.value.themeName,
      status: true
    }
    await ThemeLibraryApi.handleThemeLibraryFile(params as any)
    message.success('文件入库成功')
    // 重新加载两个标签页的数据
    await loadPendingFiles()
    await loadStoredFiles()
  } catch (error) {
    console.error('文件入库失败', error)
    message.error('文件入库失败')
  }
}

// 处理出库操作
const handleFileDelete = async (file: FileItem) => {
  try {
    const params: FileOperationParams = {
      id: file.id,
      themeName: themeLibrary.value.themeName,
      status: false
    }
    await ThemeLibraryApi.handleThemeLibraryFile(params as any)
    message.success('文件出库成功')
    // 重新加载两个标签页的数据
    await loadPendingFiles()
    await loadStoredFiles()
  } catch (error) {
    console.error('文件出库失败', error)
    message.error('文件出库失败')
  }
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (size === null || size === undefined) return '-'
  
  if (size < 1024) {
    return size + ' B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB'
  } else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  } else {
    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }
}

// 分页处理 - 待入库
const handlePendingSizeChange = async (val) => {
  pendingPageSize.value = val
  await loadPendingFiles()
}

const handlePendingCurrentChange = async (val) => {
  pendingPage.value = val
  await loadPendingFiles()
}

// 分页处理 - 已入库
const handleStoredSizeChange = async (val) => {
  storedPageSize.value = val
  await loadStoredFiles()
}

const handleStoredCurrentChange = async (val) => {
  storedPage.value = val
  await loadStoredFiles()
}

// 暴露方法
defineExpose({
  open
})
</script>

<style lang="scss" scoped>
.file-tabs-container {
  padding: 0;
}

.tab-description {
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.action-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  justify-content: space-between;
}

.search-box {
  width: 240px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pagination-container {
  display: flex;
  margin-top: 16px;
  justify-content: center;
}

.file-limit-notice {
  margin-bottom: 16px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invalid-file-icon {
  font-size: 16px;
  color: #f56c6c;
}

.invalid-file-row {
  background-color: #fef3f2 !important;
}

.invalid-file-row:hover {
  background-color: #fde8e7 !important;
}

// 禁用状态的按钮样式
.el-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>