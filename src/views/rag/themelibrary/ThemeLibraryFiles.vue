<template>
  <Dialog width="60%" :title="themeLibrary.themeName + ' - 文件列表'" v-model="dialogVisible">
    <div class="file-tabs-container">
      <!-- 标签页 - 添加tab-change事件监听 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="待入库" name="pending">
          <div class="tab-description">与主题库分类匹配相关的文件列表</div>
          
          <!-- 搜索框 -->
          <div class="search-box">
            <el-input 
              v-model="pendingSearchText" 
              placeholder="搜索" 
              prefix-icon="Search"
              clearable
              @input="handlePendingSearch"
            />
          </div>
          
          <!-- 文件列表 -->
          <el-table 
            :data="filteredPendingFiles" 
            style="width: 100%" 
            v-loading="pendingFilesLoading"
            :stripe="true"
            :show-overflow-tooltip="true"
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
                {{ scope.row.score ? scope.row.score * 100 + '%' : '-' }}
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
          
          <!-- 搜索框 -->
          <div class="search-box">
            <el-input 
              v-model="storedSearchText" 
              placeholder="搜索" 
              prefix-icon="Search"
              clearable
              @input="handleStoredSearch"
            />
          </div>
          
          <!-- 文件列表 -->
          <el-table 
            :data="filteredStoredFiles" 
            style="width: 100%" 
            v-loading="storedFilesLoading"
            :stripe="true"
            :show-overflow-tooltip="true"
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
                {{ scope.row.score ? scope.row.score * 100 + '%' : '-' }}
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

// 已入库状态
const storedFilesLoading = ref(false)
const storedFiles = ref([])
const storedSearchText = ref('')
const storedPage = ref(1)
const storedPageSize = ref(10)
const storedTotal = ref(0)

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
const handleTabChange = (tabName) => {
  console.log('切换到标签页:', tabName)
  // 根据当前活动标签页加载数据
  if (tabName === 'pending') {
    loadPendingFiles()
  } else if (tabName === 'stored') {
    loadStoredFiles()
  }
}

// 处理搜索
const handlePendingSearch = () => {
  // 本地搜索，不需要重新请求
}

const handleStoredSearch = () => {
  // 本地搜索，不需要重新请求
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
      datasetId: themeLibrary.value.datasetId,
      status: false, // false表示未入库(0)
      fileName: pendingSearchText.value || undefined
    }

    const result = await ThemeLibraryApi.getThemeLibraryFilePage(params)
    pendingFiles.value = result.list || []
    pendingTotal.value = result.total || 0
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
      datasetId: themeLibrary.value.datasetId,
      status: true, // true表示已入库(1)
      fileName: storedSearchText.value || undefined
    }

    const result = await ThemeLibraryApi.getThemeLibraryFilePage(params)
    storedFiles.value = result.list || []
    storedTotal.value = result.total || 0
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
const handlePendingSizeChange = (val) => {
  pendingPageSize.value = val
  loadPendingFiles()
}

const handlePendingCurrentChange = (val) => {
  pendingPage.value = val
  loadPendingFiles()
}

// 分页处理 - 已入库
const handleStoredSizeChange = (val) => {
  storedPageSize.value = val
  loadStoredFiles()
}

const handleStoredCurrentChange = (val) => {
  storedPage.value = val
  loadStoredFiles()
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

.search-box {
  width: 240px;
  margin-bottom: 16px;
}

.pagination-container {
  display: flex;
  margin-top: 16px;
  justify-content: center;
}
</style>