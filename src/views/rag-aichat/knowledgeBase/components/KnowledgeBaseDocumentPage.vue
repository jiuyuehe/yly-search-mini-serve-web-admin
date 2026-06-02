<template>
  <div class="doc-page">
    <div class="doc-page-toolbar">
      <div class="doc-page-info">
        <div class="doc-page-title">
          {{ datasetTitle }}
        </div>
      </div>

      <div class="doc-toolbar-actions">
        <el-input
          v-model="docSearchName"
          clearable
          size="small"
          placeholder="请输入文件名称"
          class="doc-search"
          @keyup.enter="fetchDocs"
        />
        <div class="doc-toolbar-icon-group">
          <el-tooltip content="查询" placement="top">
            <el-button size="small" class="compact-action-btn" @click="fetchDocs">
              <el-icon><Search /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="刷新" placement="top">
            <el-button size="small" class="compact-action-btn" @click="fetchDocs">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
        <input ref="fileInputRef" type="file" multiple hidden @change="handleFileSelect" />
        <div class="doc-toolbar-icon-group">
          <el-tooltip content="上传文档" placement="top">
            <el-button
              size="small"
              type="primary"
              plain
              class="compact-action-btn"
              @click="fileInputRef?.click()"
            >
              <el-icon><Upload /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip v-if="selectedDocIds.length" content="批量解析" placement="top">
            <el-button size="small" class="compact-action-btn" @click="handleBatchParse">
              <el-icon><CaretRight /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip v-if="selectedDocIds.length" content="批量停止解析" placement="top">
            <el-button size="small" class="compact-action-btn" @click="handleBatchStopParse">
              <el-icon><VideoPause /></el-icon>
            </el-button>
          </el-tooltip>
          <el-popconfirm title="确定要批量删除选中的文档吗？" @confirm="handleBatchDeleteDocs">
            <template #reference>
              <el-tooltip v-if="selectedDocIds.length" content="批量删除" placement="top">
                <el-button size="small" type="danger" plain class="compact-action-btn">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
          </el-popconfirm>
        </div>
        <div class="doc-view-switch-group">
          <el-tooltip content="网格" placement="top">
            <el-button
              size="small"
              class="doc-view-switch-btn"
              :class="{ active: docViewMode === 'grid' }"
              @click="docViewMode = 'grid'"
            >
              <el-icon><Grid /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="列表" placement="top">
            <el-button
              size="small"
              class="doc-view-switch-btn"
              :class="{ active: docViewMode === 'list' }"
              @click="docViewMode = 'list'"
            >
              <el-icon><List /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <div class="doc-status-bar">
      <span v-if="selectedDocIds.length">已选择 {{ selectedDocIds.length }} 个文档</span>
      <span v-else>可通过复选框或鼠标框选多选文档</span>
    </div>

    <div
      ref="gridWrapRef"
      v-loading="docLoading"
      class="doc-grid-wrap"
      :class="{
        'doc-grid-wrap--dragover': dragUploadActive,
        'doc-grid-wrap--selecting': dragState.active
      }"
      @pointerdown="handleDocWrapPointerDown"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDropUpload"
    >
      <div v-if="selectionRectVisible" class="doc-selection-rect" :style="selectionRectStyle"></div>

      <div v-if="docList.length && docViewMode === 'grid'" class="doc-grid">
        <div
          v-for="row in docList"
          :key="row.id"
          :ref="setCardRef(String(row.id))"
          class="doc-card"
          :class="{
            selected:
              !(isGridSelectionDragging && gridSelectionPreviewIdSet.has(String(row.id))) &&
              selectedDocIdSet.has(String(row.id)),
            preview: isGridSelectionDragging && gridSelectionPreviewIdSet.has(String(row.id))
          }"
          @click="handleCardClick(String(row.id))"
        >
          <transition name="doc-card-checkbox-transition">
            <div
              v-if="
                selectedDocIdSet.has(String(row.id)) ||
                (isGridSelectionDragging && gridSelectionPreviewIdSet.has(String(row.id)))
              "
              class="doc-card-checkbox-shell"
              :class="{
                'doc-card-checkbox-shell--preview':
                  isGridSelectionDragging && gridSelectionPreviewIdSet.has(String(row.id))
              }"
            >
              <el-checkbox
                :model-value="
                  isGridSelectionDragging && gridSelectionPreviewIdSet.has(String(row.id))
                    ? true
                    : selectedDocIdSet.has(String(row.id))
                "
                class="doc-card-checkbox"
                :class="{
                  'doc-card-checkbox--preview':
                    isGridSelectionDragging && gridSelectionPreviewIdSet.has(String(row.id))
                }"
                @change="(checked) => handleDocCheckedChange(String(row.id), checked)"
                @click.stop
              />
            </div>
          </transition>

          <div class="doc-icon-box">
            <img
              class="doc-icon-image"
              draggable="false"
              :src="getDocIcon(row)"
              :alt="getDocTypeLabel(row)"
            />
          </div>

          <div class="doc-card-body">
            <div class="doc-card-name" :title="row.name || row.title">
              {{ row.name || row.title || '未命名文件' }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="docList.length && docViewMode === 'list'" class="doc-list-table-wrap">
        <el-table
          ref="listTableRef"
          :data="docList"
          row-key="id"
          class="doc-list-table"
          height="100%"
          :row-class-name="getListRowClassName"
          @selection-change="handleListSelectionChange"
        >
          <el-table-column type="selection" width="52" />
          <el-table-column label="名称" min-width="420" resizable>
            <template #default="{ row }">
              <div class="doc-list-name-cell">
                <img
                  class="doc-list-file-icon"
                  :src="getDocIcon(row)"
                  :alt="getDocTypeLabel(row)"
                />
                <span class="doc-list-file-name">{{ row.name || row.title || '未命名文件' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="140" resizable>
            <template #default="{ row }">
              {{ getDocTypeLabel(row) }}
            </template>
          </el-table-column>
          <el-table-column label="大小" width="140" resizable>
            <template #default="{ row }">
              {{ formatDocSize(row) }}
            </template>
          </el-table-column>
          <el-table-column label="时间" width="220" resizable>
            <template #default="{ row }">
              {{ formatDate(row) }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-else description="暂无文档" />
    </div>

    <div class="doc-pagination">
      <el-pagination
        background
        layout="total, prev, pager, next, jumper"
        :current-page="docPagination.pageNo"
        :page-size="docPagination.pageSize"
        :total="docPagination.total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <DocChunkList
      v-model:visible="chunkDrawerVisible"
      :dataset-id="datasetId"
      :document-id="activeChunkDocument.id"
      :document-name="activeChunkDocument.name"
    />

    <KnowledgeBaseUploadTaskPopup
      :visible="uploadPanelVisible"
      :tasks="uploadFileList"
      @close="uploadPanelVisible = false"
      @clear-all="handleClearUploadTasks"
    />
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/formatTime'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CaretRight,
  Delete,
  Grid,
  List,
  Refresh,
  Search,
  Upload,
  VideoPause
} from '@element-plus/icons-vue'
import type { PropType } from 'vue'

import {
  deleteDocuments,
  downloadDocument,
  listDocuments,
  parseDocuments,
  stopParsingDocuments,
  uploadDocument
} from '@/api/rag-aichat/document'
import { getFileIconByExt } from '@/utils/fileIconMap'
import DocChunkList from './DocChunkList.vue'
import KnowledgeBaseUploadTaskPopup from './KnowledgeBaseUploadTaskPopup.vue'

defineOptions({ name: 'RagAiKnowledgeBaseDocumentPage' })

const props = defineProps({
  datasetId: { type: [String, Number], default: '' },
  dataset: {
    type: Object as PropType<Record<string, any> | null>,
    default: null
  }
})

const docSearchName = ref('')
const docViewMode = ref<'grid' | 'list'>('grid')
const docLoading = ref(false)
const docList = ref<any[]>([])
const docPagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })
const selectedDocIds = ref<string[]>([])
const gridSelectionPreviewIds = ref<string[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadFileList = ref<any[]>([])
const uploadPanelVisible = ref(false)
const chunkDrawerVisible = ref(false)
const activeChunkDocument = ref({ id: '', name: '' })
const gridWrapRef = ref<HTMLElement | null>(null)
const listTableRef = ref<any>(null)
const syncingListSelection = ref(false)
const dragUploadActive = ref(false)
const dragEnterCounter = ref(0)
const cardElementMap = new Map<string, HTMLElement>()
const pointerDownOnBlankSpace = ref(false)
const dragState = reactive({
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
})

const datasetTitle = computed(() => {
  const groupKey = String(
    props.dataset?.__datasetGroupKey || props.dataset?.groupKey || props.dataset?.source || ''
  )
  const datasetTypeLabel = groupKey === 'invite' ? '邀请加入的知识库' : '我的知识库'
  const datasetName = props.dataset?.dataset_name || props.dataset?.name || '未命名知识库'
  const documentCount = Number(props.dataset?.document_count || props.dataset?.doc_count || 0)
  return `${datasetTypeLabel} / ${datasetName} / ${documentCount} 个文件`
})

const selectedDocIdSet = computed(() => new Set(selectedDocIds.value))
const gridSelectionPreviewIdSet = computed(() => new Set(gridSelectionPreviewIds.value))
const isGridSelectionDragging = computed(
  () => docViewMode.value === 'grid' && selectionRectVisible.value
)

const selectionRectVisible = computed(() => dragState.active && dragState.moved)

const selectionRectStyle = computed(() => {
  if (!gridWrapRef.value || !selectionRectVisible.value) return {}
  const wrapRect = gridWrapRef.value.getBoundingClientRect()
  const left =
    Math.min(dragState.startX, dragState.currentX) - wrapRect.left + gridWrapRef.value.scrollLeft
  const top =
    Math.min(dragState.startY, dragState.currentY) - wrapRect.top + gridWrapRef.value.scrollTop
  const width = Math.abs(dragState.currentX - dragState.startX)
  const height = Math.abs(dragState.currentY - dragState.startY)
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
})

const normalizeList = (res: any) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.docs)) return res.docs
  if (Array.isArray(res?.data?.docs)) return res.data.docs
  if (Array.isArray(res?.data?.list)) return res.data.list
  if (Array.isArray(res?.data)) return res.data
  return []
}

const fetchDocs = async () => {
  if (!props.datasetId) {
    docList.value = []
    docPagination.total = 0
    gridSelectionPreviewIds.value = []
    return
  }
  docLoading.value = true
  try {
    const res = await listDocuments({
      dataset_id: props.datasetId,
      page: docPagination.pageNo,
      page_size: docPagination.pageSize,
      name: docSearchName.value.trim() || undefined
    })
    const docs = normalizeList(res)
    docList.value = docs
    docPagination.total = res?.total || res?.data?.total || 0
    selectedDocIds.value = selectedDocIds.value.filter((id) =>
      docs.some((item: any) => String(item.id) === id)
    )
    gridSelectionPreviewIds.value = []
  } catch (error) {
    console.error(error)
    ElMessage.error('获取文档失败')
  } finally {
    docLoading.value = false
  }
}

const setCardRef = (id: string) => (el: Element | null) => {
  if (el instanceof HTMLElement) {
    cardElementMap.set(id, el)
  } else {
    cardElementMap.delete(id)
  }
}

const updateSelectionByRect = () => {
  if (!gridWrapRef.value) return
  const minX = Math.min(dragState.startX, dragState.currentX)
  const maxX = Math.max(dragState.startX, dragState.currentX)
  const minY = Math.min(dragState.startY, dragState.currentY)
  const maxY = Math.max(dragState.startY, dragState.currentY)

  let selectedIds: string[] = []
  if (docViewMode.value === 'grid') {
    selectedIds = docList.value
      .filter((row) => {
        const el = cardElementMap.get(String(row.id))
        if (!el) return false
        const rect = el.getBoundingClientRect()
        return !(rect.right < minX || rect.left > maxX || rect.bottom < minY || rect.top > maxY)
      })
      .map((row) => String(row.id))
    gridSelectionPreviewIds.value = selectedIds
  } else {
    const rows = Array.from(
      gridWrapRef.value.querySelectorAll('.doc-list-table .el-table__body-wrapper tbody tr')
    )
    selectedIds = rows
      .map((rowEl, index) => ({ rowEl: rowEl as HTMLElement, rowData: docList.value[index] }))
      .filter(({ rowEl, rowData }) => {
        if (!rowData) return false
        const rect = rowEl.getBoundingClientRect()
        return !(rect.right < minX || rect.left > maxX || rect.bottom < minY || rect.top > maxY)
      })
      .map(({ rowData }) => String(rowData.id))
  }

  if (docViewMode.value === 'list') {
    selectedDocIds.value = selectedIds
  }
}

function cleanupPointerListeners() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  dragState.active = false
  dragState.moved = false
}

function handlePointerMove(event: PointerEvent) {
  if (!dragState.active) return
  dragState.currentX = event.clientX
  dragState.currentY = event.clientY
  if (
    Math.abs(dragState.currentX - dragState.startX) > 4 ||
    Math.abs(dragState.currentY - dragState.startY) > 4
  ) {
    dragState.moved = true
  }
  updateSelectionByRect()
}

function handlePointerUp() {
  if (pointerDownOnBlankSpace.value && !dragState.moved) {
    selectedDocIds.value = []
    gridSelectionPreviewIds.value = []
  }
  if (docViewMode.value === 'grid' && dragState.moved) {
    selectedDocIds.value = [...gridSelectionPreviewIds.value]
  }
  if (docViewMode.value === 'grid') {
    gridSelectionPreviewIds.value = []
  }
  pointerDownOnBlankSpace.value = false
  cleanupPointerListeners()
}

const handleGridPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!gridWrapRef.value || !target) return
  if (
    target.closest('.doc-card-actions') ||
    target.closest('.doc-card-checkbox-shell') ||
    target.closest('.doc-card-checkbox') ||
    target.closest('.el-checkbox') ||
    target.closest('.el-button') ||
    target.closest('.el-popconfirm')
  ) {
    pointerDownOnBlankSpace.value = false
    return
  }
  pointerDownOnBlankSpace.value = !target.closest('.doc-card')

  dragState.active = true
  dragState.moved = false
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.currentX = event.clientX
  dragState.currentY = event.clientY
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleDocWrapPointerDown = (event: PointerEvent) => {
  if (docViewMode.value === 'grid') {
    handleGridPointerDown(event)
    return
  }
  const target = event.target as HTMLElement | null
  if (!gridWrapRef.value || !target) return
  if (
    target.closest('.el-table__header') ||
    target.closest('.el-table-column--selection') ||
    target.closest('.el-checkbox') ||
    target.closest('.el-button') ||
    target.closest('.el-popconfirm')
  ) {
    pointerDownOnBlankSpace.value = false
    return
  }
  pointerDownOnBlankSpace.value = !target.closest('.el-table__body tbody tr')

  dragState.active = true
  dragState.moved = false
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.currentX = event.clientX
  dragState.currentY = event.clientY
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleDocCheckedChange = (docId: string, checked: boolean | string | number) => {
  const isChecked = checked === true || checked === 'true' || checked === 1
  if (isChecked) {
    if (!selectedDocIds.value.includes(docId)) {
      selectedDocIds.value = [...selectedDocIds.value, docId]
    }
    return
  }
  selectedDocIds.value = selectedDocIds.value.filter((id) => id !== docId)
}

const handleCardClick = (docId: string) => {
  if (docViewMode.value !== 'grid' || dragState.moved) return
  selectedDocIds.value = [docId]
}

const handleListSelectionChange = (rows: any[]) => {
  if (syncingListSelection.value) return
  selectedDocIds.value = rows.map((row) => String(row.id))
}

const getListRowClassName = ({ row }: { row: any }) =>
  selectedDocIdSet.value.has(String(row.id)) ? 'is-selected-row' : ''

const syncListTableSelection = async () => {
  if (docViewMode.value !== 'list' || !listTableRef.value) return
  syncingListSelection.value = true
  try {
    await nextTick()
    listTableRef.value.clearSelection?.()
    docList.value.forEach((row) => {
      const checked = selectedDocIdSet.value.has(String(row.id))
      if (checked) {
        listTableRef.value.toggleRowSelection?.(row, true)
      }
    })
  } finally {
    syncingListSelection.value = false
  }
}

const getDocName = (row: any) => String(row?.name || row?.title || row?.document_name || '')

const getDocExt = (row: any) => {
  const name = getDocName(row)
  const extFromName = name.includes('.') ? name.split('.').pop() : ''
  return String(row?.suffix || extFromName || row?.type || 'file')
    .replace('.', '')
    .toUpperCase()
}

const getDocTypeLabel = (row: any) => {
  const ext = getDocExt(row)
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'BMP', 'SVG'].includes(ext)) return '图片'
  if (['DOC', 'DOCX'].includes(ext)) return 'WORD'
  if (ext === 'PDF') return 'PDF'
  if (['XLS', 'XLSX'].includes(ext)) return 'EXCEL'
  if (['PPT', 'PPTX'].includes(ext)) return 'PPT'
  if (ext === 'TXT') return 'TXT'
  return ext || '文件'
}

const getDocIcon = (row: any) => getFileIconByExt(getDocExt(row))

const formatDocSize = (row: any) => {
  const raw = row?.size ?? row?.file_size ?? row?.byte_size ?? row?.fileSize
  const size = Number(raw)
  if (!size || Number.isNaN(size)) return '--'
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)}M`
  if (size >= 1024) return `${(size / 1024).toFixed(2)}KB`
  return `${size}B`
}

const updateUploadFileStatus = (uid: string, patch: Record<string, any>) => {
  const index = uploadFileList.value.findIndex((item) => item.uid === uid)
  if (index >= 0) {
    uploadFileList.value[index] = {
      ...uploadFileList.value[index],
      ...patch
    }
  }
}

const uploadFiles = async (files: File[]) => {
  if (!files.length || !props.datasetId) return

  uploadPanelVisible.value = true
  const fileItems = files.map((file) => ({
    name: file.name,
    size: file.size,
    uid: `${file.name}_${file.size}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    status: 'uploading',
    percent: 0
  }))
  uploadFileList.value = [...fileItems, ...uploadFileList.value]

  let hasFail = false
  for (const [index, file] of files.entries()) {
    const uid = fileItems[index].uid
    try {
      await uploadDocument(String(props.datasetId), file)
      updateUploadFileStatus(uid, { status: 'success', percent: 100 })
    } catch (error) {
      console.error(error)
      hasFail = true
      updateUploadFileStatus(uid, { status: 'fail' })
    }
  }

  if (hasFail) {
    ElMessage.warning('部分文件上传失败')
  } else {
    ElMessage.success('上传完成')
  }
  await fetchDocs()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  await uploadFiles(files)
  input.value = ''
}

const handleDragEnter = (event: DragEvent) => {
  if (!event.dataTransfer?.types?.includes('Files')) return
  dragEnterCounter.value += 1
  dragUploadActive.value = true
}

const handleDragOver = (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = 'copy'
}

const handleDragLeave = (event: DragEvent) => {
  if (!event.dataTransfer?.types?.includes('Files')) return
  dragEnterCounter.value = Math.max(0, dragEnterCounter.value - 1)
  if (dragEnterCounter.value === 0) {
    dragUploadActive.value = false
  }
}

const handleDropUpload = async (event: DragEvent) => {
  dragUploadActive.value = false
  dragEnterCounter.value = 0
  const files = Array.from(event.dataTransfer?.files || [])
  await uploadFiles(files)
}

const handleClearUploadTasks = () => {
  uploadFileList.value = []
  uploadPanelVisible.value = false
}

const parseDoc = async (row: any) => {
  if (!props.datasetId) return
  try {
    await parseDocuments(String(props.datasetId), String(row.id))
    ElMessage.success('已开始解析')
  } catch (error) {
    console.error(error)
    ElMessage.error('解析失败')
    return
  }
  await fetchDocs()
}

const handleBatchParse = async () => {
  if (!selectedDocIds.value.length || !props.datasetId) return
  try {
    await parseDocuments(String(props.datasetId), selectedDocIds.value.join(','))
    ElMessage.success('已提交批量解析')
  } catch (error) {
    console.error(error)
    ElMessage.error('批量解析失败')
    return
  }
  await fetchDocs()
}

const handleBatchStopParse = async () => {
  if (!selectedDocIds.value.length || !props.datasetId) return
  try {
    await stopParsingDocuments(String(props.datasetId), selectedDocIds.value.join(','))
    ElMessage.success('已提交停止解析')
  } catch (error) {
    console.error(error)
    ElMessage.error('批量停止解析失败')
    return
  }
  await fetchDocs()
}

const deleteDoc = async (row: any) => {
  if (!props.datasetId) return
  try {
    await deleteDocuments(String(props.datasetId), String(row.id))
    ElMessage.success('删除成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
    return
  }
  await fetchDocs()
}

const handleBatchDeleteDocs = async () => {
  if (!selectedDocIds.value.length || !props.datasetId) return
  try {
    await deleteDocuments(String(props.datasetId), selectedDocIds.value.join(','))
    selectedDocIds.value = []
    ElMessage.success('删除成功')
  } catch (error) {
    console.error(error)
    ElMessage.error('批量删除失败')
    return
  }
  await fetchDocs()
}

const downloadDoc = async (row: any) => {
  if (!props.datasetId) return
  try {
    const blob = await downloadDocument(String(props.datasetId), String(row.id))
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.download = row.name || 'document'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    ElMessage.error('下载失败')
  }
}

const openChunkDrawer = (row: any) => {
  activeChunkDocument.value = {
    id: String(row.id || ''),
    name: String(row.name || row.document_name || '文档切片管理')
  }
  chunkDrawerVisible.value = true
}

const handlePageChange = (page: number) => {
  docPagination.pageNo = page
  fetchDocs()
}

const handleSizeChange = (size: number) => {
  docPagination.pageSize = size
  docPagination.pageNo = 1
  fetchDocs()
}

watch(
  () => props.datasetId,
  async () => {
    docPagination.pageNo = 1
    docSearchName.value = ''
    selectedDocIds.value = []
    gridSelectionPreviewIds.value = []
    uploadFileList.value = []
    uploadPanelVisible.value = false
    cardElementMap.clear()
    await fetchDocs()
  },
  { immediate: true }
)

watch([docViewMode, docList], () => {
  syncListTableSelection()
})

watch(selectedDocIds, () => {
  syncListTableSelection()
})

watch(
  () => docViewMode.value,
  () => {
    gridSelectionPreviewIds.value = []
  }
)

onBeforeUnmount(() => {
  cleanupPointerListeners()
  dragUploadActive.value = false
  dragEnterCounter.value = 0
})
</script>

<style scoped>
.doc-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.doc-page-toolbar {
  display: flex;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.doc-page-info {
  min-width: 0;
}

.doc-page-title {
  font-size: 18px;
  font-weight: 600;
}

.doc-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.doc-search {
  width: 168px;
}

.doc-toolbar-icon-group {
  display: flex;
  align-items: center;
  margin-left: -1px;
}

.compact-action-btn {
  min-width: 28px;
  padding: 4px 7px;
}

.doc-toolbar-icon-group :deep(.el-button) {
  margin-left: -1px;
}

.doc-toolbar-icon-group :deep(.el-button:first-child) {
  margin-left: 0;
}

.doc-view-switch {
  margin-left: 4px;
}

.doc-view-switch-group {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.doc-view-switch-btn {
  min-width: 30px;
  padding: 4px 7px;
  color: #64748b;
  border: 1px solid var(--app-border-color);
  border-radius: 0;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.doc-view-switch-btn:first-child {
  border-bottom-left-radius: var(--app-radius-sm);
  border-top-left-radius: var(--app-radius-sm);
}

.doc-view-switch-btn:last-child {
  margin-left: -1px;
  border-top-right-radius: var(--app-radius-sm);
  border-bottom-right-radius: var(--app-radius-sm);
}

.doc-view-switch-btn:hover {
  color: #4a93ff;
  background: rgb(74 147 255 / 8%);
  border-color: rgb(74 147 255 / 28%);
}

.doc-view-switch-btn.active {
  color: #1d69d9;
  background: rgb(29 105 217 / 10%);
  border-color: rgb(29 105 217 / 32%);
}

.doc-view-switch-btn:active {
  transform: scale(0.96);
}

.doc-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  padding: 0 4px;
  color: var(--app-text-secondary);
}

.doc-grid-wrap {
  position: relative;
  display: flex;
  min-height: 0;
  padding: 16px;
  overflow: auto;
  background: var(--app-bg-subtle);
  border: 1px solid var(--app-border-color);
  flex-direction: column;
  border-radius: var(--app-radius-lg);
  flex: 1;
}

.doc-grid-wrap--dragover {
  background: rgb(0 82 217 / 8%);
  box-shadow: inset 0 0 0 2px rgb(0 82 217 / 35%);
}

.doc-grid-wrap--selecting {
  user-select: none;
}

.doc-grid-wrap--selecting .doc-card,
.doc-grid-wrap--selecting .doc-card * {
  user-select: none;
}

.doc-grid-wrap--selecting .doc-list-table,
.doc-grid-wrap--selecting .doc-list-table * {
  user-select: none;
}

.doc-grid-wrap--selecting .doc-icon-image {
  pointer-events: none;
}

.doc-selection-rect {
  position: absolute;
  z-index: 2;
  pointer-events: none;
  background: rgb(0 82 217 / 12%);
  border: 1px solid rgb(0 82 217 / 35%);
}

.doc-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 8px;
}

.doc-card {
  position: relative;
  display: flex;
  min-height: 120px;
  padding: 6px 4px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  flex-direction: column;
  gap: 8px;
}

.doc-card:hover {
  border-color: rgb(74 147 255 / 16%);
}

.doc-card.selected {
  border-color: #4a93ff;
  box-shadow: 0 2px 10px rgb(59 130 246 / 20%);
}

.doc-card.preview {
  border-color: #c9d0db;
  box-shadow: none;
}

.doc-card-checkbox-shell {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  will-change: transform, opacity;
}

.doc-card-checkbox-shell--preview {
  transform: scale(0.98);
}

:deep(.doc-card-checkbox) {
  display: flex;
  width: 24px;
  height: 24px;
  margin: 0;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease,
    background-color 0.18s ease;
}

:deep(.doc-card-checkbox .el-checkbox__input) {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.doc-card-checkbox .el-checkbox__inner) {
  width: 24px;
  height: 24px;
  background: #1d69d9;
  border: 2px solid #e5edff;
  border-radius: 50%;
  transition:
    transform 0.12s ease,
    background-color 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

:deep(.doc-card-checkbox .el-checkbox__inner::after) {
  top: 50%;
  left: 50%;
  width: 4px;
  height: 8px;
  border-width: 2px;
  transform: translate(-50%, -60%) rotate(45deg);
  transition: inherit;
}

:deep(.doc-card-checkbox .el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #1d69d9;
  border-color: #e5edff;
  box-shadow: 0 2px 8px rgb(29 105 217 / 18%);
}

:deep(.doc-card-checkbox-shell--preview .el-checkbox__inner) {
  background: #c7cdd8;
  border-color: #edf0f4;
  box-shadow: none;
}

:deep(.doc-card-checkbox-shell--preview .el-checkbox__input.is-checked .el-checkbox__inner) {
  background: #c7cdd8;
  border-color: #edf0f4;
  box-shadow: none;
}

.doc-card-checkbox-transition-enter-active,
.doc-card-checkbox-transition-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}

.doc-card-checkbox-transition-enter-from,
.doc-card-checkbox-transition-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.doc-icon-box {
  display: flex;
  min-height: 68px;
  padding-top: 2px;
  align-items: center;
  justify-content: center;
}

.doc-icon-image {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.doc-card-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  padding: 0 2px;
}

.doc-card-name {
  display: -webkit-box;
  min-height: 30px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  color: #27364d;
  text-overflow: ellipsis;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.doc-pagination {
  display: flex;
  justify-content: flex-end;
}

.doc-list-table {
  width: 100%;
  height: 100%;
  background: #fff;
}

.doc-list-table :deep(.el-table__header-wrapper th) {
  font-weight: 600;
  color: #334155;
  background: linear-gradient(180deg, #f7faff 0%, #edf3ff 100%);
}

.doc-list-table :deep(.el-table__header-wrapper th.is-leaf) {
  border-bottom: 1px solid #dbe6f7;
}

.doc-list-table :deep(.el-table__body tr.is-selected-row > td) {
  background: rgb(29 105 217 / 8%);
}

.doc-list-table :deep(.el-table__body tr.is-selected-row:hover > td) {
  background: rgb(29 105 217 / 12%);
}

.doc-list-table :deep(.el-table__body tr.is-selected-row td.el-table-fixed-column--right) {
  background: rgb(29 105 217 / 8%);
}

.doc-list-table-wrap {
  display: flex;
  min-height: 0;
  flex: 1;
}

.doc-list-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-list-file-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.doc-list-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
