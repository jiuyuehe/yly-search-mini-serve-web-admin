<template>
  <div class="rag-kb-page">
    <aside class="kb-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="kb-sidebar-header">
        <div>
          <div class="kb-sidebar-title">知识库</div>
          <div class="kb-sidebar-subtitle">快速切换当前可用知识库</div>
        </div>
        <el-button text circle @click="isSidebarCollapsed = !isSidebarCollapsed">
          <el-icon>
            <ArrowRight v-if="isSidebarCollapsed" />
            <ArrowLeft v-else />
          </el-icon>
        </el-button>
      </div>

      <template v-if="!isSidebarCollapsed">
        <el-input
          v-model="searchName"
          clearable
          placeholder="搜索知识库"
          class="mb-10px"
          @keyup.enter="fetchList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" class="w-full mb-10px" @click="openCreateDialog">
          <el-icon class="mr-5px"><Plus /></el-icon>
          新建知识库
        </el-button>

        <el-scrollbar class="kb-list-scroll">
          <div v-for="group in datasetGroups" :key="group.key" class="kb-group">
            <div class="kb-group-header">
              <span>{{ group.label }}</span>
              <el-tag size="small">{{ group.list.length }}</el-tag>
            </div>
            <button
              v-for="item in group.list"
              :key="item.dataset_id || item.id"
              class="kb-item"
              :class="{ active: selectedDatasetId === (item.dataset_id || item.id) }"
              @click="selectDataset(item)"
              @contextmenu.prevent.stop="openContextMenu(item)"
            >
              <div class="kb-item-main">
                <div class="kb-item-avatar">{{
                  getDatasetInitials(item.dataset_name || item.name)
                }}</div>
                <div class="kb-item-copy">
                  <div class="kb-item-name">{{ item.dataset_name || item.name }}</div>
                  <div class="kb-item-desc">{{
                    item.description || `共 ${item.document_count || 0} 个文档`
                  }}</div>
                </div>
              </div>
              <el-tag size="small" type="info">{{ item.document_count || 0 }}</el-tag>
            </button>
          </div>
        </el-scrollbar>
      </template>
    </aside>

    <section class="kb-main">
      <div class="kb-main-toolbar">
        <div class="kb-main-info">
          <div class="kb-main-title">{{
            selectedDataset?.dataset_name || selectedDataset?.name || '请选择知识库开始管理'
          }}</div>
          <div class="kb-main-subtitle">
            {{ selectedDataset?.description || '可在此管理文档、模型、成员与问答' }}
          </div>
        </div>
        <div class="kb-main-actions">
          <el-button :disabled="!selectedDataset" @click="openEditDialog">
            <el-icon class="mr-5px"><Edit /></el-icon>
            编辑
          </el-button>
          <el-button :disabled="!selectedDataset" type="danger" plain @click="handleDeleteDataset">
            <el-icon class="mr-5px"><Delete /></el-icon>
            删除
          </el-button>
        </div>
      </div>

      <div v-if="selectedDataset" class="kb-main-content">
        <el-tabs v-model="activeTab" class="kb-tabs">
          <el-tab-pane label="知识问答" name="qa">
            <div class="tab-panel">
              <ChatPage
                :fixed-dataset-id="selectedDatasetId"
                :fixed-knowledge-base-label="selectedDataset?.dataset_name || ''"
                :show-knowledge-base-selector="false"
                :hide-session-list="true"
                :allow-session-sidebar-toggle="false"
                :use-route-dataset-id="false"
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="文档管理" name="doc">
            <div class="tab-panel">
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
                <el-button :disabled="!selectedDocIds.length" @click="handleBatchParse"
                  >批量解析</el-button
                >
                <el-button :disabled="!selectedDocIds.length" @click="handleBatchStopParse"
                  >批量停止解析</el-button
                >
                <el-popconfirm
                  title="确定要批量删除选中的文档吗？"
                  @confirm="handleBatchDeleteDocs"
                >
                  <template #reference>
                    <el-button type="danger" plain :disabled="!selectedDocIds.length"
                      >批量删除</el-button
                    >
                  </template>
                </el-popconfirm>
              </div>

              <div v-if="uploadFileList.length" class="upload-files">
                <div
                  v-for="file in uploadFileList"
                  :key="`${file.name}_${file.uid}`"
                  class="upload-file-item"
                >
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

              <el-table
                v-loading="docLoading"
                :data="docList"
                row-key="id"
                stripe
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
                        {{ getDocumentParsePercent(row) }}%</template
                      >
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

              <div class="mt-12px flex justify-end">
                <Pagination
                  :total="docPagination.total"
                  v-model:page="docPagination.pageNo"
                  v-model:limit="docPagination.pageSize"
                  @pagination="fetchDocs"
                />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="模型设置" name="model">
            <div class="tab-panel">
              <ModelSettingPanel
                v-if="selectedDatasetId"
                :dataset-id="selectedDatasetId"
                @saved="handleModelSaved"
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="成员管理" name="member">
            <div class="tab-panel">
              <MemberManagerPanel v-if="selectedDatasetId" :dataset-id="selectedDatasetId" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <el-empty v-else description="请选择左侧知识库开始管理文档与问答" />
    </section>

    <DocChunkList
      v-model:visible="chunkDrawerVisible"
      :dataset-id="selectedDatasetId"
      :document-id="activeChunkDocument.id"
      :document-name="activeChunkDocument.name"
    />

    <el-dialog v-model="datasetDialogVisible" :title="datasetDialogTitle" width="540px">
      <el-form :model="datasetForm" label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="datasetForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="datasetForm.description"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="datasetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="datasetSaving" @click="saveDatasetInfo">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Delete,
  Document,
  Edit,
  Plus,
  Search,
  Upload
} from '@element-plus/icons-vue'

import ChatPage from '../chat/ChatPage.vue'
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  getKnowledgeBaseListByMe,
  getKnowledgeBaseListInvite,
  updateKnowledgeBase
} from '@/api/rag-aichat/knowledgeBase'
import {
  downloadDocumentView,
  deleteDocuments,
  downloadDocument,
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
} from '../utils/documentParse'
import DocChunkList from './components/DocChunkList.vue'
import ModelSettingPanel from './components/ModelSettingPanel.vue'
import MemberManagerPanel from './components/MemberManagerPanel.vue'

defineOptions({ name: 'RagAiKnowledgeBaseIndex' })

const isSidebarCollapsed = ref(false)
const searchName = ref('')
const datasetGroups = ref<{ key: string; label: string; list: any[] }[]>([])
const selectedDatasetId = ref('')
const selectedDataset = ref<any>(null)
const activeTab = ref<'qa' | 'doc' | 'model' | 'member'>('qa')
const datasetDialogVisible = ref(false)
const datasetDialogTitle = ref('新建知识库')
const datasetSaving = ref(false)
const datasetForm = ref({ name: '', description: '' })
const docSearchName = ref('')
const docLoading = ref(false)
const docList = ref<any[]>([])
const docPagination = ref({ pageNo: 1, pageSize: 10, total: 0 })
const selectedDocIds = ref<string[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadFileList = ref<any[]>([])
const chunkDrawerVisible = ref(false)
const activeChunkDocument = ref({ id: '', name: '' })
const docPreviewUrlMap = reactive<Record<string, string>>({})

const getDatasetInitials = (name = '') =>
  String(name || '')
    .trim()
    .slice(0, 2)
    .toUpperCase() || 'KB'

const normalizeGroupList = (res: any) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data?.list)) return res.data.list
  if (Array.isArray(res?.data?.items)) return res.data.items
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.data)) return res.data
  return []
}

const fetchList = async () => {
  const [myRes, inviteRes] = await Promise.allSettled([
    getKnowledgeBaseListByMe({ dataset_name: searchName.value.trim() || undefined }),
    getKnowledgeBaseListInvite({ dataset_name: searchName.value.trim() || undefined })
  ])
  const personalList = myRes.status === 'fulfilled' ? normalizeGroupList(myRes.value) : []
  const campusList = inviteRes.status === 'fulfilled' ? normalizeGroupList(inviteRes.value) : []
  datasetGroups.value = [
    { key: 'personal', label: '我的知识库', list: personalList },
    { key: 'invite', label: '邀请我的知识库', list: campusList }
  ]
  if (!selectedDatasetId.value) {
    const first = personalList[0] || campusList[0]
    if (first) {
      selectDataset(first)
    }
  }
}

const selectDataset = async (item: any) => {
  selectedDatasetId.value = String(item.dataset_id || item.id)
  selectedDataset.value = item
  datasetForm.value = {
    name: item.dataset_name || item.name || '',
    description: item.description || ''
  }
  await fetchDocs()
}

const openContextMenu = (item: any) => {
  selectDataset(item)
}

const openCreateDialog = () => {
  datasetDialogTitle.value = '新建知识库'
  datasetForm.value = { name: '', description: '' }
  datasetDialogVisible.value = true
}

const openEditDialog = () => {
  datasetDialogTitle.value = '编辑知识库'
  if (selectedDataset.value) {
    datasetForm.value = {
      name: selectedDataset.value.dataset_name || selectedDataset.value.name || '',
      description: selectedDataset.value.description || ''
    }
  }
  datasetDialogVisible.value = true
}

const saveDatasetInfo = async () => {
  if (datasetSaving.value) return
  const name = String(datasetForm.value.name || '').trim()
  if (!name) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  datasetSaving.value = true
  try {
    if (!selectedDatasetId.value || datasetDialogTitle.value === '新建知识库') {
      await createKnowledgeBase(datasetForm.value)
      ElMessage.success('创建成功')
    } else {
      await updateKnowledgeBase(selectedDatasetId.value, datasetForm.value)
      ElMessage.success('保存成功')
    }
    datasetDialogVisible.value = false
    await fetchList()
  } catch (error) {
    console.error(error)
    ElMessage.error('保存失败')
  } finally {
    datasetSaving.value = false
  }
}

const handleDeleteDataset = async () => {
  if (!selectedDatasetId.value) return
  try {
    await ElMessageBox.confirm('确定删除该知识库吗？', '删除知识库', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteKnowledgeBase(selectedDatasetId.value)
    ElMessage.success('删除成功')
    selectedDatasetId.value = ''
    selectedDataset.value = null
    await fetchList()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const fetchDocs = async () => {
  if (!selectedDatasetId.value) return
  docLoading.value = true
  try {
    const res = await listDocuments({
      dataset_id: selectedDatasetId.value,
      page: docPagination.value.pageNo,
      page_size: docPagination.value.pageSize,
      name: docSearchName.value.trim() || undefined
    })
    docList.value = res.docs || []
    docPagination.value.total = res.total || 0
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
  if (!files.length || !selectedDatasetId.value) return
  uploadFileList.value = files.map((file) => ({
    name: file.name,
    size: file.size,
    uid: `${file.name}_${file.size}_${Date.now()}`,
    status: 'waiting'
  }))
  for (const file of files) {
    try {
      await uploadDocument(selectedDatasetId.value, file)
    } catch (error) {
      console.error(error)
    }
  }
  ElMessage.success('上传完成')
  input.value = ''
  await fetchDocs()
}

const parseDoc = async (row: any) => {
  if (!selectedDatasetId.value) return
  await parseDocuments(selectedDatasetId.value, String(row.id))
  ElMessage.success('已开始解析')
  await fetchDocs()
}

const handleBatchParse = async () => {
  if (!selectedDocIds.value.length) return
  await parseDocuments(selectedDatasetId.value, selectedDocIds.value.join(','))
  ElMessage.success('已提交批量解析')
  await fetchDocs()
}

const handleBatchStopParse = async () => {
  if (!selectedDocIds.value.length) return
  await stopParsingDocuments(selectedDatasetId.value, selectedDocIds.value.join(','))
  ElMessage.success('已提交停止解析')
  await fetchDocs()
}

const deleteDoc = async (row: any) => {
  await deleteDocuments(selectedDatasetId.value, String(row.id))
  ElMessage.success('删除成功')
  await fetchDocs()
}

const handleBatchDeleteDocs = async () => {
  if (!selectedDocIds.value.length) return
  await deleteDocuments(selectedDatasetId.value, selectedDocIds.value.join(','))
  selectedDocIds.value = []
  ElMessage.success('删除成功')
  await fetchDocs()
}

const downloadDoc = async (row: any) => {
  const blob = await downloadDocument(selectedDatasetId.value, String(row.id))
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

const handleModelSaved = (payload: Record<string, any>) => {
  if (!selectedDataset.value) return
  selectedDataset.value = {
    ...selectedDataset.value,
    name: payload.name,
    dataset_name: payload.name,
    description: payload.description,
    avatar: payload.avatar,
    embedding_model: payload.embedding_model,
    permission: payload.permission,
    pagerank: payload.pagerank,
    chunk_method: payload.chunk_method,
    parser_config: payload.parser_config
  }
  datasetForm.value = {
    name: payload.name || '',
    description: payload.description || ''
  }
}

const isImageLikeDoc = (row: any) => {
  const fileName = String(row?.name || '').toLowerCase()
  return row?.type === 'visual' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)
}

const clearDocPreviewUrls = () => {
  Object.values(docPreviewUrlMap).forEach((url) => {
    if (url) {
      URL.revokeObjectURL(url)
    }
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
          String(selectedDatasetId.value),
          String(row.id),
          String(row.name || row.thumbnail || row.location || '')
        )
        const url = URL.createObjectURL(blob as Blob)
        docPreviewUrlMap[String(row.id)] = url
      } catch (error) {
        console.error('获取文档预览失败:', row?.id, error)
      }
    })
  )
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

onMounted(async () => {
  await fetchList()
})

onBeforeUnmount(() => {
  clearDocPreviewUrls()
})
</script>

<style scoped>
.rag-kb-page {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--app-bg-page);
}

.kb-sidebar {
  width: 300px;
  min-width: 300px;
  padding: 12px;
  border-right: 1px solid var(--app-border-color);
  background: var(--app-bg-subtle);
}

.kb-sidebar.collapsed {
  width: 72px;
  min-width: 72px;
}

.kb-sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.kb-sidebar-title {
  font-size: 16px;
  font-weight: 600;
}

.kb-sidebar-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.kb-list-scroll {
  height: calc(100% - 100px);
}

.kb-group + .kb-group {
  margin-top: 14px;
}

.kb-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
}

.kb-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--app-radius-md);
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.kb-item + .kb-item {
  margin-top: 8px;
}

.kb-item.active {
  border-color: rgba(0, 82, 217, 0.2);
  background: rgba(0, 82, 217, 0.06);
}

.kb-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.kb-item-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(0, 82, 217, 0.1);
  color: var(--td-brand-color);
  font-weight: 600;
}

.kb-item-copy {
  min-width: 0;
}

.kb-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-item-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.kb-main-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--app-border-color);
  background: #fff;
}

.kb-main-title {
  font-size: 18px;
  font-weight: 600;
}

.kb-main-subtitle {
  margin-top: 4px;
  color: var(--app-text-secondary);
}

.kb-main-actions {
  display: flex;
  gap: 10px;
}

.kb-main-content {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
  overflow: hidden;
}

.kb-tabs {
  height: 100%;
}

.tab-panel {
  height: calc(100vh - 220px);
  min-height: 520px;
  overflow: hidden;
}

.doc-preview-cell {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-preview-image,
.doc-preview-fallback {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  border: 1px solid var(--app-border-color);
  overflow: hidden;
  background: var(--app-bg-subtle);
}

.doc-preview-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-secondary);
  font-size: 18px;
}

.doc-toolbar,
.member-toolbar,
.member-dialog-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.doc-search,
.member-search {
  width: 220px;
}

.upload-files {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-md);
  background: var(--app-bg-subtle);
}

.upload-file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}
</style>
