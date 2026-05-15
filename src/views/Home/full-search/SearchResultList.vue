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
  margin-bottom: 16px;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgb(255 255 255 / 58%), rgb(255 255 255 / 32%));
  border: 1px solid rgb(255 255 255 / 62%);
  border-radius: 16px;
  box-shadow: 0 16px 42px rgb(15 23 42 / 8%), inset 0 1px 0 rgb(255 255 255 / 70%);
  backdrop-filter: blur(24px) saturate(155%);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count {
  font-size: 13px;
  color: #475569;
}

.search-time {
  font-size: 13px;
  color: #64748b;
  padding-left: 8px;
  border-left: 1px solid #e2e8f0;
}

.result-items {
  display: grid;
  gap: 14px;
}

.result-item {
  position: relative;
  display: grid;
  grid-template-columns: 24px 44px minmax(0, 1fr) 104px;
  gap: 14px;
  align-items: start;
  padding: 18px 20px;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 255 255 / 66%), rgb(255 255 255 / 38%));
  border: 1px solid rgb(255 255 255 / 66%);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 9%), inset 0 1px 0 rgb(255 255 255 / 72%);
  backdrop-filter: blur(24px) saturate(155%);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.result-item::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: linear-gradient(115deg, rgb(255 255 255 / 46%), transparent 28%, rgb(255 255 255 / 18%) 64%, transparent);
  opacity: 0.68;
  transition: opacity 0.18s ease;
}

.result-item:hover {
  border-color: rgb(147 197 253 / 88%);
  box-shadow: 0 26px 70px rgb(37 99 235 / 13%), inset 0 1px 0 rgb(255 255 255 / 82%);
  transform: translateY(-2px);
}

.result-item:hover::before {
  opacity: 0.88;
}

.item-check {
  padding-top: 10px;
}

.file-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: #2f6fed;
  background: linear-gradient(180deg, rgb(239 246 255 / 88%), rgb(219 234 254 / 58%));
  border: 1px solid rgb(255 255 255 / 66%);
  border-radius: 14px;
  box-shadow: 0 10px 22px rgb(37 99 235 / 12%), inset 0 1px 0 rgb(255 255 255 / 74%);
  font-size: 24px;
  backdrop-filter: blur(14px);
}

.type-folder {
  color: #d97706;
  background: linear-gradient(180deg, rgb(255 251 235 / 94%), rgb(254 243 199 / 70%));
}

.type-image {
  color: #0e9f6e;
  background: linear-gradient(180deg, rgb(236 253 245 / 94%), rgb(209 250 229 / 70%));
}

.type-video {
  color: #cc5a00;
  background: linear-gradient(180deg, rgb(255 247 237 / 94%), rgb(254 215 170 / 62%));
}

.type-zip {
  color: #7a5af8;
  background: linear-gradient(180deg, rgb(245 243 255 / 94%), rgb(221 214 254 / 66%));
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
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: color 0.18s ease, opacity 0.18s ease;
}

.file-title:hover {
  color: #2563eb;
  opacity: 0.9;
}

.score {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: 12px;
  color: #1d4ed8;
  background: rgb(219 234 254 / 62%);
  border: 1px solid rgb(255 255 255 / 66%);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 70%);
}

.snippet {
  display: -webkit-box;
  margin-top: 8px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.plain {
  color: #667085;
}

.meta-row {
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.path-row {
  min-width: 0;
  margin-top: 8px;
  color: #2563eb;
}

.path-text {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
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
  gap: 8px;
}

.item-actions :deep(.el-button),
.path-row :deep(.el-button) {
  gap: 4px;
  padding: 6px 8px;
  background: rgb(255 255 255 / 34%);
  border: 1px solid rgb(255 255 255 / 50%);
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 62%);
  transition: background 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.item-actions :deep(.el-button:hover),
.path-row :deep(.el-button:hover) {
  opacity: 0.9;
  background: rgb(255 255 255 / 58%);
  transform: translateY(-1px);
}

.pagination {
  justify-content: flex-end;
  margin-top: 18px;
}

.pagination :deep(.el-pager li),
.pagination :deep(.btn-prev),
.pagination :deep(.btn-next) {
  background: rgb(255 255 255 / 48%) !important;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 60%);
  backdrop-filter: blur(14px);
}

:deep(em) {
  padding: 0 2px;
  font-style: normal;
  color: #172033;
  background: #fff06a;
  border-radius: 3px;
}
</style>
