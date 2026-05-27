<template>
  <section class="result-list">
    <div class="result-toolbar">
      <el-checkbox
        :model-value="isAllSelected"
        :indeterminate="isIndeterminate"
        @change="toggleAll"
      >
        已选 {{ selectedIds.length }}
      </el-checkbox>
      <div class="toolbar-actions">
        <span class="result-count">共 {{ total }} 条</span>
        <span v-if="searchTime !== undefined && searchTime !== null" class="search-time">耗时 {{ formatSearchTime(searchTime) }}</span>
        <el-button v-if="selectedIds.length" type="primary" plain @click="$emit('batch-download')">
          <el-icon><Download /></el-icon>
          批量下载
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!files.length" description="暂无搜索结果" />

    <div v-else class="result-items">
      <article v-for="file in files" :key="getEsId(file)" class="result-item">
        <el-checkbox
          class="item-check"
          :model-value="selectedIds.includes(getEsId(file))"
          @change="(checked: boolean) => toggleOne(file, checked)"
        />
        <div class="file-icon" :class="`type-${getDocGroup(file)}`">
          <el-icon>
            <Folder v-if="file.folder" />
            <component :is="getFileIcon(file)" v-else />
          </el-icon>
        </div>
        <div class="file-body">
          <div class="file-title-row">
            <button class="file-title" type="button" v-dompurify-html="highlightName(file.fileName || '')" @click="$emit('preview', file)"></button>
            <span v-if="file.score !== undefined" class="score">{{ formatScore(file.score) }}</span>
          </div>
          <div v-if="file.fileContents" class="snippet" v-dompurify-html="file.fileContents"></div>
          <div v-else-if="file.enrichSummary || file.fileSummary" class="snippet plain">
            {{ file.enrichSummary || file.fileSummary }}
          </div>
          <div class="meta-row">
            <span>{{ formatTimeText(file) }}</span>
            <span>{{ formatSize(file.fileSize) }}</span>
            <span>{{ file.matchSource || 'NAS空间' }}</span>
          </div>
          <div class="path-row">
            <el-icon><Location /></el-icon>
            <span class="path-text">{{ file.filePath || '-' }}</span>
            <el-button link type="primary" @click="copyPath(file.filePath)">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </div>
          <div v-if="file.fileAiTag || file.fileSysTag" class="tag-row">
            <el-tag v-if="file.fileAiTag" size="small" effect="plain">{{ file.fileAiTag }}</el-tag>
            <el-tag v-if="file.fileSysTag" size="small" type="info" effect="plain">{{ file.fileSysTag }}</el-tag>
          </div>
        </div>
        <div class="item-actions">
          <el-button v-if="!file.folder" link type="primary" @click="$emit('kk-preview', file)">
            <el-icon><Monitor /></el-icon>
            KK查看
          </el-button>
          <el-button link type="primary" @click="$emit('preview', file)">
            <el-icon><View /></el-icon>
            {{ file.folder ? '打开' : '在线查看' }}
          </el-button>
          <el-button v-if="!file.folder" link type="primary" @click="$emit('download', file)">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
        </div>
      </article>
    </div>

    <el-pagination
      v-if="total > pageSize"
      class="pagination"
      background
      layout="prev, pager, next, sizes, total"
      :page-size="pageSize"
      :current-page="page"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      @current-change="$emit('page-change', $event)"
      @size-change="$emit('size-change', $event)"
    />
  </section>
</template>

<script lang="ts" setup>
import { Box, CopyDocument, Document, Download, Files, Folder, Headset, Location, Monitor, Picture, VideoPlay, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { CommonFile } from '@/api/rag/search'

const props = defineProps<{
  files: CommonFile[]
  total: number
  loading: boolean
  keyword?: string
  page: number
  pageSize: number
  selectedIds: string[]
  searchTime?: number
}>()

const emit = defineEmits<{
  'kk-preview': [file: CommonFile]
  preview: [file: CommonFile]
  download: [file: CommonFile]
  'batch-download': []
  'update:selectedIds': [ids: string[]]
  'page-change': [page: number]
  'size-change': [size: number]
}>()

const getEsId = (file: CommonFile) => file.esId || ''

const isAllSelected = computed(() => props.files.length > 0 && props.files.every((file) => props.selectedIds.includes(getEsId(file))))
const isIndeterminate = computed(() => props.selectedIds.length > 0 && !isAllSelected.value)

const toggleOne = (file: CommonFile, checked: boolean) => {
  const esId = getEsId(file)
  if (!esId) return
  const next = checked ? [...new Set([...props.selectedIds, esId])] : props.selectedIds.filter((id) => id !== esId)
  emit('update:selectedIds', next)
}

const toggleAll = (checked: boolean) => {
  const pageIds = props.files.map(getEsId).filter(Boolean)
  const next = checked ? [...new Set([...props.selectedIds, ...pageIds])] : props.selectedIds.filter((id) => !pageIds.includes(id))
  emit('update:selectedIds', next)
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)

const highlightName = (fileName: string) => {
  const safeName = escapeHtml(fileName)
  const keyword = props.keyword?.trim()
  if (!keyword) return safeName
  const safeKeyword = escapeHtml(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return safeName.replace(new RegExp(safeKeyword, 'gi'), (match) => `<em>${match}</em>`)
}

const getDocGroup = (file: CommonFile) => {
  if (file.folder) return 'folder'
  const docType = String(file.docType || '')
  if (docType === '1') return 'image'
  if (docType === '2') return 'doc'
  if (docType === '3') return 'audio'
  if (docType === '4') return 'video'
  if (docType === '6') return 'zip'
  return 'other'
}

const getFileIcon = (file: CommonFile) => {
  const group = getDocGroup(file)
  const icons = {
    image: Picture,
    doc: Document,
    audio: Headset,
    video: VideoPlay,
    zip: Box,
    other: Files
  }
  return icons[group as keyof typeof icons] || Files
}

const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const formatTimeText = (file: CommonFile) => file.updateTime || file.createTime || (file.lastModified ? new Date(file.lastModified).toLocaleString() : '-')
const formatScore = (score: number) => `相关度 ${Math.round(score * 100)}%`
const formatSearchTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const copyPath = async (path?: string) => {
  if (!path) return
  await navigator.clipboard?.writeText(path)
  ElMessage.success('路径已复制')
}
</script>

<style scoped lang="scss">
.result-list {
  min-height: 0;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count,
.search-time {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.search-time {
  padding-left: 8px;
  border-left: 1px solid var(--el-border-color-lighter);
}

.result-items {
  display: grid;
  border-top: 1px solid var(--el-border-color-lighter);
}

.result-item {
  display: grid;
  grid-template-columns: 24px 44px minmax(0, 1fr) 104px;
  gap: 14px;
  align-items: start;
  padding: 16px 4px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.result-item:hover {
  background: var(--el-fill-color-lighter);
}

.item-check {
  padding-top: 10px;
}

.file-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  font-size: 22px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: var(--el-border-radius-base);
}

.type-folder {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.type-image {
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.type-video {
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.type-zip {
  color: var(--el-color-info);
  background: var(--el-color-info-light-9);
}

.file-body {
  min-width: 0;
}

.file-title-row,
.meta-row,
.path-row,
.tag-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-title {
  min-width: 0;
  padding: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.file-title:hover {
  color: var(--el-color-primary);
}

.score {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 999px;
}

.snippet {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.plain {
  color: var(--el-text-color-secondary);
}

.meta-row {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.path-row {
  min-width: 0;
  margin-top: 8px;
  color: var(--el-color-primary);
}

.path-text {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row {
  margin-top: 10px;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.item-actions :deep(.el-button),
.path-row :deep(.el-button) {
  gap: 4px;
  padding: 2px 4px;
  font-size: 12px;
}

.pagination {
  justify-content: flex-end;
  margin-top: 18px;
}

:deep(em) {
  padding: 0 2px;
  font-style: normal;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 2px;
}
</style>
