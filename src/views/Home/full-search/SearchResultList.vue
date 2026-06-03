<template>
  <section ref="rootRef" class="result-list">
    <div ref="toolbarRef" class="result-toolbar">
      <div class="toolbar-summary">
        <el-checkbox
          :model-value="isAllSelected"
          :indeterminate="isIndeterminate"
          @change="toggleAll"
        >
          已选 {{ selectedIds.length }}
        </el-checkbox>

        <div class="toolbar-meta">
          <span class="result-count">共 {{ total }} 条</span>
          <span v-if="searchTime !== undefined && searchTime !== null" class="search-time">
            耗时 {{ formatSearchTime(searchTime) }}
          </span>
        </div>
      </div>

      <div class="toolbar-actions">
        <el-button v-if="selectedIds.length" type="primary" plain @click="$emit('batch-download')">
          <Icon icon="ep:download" />
          批量下载
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!files.length" description="暂无搜索结果" />

    <el-table
      v-else
      :header-cell-style="{ background: '#f5f7fa', color: '#333333', fontWeight: 'bold' }"
      class="result-table"
      :max-height="tableMaxHeight"
      :data="files"
      row-key="esId"
      stripe
      :show-overflow-tooltip="false"
    >
      <el-table-column width="48" align="center" fixed="left">
        <template #default="{ row }">
          <el-checkbox
            :model-value="selectedIds.includes(getEsId(row))"
            @change="(checked: boolean) => toggleOne(row, checked)"
          />
        </template>
      </el-table-column>

      <el-table-column label="文件" min-width="360" fixed="left">
        <template #default="{ row }">
          <div class="file-cell">
            <div class="file-icon" :class="`type-${getDocGroup(row)}`">
              <img
                class="file-icon-image"
                :src="getFileIcon(row)"
                :alt="row.folder ? '文件夹' : '文件'"
              />
            </div>

            <div class="file-info">
              <div class="file-title-row">
                <el-tooltip
                  effect="dark"
                  placement="top"
                  :content="row.fileName || '-'"
                  :show-after="300"
                >
                  <button
                    class="file-title"
                    type="button"
                    v-dompurify-html="highlightName(row.fileName || '')"
                    @click="handleFileNameClick(row)"
                  ></button>
                </el-tooltip>

                <el-tooltip
                  v-if="showScore && row.score !== undefined"
                  effect="dark"
                  placement="top"
                  :content="formatScore(row.score)"
                  :show-after="300"
                >
                  <span class="score">{{ formatScore(row.score) }}</span>
                </el-tooltip>
              </div>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="摘要 / 命中内容" min-width="360">
        <template #default="{ row }">
          <el-tooltip
            v-if="getSnippetText(row)"
            effect="dark"
            placement="top"
            :content="getSnippetText(row)"
            :show-after="300"
            popper-class="result-table-tooltip"
          >
            <div
              v-if="row.fileContents"
              class="snippet snippet-clickable"
              v-dompurify-html="row.fileContents"
              @click="openSnippetDialog(row)"
            ></div>

            <div v-else class="snippet plain snippet-clickable" @click="openSnippetDialog(row)">
              {{ row.enrichSummary || row.fileSummary }}
            </div>
          </el-tooltip>

          <span v-else class="empty-text">-</span>
        </template>
      </el-table-column>

      <el-table-column label="路径" min-width="320">
        <template #default="{ row }">
          <div class="path-cell">
            <el-tooltip
              effect="dark"
              placement="top"
              :content="row.filePath || '-'"
              :show-after="300"
              popper-class="result-table-tooltip"
            >
              <div class="path-main">
                <Icon icon="ep:location" />
                <span class="path-text ellipsis">{{ row.filePath || '-' }}</span>
              </div>
            </el-tooltip>

            <el-button v-if="row.filePath" link type="primary" @click="copyPath(row.filePath)">
              <Icon icon="ep:copy-document" />
              复制
            </el-button>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="来源" width="110">
        <template #default="{ row }">
          <el-tooltip
            effect="dark"
            placement="top"
            :content="row.matchSource || 'NAS空间'"
            :show-after="300"
          >
            <span>{{ row.matchSource || 'NAS空间' }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <span>{{ row.folder ? '文件夹' : '文件' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="大小" width="110">
        <template #default="{ row }">
          <span>{{ formatSize(row.fileSize) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="时间" min-width="170">
        <template #default="{ row }">
          <el-tooltip
            effect="dark"
            placement="top"
            :content="formatTimeText(row)"
            :show-after="300"
          >
            <span class="ellipsis table-text">{{ formatTimeText(row) }}</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="标签" min-width="160">
        <template #default="{ row }">
          <div v-if="row.fileAiTag || row.fileSysTag" class="tag-row">
            <el-tooltip
              v-if="row.fileAiTag"
              effect="dark"
              placement="top"
              :content="row.fileAiTag"
              :show-after="300"
            >
              <el-tag size="small" effect="plain" class="tag-item">
                {{ row.fileAiTag }}
              </el-tag>
            </el-tooltip>

            <el-tooltip
              v-if="row.fileSysTag"
              effect="dark"
              placement="top"
              :content="row.fileSysTag"
              :show-after="300"
            >
              <el-tag size="small" type="info" effect="plain" class="tag-item">
                {{ row.fileSysTag }}
              </el-tag>
            </el-tooltip>
          </div>

          <span v-else class="empty-text">-</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="120" align="right" fixed="right">
        <template #default="{ row }">
          <div class="item-actions">
            <el-button
              v-if="!row.folder"
              link
              type="primary"
              @click="$emit('basemetas-preview', row)"
            >
              预览
            </el-button>

            <el-button v-if="row.folder" link type="primary" @click="$emit('preview', row)">
              <Icon icon="ep:view" />
              打开
            </el-button>

            <el-button v-if="!row.folder" link type="primary" @click="$emit('download', row)">
              <Icon icon="ep:download" />
              下载
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <Pagination
      v-if="total > pageSize"
      class="pagination"
      :total="total"
      v-model:page="currentPage"
      v-model:limit="currentPageSize"
    />

    <Dialog
      :modal="false"
      v-model="snippetDialogVisible"
      :title="snippetDialogTitle"
      width="760px"
      :scroll="true"
    >
      <div v-if="snippetDialogHtml" class="snippet-dialog-content snippet-dialog-html">
        <div v-dompurify-html="snippetDialogHtml"></div>
      </div>
      <pre v-else class="snippet-dialog-content snippet-dialog-plain">{{ snippetDialogText }}</pre>
    </Dialog>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { CommonFile } from '@/api/rag/search'
import { getFileIconByExt } from '@/utils/fileIconMap'

defineOptions({ name: 'HomeSearchResultList' })

const props = defineProps<{
  files: CommonFile[]
  total: number
  loading: boolean
  keyword?: string
  showScore?: boolean
  page: number
  pageSize: number
  selectedIds: string[]
  searchTime?: number
}>()

const emit = defineEmits<{
  'basemetas-preview': [file: CommonFile]
  preview: [file: CommonFile]
  download: [file: CommonFile]
  'batch-download': []
  'update:selectedIds': [ids: string[]]
  'page-change': [page: number]
  'size-change': [size: number]
}>()

const rootRef = ref<HTMLElement>()
const toolbarRef = ref<HTMLElement>()
const tableMaxHeight = ref(360)
const snippetDialogVisible = ref(false)
const snippetDialogTitle = ref('命中内容')
const snippetDialogHtml = ref('')
const snippetDialogText = ref('')
let resizeObserver: ResizeObserver | undefined

const getEsId = (file: CommonFile) => file.esId || ''

const pageIds = computed(() => props.files.map(getEsId).filter(Boolean))

const isAllSelected = computed(() => {
  return pageIds.value.length > 0 && pageIds.value.every((id) => props.selectedIds.includes(id))
})

const isIndeterminate = computed(() => {
  const selectedCount = pageIds.value.filter((id) => props.selectedIds.includes(id)).length
  return selectedCount > 0 && selectedCount < pageIds.value.length
})

const currentPage = computed({
  get: () => props.page,
  set: (value: number) => emit('page-change', value)
})

const currentPageSize = computed({
  get: () => props.pageSize,
  set: (value: number) => emit('size-change', value)
})

const paginationHeight = computed(() => {
  if (!props.total || props.total <= props.pageSize) return 0
  return 56
})

const updateTableMaxHeight = () => {
  const rootHeight = rootRef.value?.clientHeight || 0
  const toolbarHeight = toolbarRef.value?.clientHeight || 0
  const next = Math.max(320, rootHeight - toolbarHeight - paginationHeight.value - 12)
  tableMaxHeight.value = next
}

const toggleOne = (file: CommonFile, checked: boolean) => {
  const esId = getEsId(file)
  if (!esId) return

  const next = checked
    ? [...new Set([...props.selectedIds, esId])]
    : props.selectedIds.filter((id) => id !== esId)

  emit('update:selectedIds', next)
}

const toggleAll = (checked: boolean) => {
  const ids = pageIds.value

  const next = checked
    ? [...new Set([...props.selectedIds, ...ids])]
    : props.selectedIds.filter((id) => !ids.includes(id))

  emit('update:selectedIds', next)
}

const handleFileNameClick = (file: CommonFile) => {
  if (file.folder) {
    emit('preview', file)
    return
  }

  emit('basemetas-preview', file)
}

const openSnippetDialog = (file: CommonFile) => {
  const htmlContent = String(file.fileContents || '').trim()
  const plainContent = String(file.enrichSummary || file.fileSummary || '').trim()

  snippetDialogTitle.value = `${file.fileName || '命中内容'}`
  snippetDialogHtml.value = htmlContent
  snippetDialogText.value = htmlContent ? stripHtml(htmlContent) || plainContent : plainContent
  snippetDialogVisible.value = true
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    return (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char] || char
    )
  })

const stripHtml = (value?: string) => {
  if (!value) return ''
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

const highlightName = (fileName: string) => {
  const safeName = escapeHtml(fileName)
  const keyword = props.keyword?.trim()

  if (!keyword) return safeName

  const safeKeyword = escapeHtml(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return safeName.replace(new RegExp(safeKeyword, 'gi'), (match) => `<em>${match}</em>`)
}

const getSnippetText = (file: CommonFile) => {
  return stripHtml(file.fileContents || file.enrichSummary || file.fileSummary || '')
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
  if (file.folder) return getFileIconByExt('dept-folder')

  const fileName = String(file.fileName || file.filePath || '')
  const fileExt = String(file.fileExt || '').replace(/^\./, '')
  const inferredExt = fileName.split('?')[0].match(/\.([^.\\/:]+)$/)?.[1] || ''

  return getFileIconByExt(fileExt || inferredExt)
}

const formatSize = (size?: number) => {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const formatTimeText = (file: CommonFile) => {
  return (
    file.updateTime ||
    file.createTime ||
    (file.lastModified ? new Date(file.lastModified).toLocaleString() : '-')
  )
}

const normalizeScore = (score?: number) => {
  if (score === undefined || score === null || Number.isNaN(score)) return 0
  if (score <= 0) return 0
  return Math.min(1, score)
}

const formatScore = (score: number) => `相关度 ${(normalizeScore(score) * 100).toFixed(1)}%`

const formatSearchTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const copyPath = async (path?: string) => {
  if (!path) return

  await navigator.clipboard?.writeText(path)
  ElMessage.success('路径已复制')
}

onMounted(() => {
  updateTableMaxHeight()
  resizeObserver = new ResizeObserver(() => {
    updateTableMaxHeight()
  })

  if (rootRef.value) {
    resizeObserver.observe(rootRef.value)
  }

  window.addEventListener('resize', updateTableMaxHeight)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateTableMaxHeight)
})
</script>

<style scoped lang="scss">
.result-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 10px;
  height: 100%;
  overflow: hidden;
}

.result-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 12px;
}

.toolbar-summary,
.toolbar-actions,
.toolbar-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-count,
.search-time {
  font-size: 13px;
  color: rgb(71 85 105);
}

.search-time {
  padding-left: 8px;
  border-left: 1px solid rgb(15 23 42 / 8%);
}

.result-table {
  width: 100%;
}

.result-table :deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

.file-cell {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}

.file-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 0;
}

.file-icon-image {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.type-folder {
  color: var(--el-color-warning);
}

.type-image {
  color: var(--el-color-success);
}

.type-video {
  color: var(--el-color-warning);
}

.type-zip {
  color: var(--el-color-info);
}

.file-info {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.file-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.file-title {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.file-title:hover {
  color: var(--el-color-primary);
}

.score {
  display: inline-block;
  flex: 0 0 auto;
  min-width: fit-content;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 18px;
  color: rgb(37 99 235);
  white-space: nowrap;
  background: rgb(239 246 255);
  border: 1px solid rgb(191 219 254);
  border-radius: 999px;
}

.snippet {
  width: 100%;
  max-height: 40px;
  padding: 0;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(71 85 105);
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.snippet-clickable {
  cursor: pointer;
}

.snippet-clickable:hover {
  color: var(--el-color-primary);
}

.plain {
  color: rgb(71 85 105);
}

.path-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.path-main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: rgb(37 99 235);
}

.path-main .el-icon {
  flex: 0 0 auto;
}

.path-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(100 116 139);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
}

.tag-item {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.item-actions :deep(.el-button),
.path-cell :deep(.el-button) {
  gap: 3px;
  height: 24px;
  min-height: 24px;
  padding: 0 3px;
  font-size: 12px;
  white-space: nowrap;
}

.empty-text {
  font-size: 13px;
  color: rgb(148 163 184);
}

.snippet-dialog-content {
  max-height: min(60vh, 520px);
  overflow: auto;
  padding: 4px 2px;
  line-height: 1.75;
  color: rgb(51 65 85);
  word-break: break-word;
}

.snippet-dialog-html {
  white-space: normal;
}

.snippet-dialog-html :deep(*) {
  max-width: 100%;
}

.snippet-dialog-plain {
  margin: 0;
  font: inherit;
  white-space: pre-wrap;
}

.pagination {
  justify-content: flex-end;
  margin-top: 4px;
}

:deep(em) {
  padding: 0 2px;
  font-style: normal;
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
  border-radius: 2px;
}
</style>
