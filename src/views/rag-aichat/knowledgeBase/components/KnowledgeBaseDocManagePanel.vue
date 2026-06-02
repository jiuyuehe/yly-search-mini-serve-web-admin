<template>
  <div class="doc-manage-panel">
    <div class="doc-toolbar">
      <el-input
        v-model="docSearchName"
        clearable
        placeholder="请输入文件名称"
        class="doc-search"
        @keyup.enter="fetchDocs"
      />
      <el-button @click="fetchDocs">查询</el-button>
      <el-button @click="fetchDocs">刷新</el-button>
      <input ref="fileInputRef" type="file" multiple hidden @change="handleFileSelect" />
      <el-button type="primary" plain @click="fileInputRef?.click()">
        <el-icon class="mr-5px"><Upload /></el-icon>
        上传文档
      </el-button>
      <el-button :disabled="!selectedDocIds.length" @click="handleBatchParse">批量解析</el-button>
      <el-button :disabled="!selectedDocIds.length" @click="handleBatchStopParse">批量停止解析</el-button>
      <el-popconfirm title="确定要批量删除选中的文档吗？" @confirm="handleBatchDeleteDocs">
        <template #reference>
          <el-button type="danger" plain :disabled="!selectedDocIds.length">批量删除</el-button>
        </template>
      </el-popconfirm>
    </div>

    <div v-if="uploadFileList.length" class="upload-files">
      <div v-for="file in uploadFileList" :key="`${file.name}_${file.uid}`" class="upload-file-item">
        <el-icon><Document /></el-icon>
        <span class="truncate">{{ file.name }}</span>
        <el-progress
          v-if="['progress', 'parsing'].includes(file.status)"
          :percentage="file.status === 'progress' ? file.percent : file.parsePercent || 0"
          :stroke-width="6"
        />
        <span v-else>{{ getUploadStatusLabel(file.status) }}</span>
      </div>
    </div>

    <div class="doc-table-wrap">
      <el-table
        v-loading="docLoading"
        :data="docList"
        row-key="id"
        stripe
        height="100%"
        @selection-change="handleDocSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="预览" width="92">
          <template #default="{ row }">
            <div class="doc-preview-cell">
              <el-image
                v-if="docPreviewUrlMap[row.id]"
                class="doc-preview-image"
                :src="docPreviewUrlMap[row.id]"
                :preview-src-list="[docPreviewUrlMap[row.id]]"
                fit="cover"
                lazy
              >
                <template #error>
                  <div class="doc-preview-fallback">
                    <el-icon><Document /></el-icon>
                  </div>
                </template>
              </el-image>
              <div v-else class="doc-preview-fallback">
                <el-icon><Document /></el-icon>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="名称" prop="name" min-width="220" show-overflow-tooltip />
        <el-table-column label="进度" min-width="180">
          <template #default="{ row }">
            <el-tag :type="getDocumentParseStatusTheme(row)" effect="light">
              {{ getDocumentParseStatusLabel(row) }}
              <template v-if="isDocumentParsing(row)">
                {{ getDocumentParsePercent(row) }}%
              </template>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="字符数" prop="contentLength" width="100" />
        <el-table-column label="Token" prop="tokens" width="100" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click="parseDoc(row)">
              {{ isDocumentParsing(row) ? '重新解析' : '开始解析' }}
            </el-button>
            <el-button link type="primary" @click="openChunkDrawer(row)"> 切片 </el-button>
            <el-button link @click="downloadDoc(row)">下载</el-button>
            <el-popconfirm title="确定删除该文档吗？" @confirm="deleteDoc(row)">
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
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
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Upload } from '@element-plus/icons-vue'

import {
  deleteDocuments,
  downloadDocument,
  downloadDocumentView,
  listDocuments,
  parseDocuments,
  stopParsingDocuments,
  uploadDocument
} from '@/api/rag-aichat/document'
import {
  getDocumentParsePercent,
  getDocumentParseStatusLabel,
  getDocumentParseStatusTheme,
  isDocumentParsing
} from '../../utils/documentParse'
import DocChunkList from './DocChunkList.vue'

defineOptions({ name: 'RagAiKnowledgeBaseDocManagePanel' })

const props = defineProps({
  datasetId: { type: [String, Number], required: true }
})

const docSearchName = ref('')
const docLoading = ref(false)
const docList = ref<any[]>([])
const docPagination = reactive({ pageNo: 1, pageSize: 10, total: 0 })
const selectedDocIds = ref<string[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadFileList = ref<any[]>([])
const chunkDrawerVisible = ref(false)
const activeChunkDocument = ref({ id: '', name: '' })
const docPreviewUrlMap = reactive<Record<string, string>>({})

const normalizeList = (res: any) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.docs)) return res.docs
  if (Array.isArray(res?.data?.docs)) return res.data.docs
  if (Array.isArray(res?.data?.list)) return res.data.list
  if (Array.isArray(res?.data)) return res.data
  return []
}

const isImageLikeDoc = (row: any) => {
  const fileName = String(row?.name || '').toLowerCase()
  return row?.type === 'visual' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)
}

const clearDocPreviewUrls = () => {
  Object.values(docPreviewUrlMap).forEach((url) => {
    if (url) URL.revokeObjectURL(url)
  })
  Object.keys(docPreviewUrlMap).forEach((key) => {
    delete docPreviewUrlMap[key]
  })
}

const syncDocPreviews = async (docs: any[]) => {
  clearDocPreviewUrls()
  const previewDocs = (Array.isArray(docs) ? docs : []).filter((row) => isImageLikeDoc(row))
  await Promise.allSettled(
    previewDocs.map(async (row) => {
      try {
        const blob = await downloadDocumentView(
          String(props.datasetId),
          String(row.id),
          String(row.name || row.thumbnail || row.location || '')
        )
        docPreviewUrlMap[String(row.id)] = URL.createObjectURL(blob as Blob)
      } catch (error) {
        console.error('获取文档预览失败:', row?.id, error)
      }
    })
  )
}

const fetchDocs = async () => {
  if (!props.datasetId) return
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
    await syncDocPreviews(docs)
  } catch (error) {
    console.error(error)
    ElMessage.error('获取文档失败')
  } finally {
    docLoading.value = false
  }
}

const handleDocSelectionChange = (rows: any[]) => {
  selectedDocIds.value = rows.map((row) => String(row.id))
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length || !props.datasetId) return
  uploadFileList.value = files.map((file) => ({
    name: file.name,
    size: file.size,
    uid: `${file.name}_${file.size}_${Date.now()}`,
    status: 'waiting'
  }))
  for (const file of files) {
    try {
      await uploadDocument(String(props.datasetId), file)
    } catch (error) {
      console.error(error)
    }
  }
  ElMessage.success('上传完成')
  input.value = ''
  await fetchDocs()
}

const parseDoc = async (row: any) => {
  await parseDocuments(String(props.datasetId), String(row.id))
  ElMessage.success('已开始解析')
  await fetchDocs()
}

const handleBatchParse = async () => {
  if (!selectedDocIds.value.length) return
  await parseDocuments(String(props.datasetId), selectedDocIds.value.join(','))
  ElMessage.success('已提交批量解析')
  await fetchDocs()
}

const handleBatchStopParse = async () => {
  if (!selectedDocIds.value.length) return
  await stopParsingDocuments(String(props.datasetId), selectedDocIds.value.join(','))
  ElMessage.success('已提交停止解析')
  await fetchDocs()
}

const deleteDoc = async (row: any) => {
  await deleteDocuments(String(props.datasetId), String(row.id))
  ElMessage.success('删除成功')
  await fetchDocs()
}

const handleBatchDeleteDocs = async () => {
  if (!selectedDocIds.value.length) return
  await deleteDocuments(String(props.datasetId), selectedDocIds.value.join(','))
  selectedDocIds.value = []
  ElMessage.success('删除成功')
  await fetchDocs()
}

const downloadDoc = async (row: any) => {
  const blob = await downloadDocument(String(props.datasetId), String(row.id))
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.download = row.name || 'document'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const openChunkDrawer = (row: any) => {
  activeChunkDocument.value = {
    id: String(row.id || ''),
    name: String(row.name || row.document_name || '文档切片管理')
  }
  chunkDrawerVisible.value = true
}

const getUploadStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    progress: '上传中',
    parsing: '解析中',
    success: '上传成功',
    fail: '上传失败',
    'parse-fail': '解析失败',
    waiting: '等待上传'
  }
  return map[status] || status
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
  () => {
    docPagination.pageNo = 1
    docSearchName.value = ''
    selectedDocIds.value = []
    uploadFileList.value = []
    fetchDocs()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearDocPreviewUrls()
})
</script>

<style scoped>
.doc-manage-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.doc-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.doc-search {
  width: 220px;
}

.upload-files {
  padding: 14px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-lg);
}

.upload-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.doc-table-wrap {
  min-height: 0;
  flex: 1;
}

.doc-table-wrap :deep(.el-table) {
  height: 100%;
}

.doc-pagination {
  display: flex;
  justify-content: flex-end;
}

.doc-preview-cell {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
}

.doc-preview-image,
.doc-preview-fallback {
  width: 56px;
  height: 56px;
  overflow: hidden;
  background: var(--app-bg-subtle);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
}

.doc-preview-fallback {
  display: flex;
  font-size: 18px;
  color: var(--app-text-secondary);
  align-items: center;
  justify-content: center;
}
</style>
