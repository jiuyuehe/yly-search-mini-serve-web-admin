<template>
  <Dialog width="60%" :title="themeLibrary.themeName + ' - 文件列表'" v-model="dialogVisible">
    <div class="file-tabs-container">
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
            
            <!-- 新增批量入库按钮 -->
            <el-button 
              type="primary" 
              :disabled="selectedPendingFiles.length === 0"
              @click="handleBatchAdd"
            >
              批量入库
            </el-button>
          </div>
          
          <!-- 文件列表 -->
          <el-table 
            :data="filteredPendingFiles" 
            style="width: 100%" 
            v-loading="pendingFilesLoading"
            :stripe="true"
            :show-overflow-tooltip="true"
            @selection-change="handlePendingSelectionChange"
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
                <el-button type="primary" link @click="handleFileAdd(scope.row)">
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
            
            <!-- 新增批量出库按钮 -->
            <el-button 
              type="danger" 
              :disabled="selectedStoredFiles.length === 0"
              @click="handleBatchDelete"
            >
              批量出库
            </el-button>
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
import { ThemeLibraryVO } from '@/api/rag/themelibrary/index'
import { useMessage } from '@/hooks/web/useMessage'
import { dateFormatter } from '@/utils/formatTime'
import { Delete, Plus } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
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
const pendingFiles = ref([])
const pendingSearchText = ref('')
const pendingPage = ref(1)
const pendingPageSize = ref(10)
const pendingTotal = ref(0)
const selectedPendingFiles = ref([]) // 新增：选中的待入库文件

// 已入库状态
const storedFilesLoading = ref(false)
const storedFiles = ref([])
const storedSearchText = ref('')
const storedPage = ref(1)
const storedPageSize = ref(10)
const storedTotal = ref(0)
const selectedStoredFiles = ref([]) // 新增：选中的已入库文件

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

// 新增：批量入库处理
const handleBatchAdd = async () => {
  if (selectedPendingFiles.value.length === 0) {
    message.warning('请至少选择一个文件')
    return
  }
  
  try {
    // 显示确认对话框
    await message.confirm('确定要将选中的' + selectedPendingFiles.value.length + '个文件入库吗？')
    
    // 批量处理的加载状态
    pendingFilesLoading.value = true
    
    // 存储成功和失败的数量
    let successCount = 0
    let failCount = 0
    
    // 循环处理每个选中的文件
    for (const file of selectedPendingFiles.value) {
      try {
        const params: ThemeLibraryVO = {
          id: file.id,
          status: true
        }
        await ThemeLibraryApi.handleThemeLibraryFile(params)
        successCount++
      } catch (error) {
        console.error('文件入库失败', error)
        failCount++
      }
    }
    
    // 显示结果消息
    if (successCount > 0 && failCount === 0) {
      message.success(`成功入库${successCount}个文件`)
    } else if (successCount > 0 && failCount > 0) {
      message.warning(`成功入库${successCount}个文件，失败${failCount}个文件`)
    } else {
      message.error(`所有文件入库失败`)
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
        const params: ThemeLibraryVO = {
          id: file.id,
          status: false
        }
        await ThemeLibraryApi.handleThemeLibraryFile(params)
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
const handleFileAdd = async (file) => {
  try {
    const params: ThemeLibraryVO = {
      id: file.id,
      status: true
    }
    await ThemeLibraryApi.handleThemeLibraryFile(params)
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
const handleFileDelete = async (file) => {
  try {
    const params: ThemeLibraryVO = {
      id: file.id,
      status: false
    }
    await ThemeLibraryApi.handleThemeLibraryFile(params)
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

.pagination-container {
  display: flex;
  margin-top: 16px;
  justify-content: center;
}
</style>