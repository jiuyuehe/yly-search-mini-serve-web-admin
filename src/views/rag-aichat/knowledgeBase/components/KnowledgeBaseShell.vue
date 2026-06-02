<template>
  <div class="rag-kb-shell">
    <KnowledgeBaseSidebar
      :collapsed="isSidebarCollapsed"
      :dataset-groups="datasetGroups"
      :selected-dataset-id="selectedDatasetId"
      @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      @create="openCreateDialog"
      @select="selectDataset"
      @manage="handleManageDataset"
      @delete="handleDeleteDataset"
    />

    <section class="rag-kb-main">
      <KnowledgeBaseDocumentPage
        v-if="activeView === 'documents'"
        :dataset-id="selectedDatasetId"
        :dataset="selectedDataset"
      />

      <KnowledgeBaseWorkspace
        v-else
        :dataset-id="selectedDatasetId"
        :dataset="selectedDataset"
        @edit="openEditDialog"
        @delete="handleDeleteDataset"
        @switch-docs="activeView = 'documents'"
        @saved="handleWorkspaceSaved"
      />
    </section>

    <KnowledgeBaseFormDialog ref="datasetDialogRef" @success="fetchList" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import KnowledgeBaseSidebar from './KnowledgeBaseSidebar.vue'
import KnowledgeBaseWorkspace from './KnowledgeBaseWorkspace.vue'
import KnowledgeBaseDocumentPage from './KnowledgeBaseDocumentPage.vue'
import KnowledgeBaseFormDialog from './KnowledgeBaseFormDialog.vue'
import {
  deleteKnowledgeBase,
  getKnowledgeBaseListByMe,
  getKnowledgeBaseListInvite
} from '@/api/rag-aichat/knowledgeBase'

defineOptions({ name: 'RagAiKnowledgeBaseShell' })

const isSidebarCollapsed = ref(false)
const datasetGroups = ref<{ key: string; label: string; list: any[] }[]>([])
const selectedDatasetId = ref('')
const selectedDataset = ref<any>(null)
const activeView = ref<'documents' | 'workspace'>('documents')
const datasetDialogRef = ref<{
  open: (mode: 'create' | 'update', dataset?: Record<string, any> | null) => void
} | null>(null)

const normalizeGroupList = (res: any) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data?.list)) return res.data.list
  if (Array.isArray(res?.data?.items)) return res.data.items
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.data)) return res.data
  return []
}

const getAllDatasets = () => datasetGroups.value.flatMap((group) => group.list || [])

const syncSelectedDataset = () => {
  const allDatasets = getAllDatasets()
  if (!selectedDatasetId.value) {
    const first = allDatasets[0]
    if (first) {
      selectDataset(first)
    }
    return
  }

  const matched = allDatasets.find((item) => {
    return String(item.dataset_id || item.id) === selectedDatasetId.value
  })
  if (matched) {
    selectedDataset.value = matched
    return
  }

  const first = allDatasets[0]
  if (first) {
    selectDataset(first)
    return
  }

  selectedDatasetId.value = ''
  selectedDataset.value = null
}

const fetchList = async () => {
  const [myRes, inviteRes] = await Promise.allSettled([
    getKnowledgeBaseListByMe(),
    getKnowledgeBaseListInvite()
  ])
  const personalList =
    myRes.status === 'fulfilled'
      ? normalizeGroupList(myRes.value).map((item) => ({ ...item, __datasetGroupKey: 'personal' }))
      : []
  const campusList =
    inviteRes.status === 'fulfilled'
      ? normalizeGroupList(inviteRes.value).map((item) => ({ ...item, __datasetGroupKey: 'invite' }))
      : []
  datasetGroups.value = [
    { key: 'personal', label: '我的知识库', list: personalList },
    { key: 'invite', label: '邀请我的知识库', list: campusList }
  ]
  syncSelectedDataset()
}

const selectDataset = async (item: any) => {
  selectedDatasetId.value = String(item.dataset_id || item.id)
  selectedDataset.value = item
}

const handleManageDataset = (item?: any) => {
  if (item) {
    selectDataset(item)
  }
  activeView.value = 'workspace'
}

const openCreateDialog = () => {
  datasetDialogRef.value?.open('create')
}

const openEditDialog = () => {
  datasetDialogRef.value?.open('update', selectedDataset.value)
}

const handleDeleteDataset = async (item?: any) => {
  const datasetId = String(item?.dataset_id || item?.id || selectedDatasetId.value || '')
  if (!datasetId) return
  try {
    await ElMessageBox.confirm('确定删除该知识库吗？', '删除知识库', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteKnowledgeBase(datasetId)
    ElMessage.success('删除成功')
    if (String(selectedDatasetId.value) === datasetId) {
      selectedDatasetId.value = ''
      selectedDataset.value = null
    }
    await fetchList()
  } catch (error) {
    console.error(error)
    ElMessage.error('删除失败')
  }
}

const handleWorkspaceSaved = async (payload: Record<string, any>) => {
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
  await fetchList()
}

onMounted(async () => {
  await fetchList()
})
</script>

<style scoped>
.rag-kb-shell {
  display: flex;
  width: calc(100% + var(--app-content-padding) * 2);
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height));
  min-height: 0;
  margin: calc(var(--app-content-padding) * -1);
  overflow: hidden;
  background: var(--app-bg-page);
}

.rag-kb-main {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
}
</style>
