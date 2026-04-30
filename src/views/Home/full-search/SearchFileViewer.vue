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

const handleDownload = async () => {
  const esId = currentFile.value?.esId
  if (!esId || folderMode.value) return
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
    font-weight: 700;
    color: #0f172a;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    max-width: 760px;
    margin: 6px 0 0;
    overflow: hidden;
    font-size: 12px;
    color: #64748b;
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
  padding: 12px 14px;
  margin-bottom: 12px;
  color: #1e293b;
  background: linear-gradient(180deg, rgb(255 255 255 / 68%), rgb(255 255 255 / 38%));
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 16px;
  box-shadow: 0 16px 38px rgb(15 23 42 / 8%), inset 0 1px 0 rgb(255 255 255 / 72%);
  backdrop-filter: blur(22px) saturate(150%);

  strong {
    color: #2f6fed;
  }
}

.folder-list {
  display: grid;
  gap: 10px;
}

.folder-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 180px 140px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgb(255 255 255 / 58%), rgb(255 255 255 / 30%));
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 16px;
  box-shadow: 0 12px 30px rgb(15 23 42 / 7%), inset 0 1px 0 rgb(255 255 255 / 68%);
  backdrop-filter: blur(18px) saturate(150%);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.folder-item:hover {
  opacity: 0.94;
  border-color: rgb(147 197 253 / 76%);
  box-shadow: 0 18px 42px rgb(37 99 235 / 10%), inset 0 1px 0 rgb(255 255 255 / 76%);
  transform: translateY(-1px);
}

.folder-item-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: #2f6fed;
  background: linear-gradient(180deg, rgb(239 246 255 / 88%), rgb(219 234 254 / 58%));
  border: 1px solid rgb(255 255 255 / 64%);
  border-radius: 13px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 72%);

  &.dir {
    color: #cc7a00;
    background: linear-gradient(180deg, rgb(255 251 235 / 94%), rgb(254 243 199 / 70%));
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
  font-weight: 650;
  color: #172033;
}

.folder-item-path {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.folder-item-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  font-size: 12px;
  color: #64748b;
}

.folder-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.folder-item-actions :deep(.el-button) {
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  background: rgb(255 255 255 / 34%);
  border: 1px solid rgb(255 255 255 / 50%);
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 62%);
  transition: background 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.folder-item-actions :deep(.el-button:hover) {
  opacity: 0.9;
  background: rgb(255 255 255 / 58%);
  transform: translateY(-1px);
}

.text-preview {
  min-height: 100%;
  padding: 18px;
  margin: 0;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #202b3d;
  white-space: pre-wrap;
  background: linear-gradient(180deg, rgb(255 255 255 / 70%), rgb(248 250 252 / 44%));
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 16px;
  box-shadow: 0 18px 44px rgb(15 23 42 / 8%), inset 0 1px 0 rgb(255 255 255 / 74%);
  backdrop-filter: blur(18px);
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
  border: 0;
  border-radius: 16px;
  background: #111827;
  box-shadow: 0 22px 60px rgb(15 23 42 / 18%);
}

:global(.search-file-viewer.el-drawer) {
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 76%), rgb(239 246 255 / 58%)),
    linear-gradient(180deg, rgb(255 255 255 / 64%), rgb(226 232 240 / 34%));
  border-left: 1px solid rgb(255 255 255 / 72%);
  box-shadow: -24px 0 78px rgb(15 23 42 / 18%), inset 1px 0 0 rgb(255 255 255 / 62%);
  backdrop-filter: blur(28px) saturate(160%);
}

:global(.search-file-viewer .el-drawer__header) {
  padding-bottom: 18px;
  margin-bottom: 0;
  border-bottom: 1px solid rgb(255 255 255 / 48%);
}

:global(.search-file-viewer .el-drawer__body) {
  background: transparent;
}

:global(.search-file-viewer .el-button) {
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 62%);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

:global(.search-file-viewer .el-button:hover) {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
