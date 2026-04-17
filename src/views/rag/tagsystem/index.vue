<template>
  <div class="tag-system-page">
    <ContentWrap>
      <div class="overview-grid">
        <div class="overview-card">
          <div class="overview-label">三级标签总数</div>
          <div class="overview-value">{{ treeData.totalAiTagCount || 0 }}</div>
        </div>
        <div class="overview-card">
          <div class="overview-label">未归类三级标签</div>
          <div class="overview-value warn">{{ treeData.unclassifiedCount || 0 }}</div>
        </div>
        <div class="overview-card">
          <div class="overview-label">一级标签</div>
          <div class="overview-value">{{ treeData.themes?.length || 0 }}</div>
        </div>
        <div class="overview-card">
          <div class="overview-label">二级标签</div>
          <div class="overview-value">{{ totalManualTagCount }}</div>
        </div>
      </div>
    </ContentWrap>

    <div class="main-grid">
      <ContentWrap class="left-panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">标签体系导航与维护</div>
            <div class="panel-subtitle"></div>
          </div>
          <el-button type="primary" @click="openThemeDialog('create')">新增一级标签</el-button>
        </div>

        <div class="tree-toolbar">
          <el-input
            v-model="treeKeyword"
            placeholder="筛选 1 / 2 / 3 级标签"
            clearable
            @input="handleTreeFilter"
          >
            <template #prefix>
              <Icon icon="ep:search" />
            </template>
          </el-input>
          <div class="tree-toolbar-links">
            <el-button text @click="expandAllNodes">展开全部</el-button>
            <el-button text @click="collapseAllNodes">收起全部</el-button>
          </div>
        </div>

        <div class="tree-summary">

        </div>

        <div class="tree-wrap">
          <el-tree
            ref="treeRef"
            :data="treeNavData"
            node-key="key"
            :props="{ label: 'label', children: 'children' }"
            :default-expanded-keys="expandedKeys"
            :filter-node-method="filterTreeNode"
            highlight-current
            :default-expand-all="false"
            :expand-on-click-node="false"
            @node-click="handleTreeNodeClick"
          >
            <template #default="{ data }">
              <div class="tree-node" :class="`tree-node-${data.type}`">
                <div class="tree-node-main">
                  <div class="tree-node-title-row">
                    <span class="tree-node-title">{{ data.label }}</span>
                    <el-tag v-if="data.type === 'theme' && data.status !== undefined" size="small" :type="data.status === 1 ? 'success' : 'info'">
                      {{ data.status === 1 ? '启用' : '禁用' }}
                    </el-tag>
                    <el-tag v-if="data.type === 'aiTag' && data.unclassified" size="small" type="warning">
                      未归类
                    </el-tag>
                  </div>
                  <div class="tree-node-meta">
                    <span v-if="data.type === 'theme'">二级 {{ data.children?.length || 0 }}</span>
                    <span v-if="data.type === 'theme'">三级 {{ data.aiTagCount || 0 }}</span>
                    <span v-if="data.type === 'themeTag'">三级 {{ data.aiTagCount || 0 }}</span>
                    <span v-if="data.type === 'themeTag'">文档 {{ data.fileCount || 0 }}</span>
                    <span v-if="data.type === 'aiTag'">文档 {{ data.fileCount || 0 }}</span>
                    <span v-if="data.type === 'aiTag'">权重 {{ formatWeight(data.totalWeight) }}</span>
                    <span v-if="data.type === 'theme' && data.description" class="tree-node-desc">{{ data.description }}</span>
                  </div>
                </div>
                <div class="tree-node-actions">
                  <template v-if="data.type === 'theme'">
                    <el-button link type="primary" @click.stop="handleThemeFilter(data.raw)">查看</el-button>
                    <el-button link type="primary" @click.stop="openThemeDialog('update', data.raw)">编辑</el-button>
                    <el-button link type="success" @click.stop="openTagDialog('create', data.raw)">新增二级</el-button>
                    <el-button link type="danger" @click.stop="handleDeleteTheme(data.raw)">删除</el-button>
                  </template>
                  <template v-else-if="data.type === 'themeTag'">
                    <el-button link type="primary" @click.stop="handleTagFilter(data.themeRaw, data.raw)">查看</el-button>
                    <el-button link type="primary" @click.stop="openTagDialog('update', data.themeRaw, data.raw)">编辑</el-button>
                    <el-button link type="danger" @click.stop="handleDeleteTag(data.raw)">删除</el-button>
                  </template>
                  <template v-else-if="data.type === 'aiTag'">
                    <el-button link type="primary" @click.stop="openFilesDrawer(data.raw)">查看文档</el-button>
                  </template>
                </div>
              </div>
            </template>
          </el-tree>
        </div>
      </ContentWrap>

      <ContentWrap class="right-panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">三级标签与关联文档</div>
            <div class="panel-subtitle"></div>
          </div>
        </div>

        <el-form :inline="true" :model="queryParams" class="-mb-15px">
          <el-form-item label="三级标签">
            <el-input v-model="queryParams.tagName" placeholder="请输入三级标签名称" clearable class="!w-220px" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="一级标签">
            <el-select v-model="queryParams.themeId" clearable placeholder="全部" class="!w-180px">
              <el-option v-for="theme in treeData.themes || []" :key="theme.id" :label="theme.name" :value="theme.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="未归类">
            <el-select v-model="queryParams.unclassified" clearable placeholder="全部" class="!w-160px">
              <el-option :value="true" label="仅未归类" />
              <el-option :value="false" label="仅已归类" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
            <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
          </el-form-item>
        </el-form>

        <div class="quick-filters">
          <el-button text @click="showUnclassified">查看未归类三级标签</el-button>
          <el-button text @click="clearThemeFilter">查看全部三级标签</el-button>
        </div>

        <el-table v-loading="loading" :data="level3List" stripe :show-overflow-tooltip="true">
          <el-table-column label="三级标签" prop="tagName" min-width="160" />
          <el-table-column label="一级标签" prop="themeName" min-width="120">
            <template #default="scope">
              {{ scope.row.themeName || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="二级标签" prop="themeTagName" min-width="140">
            <template #default="scope">
              <el-tag v-if="scope.row.themeTagName" size="small">{{ scope.row.themeTagName }}</el-tag>
              <el-tag v-else type="warning" size="small">未归类</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="文档数" prop="fileCount" width="100" />
          <el-table-column label="累计权重" prop="totalWeight" width="120">
            <template #default="scope">
              {{ formatWeight(scope.row.totalWeight) }}
            </template>
          </el-table-column>
          <el-table-column label="来源" prop="source" width="100" />
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button link type="primary" @click="openFilesDrawer(scope.row)">查看文档</el-button>
            </template>
          </el-table-column>
        </el-table>

        <Pagination
          :total="level3Total"
          v-model:page="queryParams.pageNo"
          v-model:limit="queryParams.pageSize"
          @pagination="getLevel3List"
        />
      </ContentWrap>
    </div>

    <Dialog :title="themeDialogTitle" v-model="themeDialogVisible" width="520px">
      <el-form ref="themeFormRef" :model="themeForm" :rules="themeRules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="themeForm.name" placeholder="请输入一级标签名称" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="themeForm.code" placeholder="请输入唯一编码" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="themeForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="themeForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="themeForm.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="themeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitTheme">保存</el-button>
      </template>
    </Dialog>

    <Dialog :title="tagDialogTitle" v-model="tagDialogVisible" width="520px">
      <el-form ref="tagFormRef" :model="tagForm" :rules="tagRules" label-width="90px">
        <el-form-item label="所属一级">
          <el-input :model-value="currentTheme?.name || '-'" disabled />
        </el-form-item>
        <el-form-item label="名称" prop="keyword">
          <el-input v-model="tagForm.keyword" placeholder="请输入二级标签名称" />
        </el-form-item>
        <el-form-item label="同义词" prop="synonyms">
          <el-input v-model="tagForm.synonyms" placeholder="多个同义词用逗号分隔" />
        </el-form-item>
        <el-form-item label="权重" prop="weight">
          <el-input-number v-model="tagForm.weight" :min="0" :step="0.1" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitTag">保存</el-button>
      </template>
    </Dialog>

    <el-drawer v-model="filesDrawerVisible" title="关联文档" size="55%">
      <template v-if="selectedTag">
        <div class="drawer-summary">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="三级标签">{{ selectedTag.tagName }}</el-descriptions-item>
            <el-descriptions-item label="一级标签">{{ selectedTag.themeName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="二级标签">
              {{ selectedTag.themeTagName || '未归类' }}
            </el-descriptions-item>
            <el-descriptions-item label="累计权重">{{ formatWeight(selectedTag.totalWeight) }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <el-table v-loading="filesLoading" :data="relatedFiles" stripe>
          <el-table-column label="文件名" prop="fileName" min-width="220" />
          <el-table-column label="分类" prop="fileCategory" width="120" />
          <el-table-column label="路径" prop="filePath" min-width="240" />
          <el-table-column label="AI标签" prop="fileAiTag" min-width="200" />
        </el-table>
        <Pagination
          :total="filesTotal"
          v-model:page="filesQuery.page"
          v-model:limit="filesQuery.pageSize"
          @pagination="getRelatedFiles"
        />
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { useMessage } from '@/hooks/web/useMessage'
import { TagSystemApi, ThemeAiTagVO, ThemeTagTreeVO, ThemeTagVO, ThemeVO } from '@/api/rag/tagsystem'

defineOptions({ name: 'RagTagSystem' })

const message = useMessage()
const loading = ref(false)
const submitLoading = ref(false)
const filesLoading = ref(false)
const treeData = ref<ThemeTagTreeVO>({ themes: [], unclassifiedTags: [], totalAiTagCount: 0, unclassifiedCount: 0 })
const level3List = ref<ThemeAiTagVO[]>([])
const level3Total = ref(0)
const relatedFiles = ref<any[]>([])
const filesTotal = ref(0)
const selectedTag = ref<ThemeAiTagVO>()
const currentTheme = ref<ThemeVO>()
const treeRef = ref()
const treeKeyword = ref('')
const expandedKeys = ref<string[]>([])

const queryParams = reactive({
  tagName: undefined as string | undefined,
  themeId: undefined as number | undefined,
  themeTagId: undefined as number | undefined,
  unclassified: undefined as boolean | undefined,
  pageNo: 1,
  pageSize: 10
})

const filesQuery = reactive({
  page: 1,
  pageSize: 10
})

const totalManualTagCount = computed(() =>
  (treeData.value.themes || []).reduce((sum, theme) => sum + (theme.tags?.length || 0), 0)
)

const treeNavData = computed(() =>
  (treeData.value.themes || []).map((theme) => ({
    key: `theme-${theme.id}`,
    type: 'theme',
    label: theme.name,
    description: theme.description,
    status: theme.status,
    aiTagCount: theme.aiTagCount || 0,
    raw: theme,
    children: (theme.tags || []).map((tag) => ({
      key: `theme-tag-${tag.id}`,
      type: 'themeTag',
      label: tag.keyword,
      aiTagCount: tag.aiTagCount || 0,
      fileCount: tag.fileCount || 0,
      raw: tag,
      themeRaw: theme,
      children: (tag.aiTags || []).map((aiTag) => ({
        key: `ai-tag-${theme.id}-${tag.id}-${aiTag.tagName}`,
        type: 'aiTag',
        label: aiTag.tagName,
        fileCount: aiTag.fileCount || 0,
        totalWeight: aiTag.totalWeight || 0,
        unclassified: aiTag.unclassified,
        raw: aiTag
      }))
    }))
  }))
)

const themeDialogVisible = ref(false)
const themeDialogTitle = ref('')
const themeFormRef = ref()
const themeForm = reactive<ThemeVO>({
  id: undefined,
  name: undefined,
  code: undefined,
  description: undefined,
  status: 1,
  sort: 0
})
const themeRules = {
  name: [{ required: true, message: '请输入一级标签名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入唯一编码', trigger: 'blur' }]
}

const tagDialogVisible = ref(false)
const tagDialogTitle = ref('')
const tagFormRef = ref()
const tagForm = reactive<ThemeTagVO>({
  id: undefined,
  themeId: undefined,
  keyword: undefined,
  synonyms: undefined,
  weight: 1
})
const tagRules = {
  keyword: [{ required: true, message: '请输入二级标签名称', trigger: 'blur' }]
}

const filesDrawerVisible = ref(false)

const getTree = async () => {
  treeData.value = await TagSystemApi.getTagSystemTree()
}

const getLevel3List = async () => {
  loading.value = true
  try {
    const data = await TagSystemApi.getLevel3TagPage(queryParams)
    level3List.value = data.list || []
    level3Total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

const refreshAll = async () => {
  await Promise.all([getTree(), getLevel3List()])
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getLevel3List()
}

const resetQuery = () => {
  queryParams.tagName = undefined
  queryParams.themeId = undefined
  queryParams.themeTagId = undefined
  queryParams.unclassified = undefined
  queryParams.pageNo = 1
  getLevel3List()
}

const filterTreeNode = (value: string, data: any) => {
  if (!value) return true
  const keyword = value.toLowerCase()
  return [data.label, data.description]
    .filter(Boolean)
    .some((item: string) => item.toLowerCase().includes(keyword))
}

const handleTreeFilter = () => {
  treeRef.value?.filter(treeKeyword.value)
}

watch(treeKeyword, () => {
  handleTreeFilter()
})

const expandAllNodes = () => {
  const keys: string[] = []
  treeNavData.value.forEach((theme: any) => {
    keys.push(theme.key)
    ;(theme.children || []).forEach((tag: any) => {
      keys.push(tag.key)
    })
  })
  expandedKeys.value = keys
  setExpandedState(true)
}

const collapseAllNodes = () => {
  expandedKeys.value = []
  setExpandedState(false)
}

const setExpandedState = (expanded: boolean) => {
  const nodesMap = treeRef.value?.store?.nodesMap || {}
  Object.keys(nodesMap).forEach((key) => {
    const node = nodesMap[key]
    if (node?.childNodes?.length) {
      node.expanded = expanded
    }
  })
}

const handleTreeNodeClick = (data: any) => {
  if (data.type === 'theme') {
    handleThemeFilter(data.raw)
    return
  }
  if (data.type === 'themeTag') {
    handleTagFilter(data.themeRaw, data.raw)
    return
  }
  if (data.type === 'aiTag') {
    openFilesDrawer(data.raw)
  }
}

const handleThemeFilter = (theme: ThemeVO) => {
  queryParams.themeId = theme.id
  queryParams.themeTagId = undefined
  queryParams.unclassified = false
  handleQuery()
}

const handleTagFilter = (theme: ThemeVO, tag: ThemeTagVO) => {
  queryParams.themeId = theme.id
  queryParams.themeTagId = tag.id
  queryParams.unclassified = false
  handleQuery()
}

const clearThemeFilter = () => {
  queryParams.themeId = undefined
  queryParams.themeTagId = undefined
  queryParams.unclassified = undefined
  handleQuery()
}

const showUnclassified = () => {
  queryParams.themeId = undefined
  queryParams.themeTagId = undefined
  queryParams.unclassified = true
  handleQuery()
}

const openThemeDialog = (type: 'create' | 'update', theme?: ThemeVO) => {
  themeDialogTitle.value = type === 'create' ? '新增一级标签' : '编辑一级标签'
  themeForm.id = theme?.id
  themeForm.name = theme?.name
  themeForm.code = theme?.code
  themeForm.description = theme?.description
  themeForm.status = theme?.status ?? 1
  themeForm.sort = theme?.sort ?? 0
  themeDialogVisible.value = true
}

const submitTheme = async () => {
  const valid = await themeFormRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (themeForm.id) {
      await TagSystemApi.updateTheme(themeForm)
    } else {
      await TagSystemApi.createTheme(themeForm)
    }
    message.success('保存成功')
    themeDialogVisible.value = false
    await refreshAll()
  } finally {
    submitLoading.value = false
  }
}

const handleDeleteTheme = async (theme: ThemeVO) => {
  await message.delConfirm(`确定删除一级标签「${theme.name}」吗？`)
  await TagSystemApi.deleteTheme(theme.id as number)
  message.success('删除成功')
  await refreshAll()
}

const openTagDialog = (type: 'create' | 'update', theme: ThemeVO, tag?: ThemeTagVO) => {
  currentTheme.value = theme
  tagDialogTitle.value = type === 'create' ? '新增二级标签' : '编辑二级标签'
  tagForm.id = tag?.id
  tagForm.themeId = theme.id
  tagForm.keyword = tag?.keyword
  tagForm.synonyms = tag?.synonyms
  tagForm.weight = tag?.weight ?? 1
  tagDialogVisible.value = true
}

const submitTag = async () => {
  const valid = await tagFormRef.value?.validate().catch(() => false)
  if (!valid) return
  submitLoading.value = true
  try {
    if (tagForm.id) {
      await TagSystemApi.updateThemeTag(tagForm)
    } else {
      await TagSystemApi.createThemeTag(tagForm)
    }
    message.success('保存成功')
    tagDialogVisible.value = false
    await refreshAll()
  } finally {
    submitLoading.value = false
  }
}

const handleDeleteTag = async (tag: ThemeTagVO) => {
  await message.delConfirm(`确定删除二级标签「${tag.keyword}」吗？`)
  await TagSystemApi.deleteThemeTag(tag.id as number)
  message.success('删除成功')
  await refreshAll()
}

const openFilesDrawer = async (row: ThemeAiTagVO) => {
  selectedTag.value = row
  filesDrawerVisible.value = true
  filesQuery.page = 1
  await getRelatedFiles()
}

const getRelatedFiles = async () => {
  if (!selectedTag.value?.tagName) return
  filesLoading.value = true
  try {
    const data = await TagSystemApi.getFilesByTags({
      tags: [selectedTag.value.tagName],
      page: filesQuery.page,
      pageSize: filesQuery.pageSize,
      matchMode: 'OR',
      weightMode: 'EXACT'
    })
    relatedFiles.value = data.list || []
    filesTotal.value = data.total || 0
  } finally {
    filesLoading.value = false
  }
}

const formatWeight = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return Number(value).toFixed(3)
}

onMounted(() => {
  refreshAll()
})
</script>

<style scoped>
.tag-system-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
  border: 1px solid #dbeafe;
}

.overview-label {
  color: #64748b;
  font-size: 13px;
}

.overview-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.overview-value.warn {
  color: #c2410c;
}

.main-grid {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 16px;
}

.left-panel,
.right-panel {
  min-height: 680px;
}

.left-panel {
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.panel-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.tree-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.tree-toolbar-links {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.tree-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 12px;
}

.tree-wrap {
  flex: 1;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  padding: 10px 8px;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 6px 0;
}

.tree-node-main {
  min-width: 0;
  flex: 1;
}

.tree-node-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tree-node-title {
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.tree-node-desc {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tree-node-theme {
  border-bottom: 1px solid rgba(226, 232, 240, 0.7);
}

.tree-node-theme .tree-node-title {
  font-size: 14px;
}

.tree-node-themeTag .tree-node-title {
  color: #1e3a8a;
}

.tree-node-aiTag .tree-node-title {
  color: #334155;
  font-weight: 500;
}

:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: auto;
  min-height: 48px;
  padding-right: 6px;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(59, 130, 246, 0.08);
  border-radius: 10px;
}

:deep(.el-tree-node__expand-icon) {
  color: #64748b;
}

.quick-filters {
  margin: 6px 0 14px;
}

.drawer-summary {
  margin-bottom: 16px;
}

@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tree-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tree-node {
    flex-direction: column;
    align-items: flex-start;
  }

  .tree-node-actions {
    flex-wrap: wrap;
  }
}
</style>
