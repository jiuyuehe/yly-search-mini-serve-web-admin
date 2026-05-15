<template>
  <el-dialog v-model="dialogVisible" title="选择文件夹" width="900px" append-to-body destroy-on-close>
    <div class="file-browser">
      <div class="file-browser__toolbar">
        <div class="file-browser__breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in fileBrowserBreadcrumbs" :key="item.path">
              <span class="file-browser__crumb" @click="navigateFileBrowser(item.path)">{{ item.label }}</span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="file-browser__actions">
          <el-button :disabled="isFileBrowserRoot" @click="goFileBrowserParent">返回上一级</el-button>
          <el-button @click="selectCurrentBrowseFolder">选择当前目录</el-button>
          <el-button @click="loadFileBrowserList(fileBrowserCurrentPath)">
            <Icon icon="ep:refresh" class="mr-5px" />
            刷新
          </el-button>
        </div>
      </div>

      <el-table
        v-loading="fileBrowserLoading"
        :data="fileBrowserEntries"
        highlight-current-row
        height="420px"
        @current-change="handleFileBrowserCurrentChange"
        @row-dblclick="handleFileBrowserRowDblclick"
      >
        <el-table-column label="名称" min-width="260">
          <template #default="scope">
            <div class="file-browser__name">
              <Icon :icon="scope.row.folder ? 'ep:folder-opened' : 'ep:document'" class="mr-8px" />
              <span>{{ scope.row.fileName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="scope">
            {{ scope.row.folder ? '文件夹' : '文件' }}
          </template>
        </el-table-column>
        <el-table-column label="路径" prop="filePath" min-width="340" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="scope">
            <el-button v-if="scope.row.folder" link type="primary" @click="navigateFileBrowser(scope.row.filePath)">
              进入
            </el-button>
            <el-button v-if="scope.row.folder" link type="success" @click="confirmFileBrowserSelection(scope.row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="file-browser__selected">
        <span class="file-browser__selected-label">已选路径</span>
        <span class="file-browser__selected-value">{{ fileBrowserSelectedPath || '未选择' }}</span>
        <el-tag v-if="fileBrowserSelectedPath" size="small" type="success">文件夹</el-tag>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!fileBrowserSelectedPath" @click="confirmFileBrowserSelection()">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import { NasApi, type NasFileEntryVO } from '@/api/nas/nas'
import { type FileBrowserBreadcrumb } from './constants'

type OpenOptions = {
  nasId: number
  initialPath?: string
  initialFolder?: boolean
}

const emit = defineEmits<{
  confirm: [path: string]
}>()

const message = useMessage()

const dialogVisible = ref(false)
const fileBrowserLoading = ref(false)
const fileBrowserEntries = ref<NasFileEntryVO[]>([])
const fileBrowserCurrentPath = ref('/')
const fileBrowserSelectedPath = ref('')
const fileBrowserSelectedFolder = ref(true)
const currentNasId = ref<number>()

const normalizePath = (value?: string) => {
  if (!value) {
    return ''
  }
  const normalized = value.trim().replace(/\\/g, '/').replace(/\/+$/g, '')
  return normalized === '' ? '' : normalized
}

const normalizeNasFilePath = (value?: string) => {
  const normalized = normalizePath(value)
  return normalized || '/'
}

const getParentNasPath = (value?: string) => {
  const normalized = normalizeNasFilePath(value)
  if (normalized === '/') {
    return '/'
  }
  const segments = normalized.split('/').filter(Boolean)
  segments.pop()
  return segments.length ? `/${segments.join('/')}` : '/'
}

const fileBrowserBreadcrumbs = computed<FileBrowserBreadcrumb[]>(() => {
  const normalized = normalizeNasFilePath(fileBrowserCurrentPath.value)
  if (normalized === '/') {
    return [{ label: '根目录', path: '/' }]
  }
  const segments = normalized.split('/').filter(Boolean)
  let currentPath = ''
  return [
    { label: '根目录', path: '/' },
    ...segments.map((item) => {
      currentPath += `/${item}`
      return {
        label: item,
        path: currentPath
      }
    })
  ]
})

const isFileBrowserRoot = computed(() => normalizeNasFilePath(fileBrowserCurrentPath.value) === '/')

const setFileBrowserSelection = (path: string, folder: boolean) => {
  fileBrowserSelectedPath.value = normalizeNasFilePath(path)
  fileBrowserSelectedFolder.value = folder
}

const loadFileBrowserList = async (path = fileBrowserCurrentPath.value) => {
  if (!currentNasId.value) {
    return
  }
  fileBrowserLoading.value = true
  try {
    const safePath = normalizeNasFilePath(path)
    fileBrowserCurrentPath.value = safePath
    fileBrowserEntries.value = await NasApi.getAdminFileList(currentNasId.value, safePath)
  } finally {
    fileBrowserLoading.value = false
  }
}

const navigateFileBrowser = async (path: string) => {
  await loadFileBrowserList(path)
}

const goFileBrowserParent = async () => {
  if (isFileBrowserRoot.value) {
    return
  }
  await loadFileBrowserList(getParentNasPath(fileBrowserCurrentPath.value))
}

const selectCurrentBrowseFolder = () => {
  setFileBrowserSelection(fileBrowserCurrentPath.value, true)
}

const handleFileBrowserCurrentChange = (row?: NasFileEntryVO) => {
  if (!row || !row.folder) {
    return
  }
  setFileBrowserSelection(row.filePath, true)
}

const confirmFileBrowserSelection = (row?: NasFileEntryVO) => {
  if (row) {
    if (!row.folder) {
      message.warning('只能选择文件夹')
      return
    }
    setFileBrowserSelection(row.filePath, true)
  }
  if (!fileBrowserSelectedPath.value) {
    message.warning('请先选择文件夹')
    return
  }
  if (!fileBrowserSelectedFolder.value) {
    message.warning('只能选择文件夹')
    return
  }
  emit('confirm', normalizeNasFilePath(fileBrowserSelectedPath.value))
  dialogVisible.value = false
}

const handleFileBrowserRowDblclick = async (row: NasFileEntryVO) => {
  if (!row.folder) {
    return
  }
  setFileBrowserSelection(row.filePath, true)
  await navigateFileBrowser(row.filePath)
}

const open = async (options: OpenOptions) => {
  currentNasId.value = options.nasId
  dialogVisible.value = true
  const initialPath = normalizeNasFilePath(options.initialPath)
  const initialFolder = options.initialFolder !== false
  setFileBrowserSelection(initialFolder ? initialPath : '', true)
  await loadFileBrowserList(initialFolder ? initialPath : getParentNasPath(initialPath))
}

defineExpose({ open })
</script>

<style scoped>
.file-browser__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.file-browser__breadcrumb {
  min-width: 0;
  flex: 1;
}

.file-browser__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-browser__crumb {
  cursor: pointer;
  color: var(--el-color-primary);
}

.file-browser__name {
  display: flex;
  align-items: center;
}

.file-browser__selected {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.file-browser__selected-label {
  color: var(--el-text-color-secondary);
}

.file-browser__selected-value {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  color: var(--el-text-color-primary);
}
</style>
