<template>
  <el-drawer v-model="visible" :size="drawerSize" class="search-file-viewer" destroy-on-close>
    <template #header>
      <div class="viewer-head">
        <div>
          <h3>{{ meta?.fileName || currentFile?.fileName || '文件预览' }}</h3>
          <p>{{ meta?.filePath || currentFile?.filePath }}</p>
        </div>
        <el-button v-if="!folderMode" type="primary" plain @click="handleDownload">
          <el-icon><Download /></el-icon>
          下载
        </el-button>
      </div>
    </template>

    <el-skeleton v-if="loading" :rows="10" animated />
    <el-alert v-else-if="error" :title="error" type="warning" show-icon :closable="false" />

    <div v-else class="viewer-content">
      <div v-if="folderMode" class="folder-preview">
        <div class="folder-summary">
          <el-icon><FolderOpened /></el-icon>
          <span>第一层文件清单</span>
          <strong>{{ folderChildren.length }}</strong>
        </div>
        <el-empty v-if="!folderChildren.length" description="该文件夹下暂无可见文件" />
        <div v-else class="folder-list">
          <div v-for="item in folderChildren" :key="item.filePath" class="folder-item">
            <div class="folder-item-icon" :class="{ dir: item.folder }">
              <el-icon>
                <Folder v-if="item.folder" />
                <Document v-else />
              </el-icon>
            </div>
            <div class="folder-item-body">
              <div class="folder-item-name">{{ item.fileName }}</div>
              <div class="folder-item-path">{{ item.filePath }}</div>
            </div>
            <div class="folder-item-meta">
              <span>{{ item.folder ? '文件夹' : formatSize(item.fileSize) }}</span>
              <span>{{ item.updateTime || '-' }}</span>
            </div>
            <div class="folder-item-actions">
              <el-button v-if="!item.folder" link type="primary" size="small" @click="handleFolderItemKkPreview(item)">
                <el-icon><Monitor /></el-icon>
                KK查看
              </el-button>
              <el-button link type="primary" size="small" @click="handleFolderItemPreview(item)">
                <el-icon><View /></el-icon>
                {{ item.folder ? '打开' : '预览' }}
              </el-button>
              <el-button v-if="!item.folder" link type="primary" size="small" @click="handleFolderItemDownload(item)">
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <pre v-else-if="meta?.previewType === 'text'" class="text-preview">{{ textContent }}</pre>
      <img v-else-if="meta?.previewType === 'image' && objectUrl" class="image-preview" :src="objectUrl" alt="" />
      <iframe v-else-if="meta?.previewType === 'pdf' && objectUrl" class="pdf-preview" :src="objectUrl"></iframe>
      <video v-else-if="meta?.previewType === 'video' && objectUrl" class="video-preview" :src="objectUrl" controls></video>
      <el-empty v-else description="当前文件类型暂不支持在线查看">
        <el-button type="primary" @click="handleDownload">下载文件</el-button>
      </el-empty>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { Document, Download, Folder, FolderOpened, Monitor, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { CommonFile, FilePreviewMeta, NasFileEntry } from '@/api/rag/search'
import {
  downloadFileBlob,
  downloadNasFileBlob,
  getKkPreviewUrl,
  getNasFilePermissions,
  getNasFileViewUrl,
  getPreviewBlob,
  getPreviewMeta,
  listNasFolderChildren
} from '@/api/rag/search'

const visible = ref(false)
const loading = ref(false)
const error = ref('')
const currentFile = ref<CommonFile>()
const meta = ref<FilePreviewMeta>()
const objectUrl = ref('')
const textContent = ref('')
const folderChildren = ref<NasFileEntry[]>([])
const folderMode = computed(() => Boolean(currentFile.value?.folder))
const NAS_PERMISSION = {
  VIEW: 8,
  DOWN: 64,
  VIEW_ONLINE: 512
}

const drawerSize = computed(() => (window.innerWidth < 900 ? '96%' : '72%'))

const revokeObjectUrl = () => {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = ''
  }
}

// 查看器只依赖 esId，文件类型判断、内容加载和降级下载都封装在组件内部。
const open = async (file: CommonFile) => {
  currentFile.value = file
  visible.value = true
  error.value = ''
  textContent.value = ''
  folderChildren.value = []
  meta.value = undefined
  revokeObjectUrl()

  const esId = file.esId
  if (!esId) {
    error.value = '文件缺少 esId，无法预览'
    return
  }

  loading.value = true
  try {
    if (file.folder) {
      if (!file.nasId) {
        error.value = '文件夹缺少 nasId，无法读取目录'
        return
      }
      // 文件夹预览复用 NAS 文件模块的目录读取接口，只展示当前目录第一层。
      folderChildren.value = await listNasFolderChildren(file.nasId, file.subPath || file.filePath || '/')
      return
    }
    meta.value = await getPreviewMeta(esId)
    if (meta.value.previewType !== 'unsupported') {
      const blob = await getPreviewBlob(esId)
      if (meta.value.previewType === 'text') {
        textContent.value = await blob.text()
      } else {
        objectUrl.value = URL.createObjectURL(blob)
      }
    }
  } catch (e: any) {
    error.value = e?.message || '预览加载失败'
  } finally {
    loading.value = false
  }
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const getCurrentNasId = () => currentFile.value?.nasId

const hasAnyPermission = (permissions: number | undefined, bits: number[]) =>
  bits.some((bit) => ((permissions || 0) & bit) === bit)

const getEntryPermissions = async (item: NasFileEntry) => {
  const nasId = getCurrentNasId()
  if (!nasId || !item.filePath) return 0
  // 目录列表接口为了性能可能只返回基础可见权限，点击预览时以文件路径重新取一次真实权限。
  const data = await getNasFilePermissions(nasId, item.filePath)
  return data?.permissions || 0
}

const getCurrentFilePermissions = async () => {
  const nasId = getCurrentNasId()
  const path = currentFile.value?.subPath || currentFile.value?.filePath
  if (!nasId || !path) return undefined
  const data = await getNasFilePermissions(nasId, path)
  return data?.permissions || 0
}

const handleDownload = async () => {
  const esId = currentFile.value?.esId
  if (!esId || folderMode.value) return
  const permissions = await getCurrentFilePermissions()
  if (permissions !== undefined && !hasAnyPermission(permissions, [NAS_PERMISSION.DOWN])) {
    ElMessage.warning('无下载权限')
    return
  }
  const blob = await downloadFileBlob(esId)
  saveBlob(blob, meta.value?.fileName || currentFile.value?.fileName || 'download')
  ElMessage.success('已开始下载')
}

const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const openExternalPreview = (url?: string) => {
  if (url) {
    window.open(url, '_blank')
  } else {
    ElMessage.warning('未获取到预览地址')
  }
}

// 处理文件夹中子项的 KK 预览
const handleFolderItemKkPreview = async (item: NasFileEntry) => {
  if (item.folder) return

  try {
    const permissions = await getEntryPermissions(item)
    if (!hasAnyPermission(permissions, [NAS_PERMISSION.VIEW, NAS_PERMISSION.VIEW_ONLINE])) {
      ElMessage.warning('无预览或在线查看权限')
      return
    }
    if (item.esId) {
      openExternalPreview(await getKkPreviewUrl(item.esId))
      return
    }

    const nasId = currentFile.value?.nasId
    if (!nasId) {
      ElMessage.error('缺少 nasId，无法预览')
      return
    }
    // NAS 目录接口当前不返回 esId 时，降级复用 NAS 在线查看 token，权限与“在线查看”一致。
    const response = await getNasFileViewUrl(nasId, item.filePath)
    openExternalPreview(response?.url)
  } catch (e: any) {
    ElMessage.error(e?.message || 'KK预览失败')
  }
}

// 处理文件夹中子项的预览
const handleFolderItemPreview = async (item: NasFileEntry) => {
  if (item.folder) {
    // 如果是文件夹，加载其子目录
    try {
      loading.value = true
      error.value = ''
      const nasId = currentFile.value?.nasId
      if (!nasId) {
        error.value = '缺少 nasId，无法读取目录'
        return
      }
      folderChildren.value = await listNasFolderChildren(nasId, item.filePath || '/')
      // 更新当前显示的文件夹信息
      if (currentFile.value) {
        currentFile.value.subPath = item.filePath
        currentFile.value.filePath = item.filePath
        currentFile.value.fileName = item.fileName
      }
    } catch (e: any) {
      error.value = e?.message || '加载文件夹失败'
    } finally {
      loading.value = false
    }
  } else {
    // 如果是文件，尝试使用 NAS 在线预览接口
    try {
      const permissions = await getEntryPermissions(item)
      if (!hasAnyPermission(permissions, [NAS_PERMISSION.VIEW, NAS_PERMISSION.VIEW_ONLINE])) {
        ElMessage.warning('无预览或在线查看权限')
        return
      }
      const nasId = currentFile.value?.nasId
      if (!nasId) {
        ElMessage.error('缺少 nasId，无法预览')
        return
      }

      const response = await getNasFileViewUrl(nasId, item.filePath)

      openExternalPreview(response?.url)
    } catch (e: any) {
      ElMessage.error(e?.message || '预览失败')
    }
  }
}

// 处理文件夹中子项的下载
const handleFolderItemDownload = async (item: NasFileEntry) => {
  if (item.folder) {
    ElMessage.warning('暂不支持文件夹下载')
    return
  }

  const nasId = currentFile.value?.nasId
  if (!nasId) {
    ElMessage.error('缺少 nasId，无法下载')
    return
  }

  try {
    const permissions = await getEntryPermissions(item)
    if (!hasAnyPermission(permissions, [NAS_PERMISSION.DOWN])) {
      ElMessage.warning('无下载权限')
      return
    }
    const blob = await downloadNasFileBlob(nasId, item.filePath)
    saveBlob(blob, item.fileName || 'download')
    ElMessage.success('已开始下载')
  } catch (e: any) {
    ElMessage.error(e?.message || '下载失败')
  }
}

watch(visible, (value) => {
  if (!value) revokeObjectUrl()
})

onBeforeUnmount(revokeObjectUrl)

defineExpose({ open })
</script>

<style scoped lang="scss">
.viewer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;

  h3 {
    max-width: 720px;
    margin: 0;
    overflow: hidden;
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    max-width: 760px;
    margin: 6px 0 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.viewer-content {
  height: calc(100vh - 118px);
  overflow: auto;
}

.folder-preview {
  min-height: 100%;
}

.folder-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);

  strong {
    color: var(--el-color-primary);
  }
}

.folder-list {
  display: grid;
  border-top: 1px solid var(--el-border-color-lighter);
}

.folder-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 180px 140px;
  gap: 12px;
  align-items: center;
  padding: 12px 4px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.folder-item:hover {
  background: var(--el-fill-color-lighter);
}

.folder-item-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: var(--el-border-radius-base);

  &.dir {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
  }
}

.folder-item-body {
  min-width: 0;
}

.folder-item-name,
.folder-item-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.folder-item-path {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.folder-item-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.folder-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.folder-item-actions :deep(.el-button) {
  gap: 4px;
  padding: 2px 4px;
  font-size: 12px;
}

.text-preview {
  min-height: 100%;
  padding: 16px;
  margin: 0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}

.image-preview {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 150px);
  margin: 0 auto;
  object-fit: contain;
}

.pdf-preview,
.video-preview {
  width: 100%;
  height: calc(100vh - 150px);
  background: var(--el-fill-color-darker);
  border: 0;
  border-radius: var(--el-border-radius-base);
}

:global(.search-file-viewer.el-drawer) {
  overflow: hidden;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color-light);
}

:global(.search-file-viewer .el-drawer__header) {
  padding-bottom: 16px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:global(.search-file-viewer .el-drawer__body) {
  background: var(--el-bg-color);
}
</style>
