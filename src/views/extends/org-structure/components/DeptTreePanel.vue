<template>
  <ContentWrap class="org-structure-left h-600px">
    <div class="flex items-center gap-8px mb-12px">
      <el-input
        v-model="deptKeyword"
        placeholder="搜索部门"
        clearable
        @clear="handleFilterDept"
        @input="handleFilterDept"
      >
        <template #prefix>
          <Icon icon="ep:search" />
        </template>
      </el-input>
      <el-button text type="primary" @click="handleRefreshTree">刷新</el-button>
      <el-button text type="primary" @click="toggleExpandAll">
        {{ treeExpandedAll ? '折叠' : '展开' }}
      </el-button>
    </div>

    <el-tree
      ref="deptTreeRef"
      v-loading="deptTreeLoading"
      class="org-structure-tree"
      :data="deptTree"
      node-key="id"
      highlight-current
      :props="treeProps"
      :expand-on-click-node="false"
      :filter-node-method="filterDeptNode"
      @node-click="handleDeptClick"
    >
      <template #default="{ data }">
        <div class="tree-node">
          <div class="tree-node__main">
            <Icon :icon="getDeptIcon(data)" class="tree-node__icon" />
            <span class="tree-node__label">{{ data.name }}</span>
          </div>
          <div class="tree-node__meta">
            <el-tag
              v-if="data.bizType"
              size="small"
              :type="getDeptBizTypeMeta(data.bizType).tagType"
            >
              {{ getDeptBizTypeMeta(data.bizType).label }}
            </el-tag>
            <span v-if="!data.virtualType" class="tree-node__source">
              {{ getDeptSourceLabel(data) }}
            </span>
          </div>
        </div>
      </template>
    </el-tree>
  </ContentWrap>
</template>

<script setup lang="ts">
import { Icon } from '@/components/Icon'
import { handleTree } from '@/utils/tree'
import type { ElTree } from 'element-plus'
import * as OrgStructureApi from '@/api/extends/orgStructure'
import * as EduApi from '@/api/extends/edu'
import { getDeptBizTypeMeta } from '@/views/extends/edu/components/deptBizTypeMeta'

defineOptions({ name: 'OrgStructureDeptTreePanel' })

const props = defineProps<{
  activeDeptId?: number
}>()

const emit = defineEmits(['dept-change', 'tree-change'])

const deptTree = ref<OrgStructureApi.OrgDeptVO[]>([])
const deptTreeRef = ref<InstanceType<typeof ElTree>>()
const deptTreeLoading = ref(false)
const deptKeyword = ref('')
const treeExpandedAll = ref(true)
const currentDeptId = ref<number>()
const displayFlatList = ref<OrgStructureApi.OrgDeptVO[]>([])
const treeProps = {
  label: 'name',
  children: 'children'
}
const createUnassignedNode = (): OrgStructureApi.OrgDeptVO => ({
  id: OrgStructureApi.UNASSIGNED_DEPT_ID,
  name: '未分配',
  parentId: 0,
  sort: -1,
  status: 0,
  virtualType: 'unassigned',
  children: []
})

type SourceMeta = { deptLabel: string }
const KINGDEE_SOURCE_META: SourceMeta = {
  deptLabel: '金蝶云之家'
}
const LOCAL_SOURCE_META: SourceMeta = {
  deptLabel: '本地部门'
}
const SOURCE_TYPE_META: Record<string, SourceMeta> = {
  kingdee_cloud: KINGDEE_SOURCE_META,
  kingdeecloud: KINGDEE_SOURCE_META,
  workflow_integration_kingdee_cloud: KINGDEE_SOURCE_META,
  local: LOCAL_SOURCE_META,
  '': LOCAL_SOURCE_META
}
const DEFAULT_SOURCE_META: SourceMeta = LOCAL_SOURCE_META

const normalizeSourceType = (source?: string) => (source ?? '').toLowerCase().trim()

const resolveSourceLabel = (
  sourceTypeName?: string,
  sourceType?: string,
  defaultLabel?: string
) => {
  const trimmedName = (sourceTypeName ?? '').trim()
  if (trimmedName) {
    return trimmedName
  }
  if (normalizeSourceType(sourceType)) {
    return '未配置'
  }
  return defaultLabel ?? '本地'
}

const getDeptSourceLabel = (dept: OrgStructureApi.OrgDeptVO) =>
  resolveSourceLabel(
    dept.sourceTypeName,
    dept.sourceType,
    SOURCE_TYPE_META[normalizeSourceType(dept.sourceType)]?.deptLabel || DEFAULT_SOURCE_META.deptLabel
  )

const getDeptIcon = (dept: OrgStructureApi.OrgDeptVO) => {
  if (dept.virtualType === 'unassigned') {
    return 'ep:user'
  }
  return getDeptBizTypeMeta(dept.bizType).icon
}

const BIZ_TYPE_ORDER: Record<string, number> = {
  school: 1,
  campus: 2,
  department: 3,
  grade: 4,
  class: 5
}

const compareDept = (a: OrgStructureApi.OrgDeptVO, b: OrgStructureApi.OrgDeptVO) => {
  const bizTypeOrderA = BIZ_TYPE_ORDER[a.bizType || ''] ?? 99
  const bizTypeOrderB = BIZ_TYPE_ORDER[b.bizType || ''] ?? 99
  if (bizTypeOrderA !== bizTypeOrderB) {
    return bizTypeOrderA - bizTypeOrderB
  }
  const sortA = a.sort ?? 0
  const sortB = b.sort ?? 0
  if (sortA !== sortB) {
    return sortA - sortB
  }
  return (a.id ?? 0) - (b.id ?? 0)
}

const filterDeptNode = (value: string, data: OrgStructureApi.OrgDeptVO) => {
  if (!value) return true
  return data.name.toLowerCase().includes(value.toLowerCase())
}

const handleFilterDept = () => {
  deptTreeRef.value?.filter(deptKeyword.value)
}

const applyExpandState = (expand: boolean) => {
  const tree = deptTreeRef.value as any
  if (!tree?.store?._getAllNodes) return
  tree.store._getAllNodes().forEach((node: any) => {
    node.expanded = expand
  })
}

const toggleExpandAll = () => {
  treeExpandedAll.value = !treeExpandedAll.value
  applyExpandState(treeExpandedAll.value)
}

const syncCurrentDept = (deptId?: number) => {
  if (deptId === undefined) {
    return false
  }
  const dept = displayFlatList.value.find((item) => item.id === deptId)
  if (!dept) {
    return false
  }
  currentDeptId.value = dept.id
  emit('dept-change', dept)
  nextTick(() => {
    deptTreeRef.value?.setCurrentKey(dept.id)
    applyExpandState(treeExpandedAll.value)
  })
  return true
}

const emitCurrentDept = (flatList: OrgStructureApi.OrgDeptVO[]) => {
  const dept = currentDeptId.value !== undefined
    ? flatList.find((item) => item.id === currentDeptId.value)
    : undefined
  emit('dept-change', dept)
}

const buildDeptTree = (list: OrgStructureApi.OrgDeptVO[]) => {
  const unassignedNode = createUnassignedNode()
  const deptMap = new Map(list.map((item) => [item.id, item]))
  const assignableTree = handleTree(list, 'id', 'parentId', 'children')
  const nextDisplayFlatList = [unassignedNode, ...list]
  deptTree.value = [unassignedNode, ...assignableTree]
  displayFlatList.value = nextDisplayFlatList
  emit('tree-change', { tree: deptTree.value, assignableTree, flatList: list })
  if (
    currentDeptId.value !== undefined &&
    currentDeptId.value !== OrgStructureApi.UNASSIGNED_DEPT_ID &&
    !deptMap.has(currentDeptId.value)
  ) {
    currentDeptId.value = undefined
  }
  const hasSyncedActiveDept = syncCurrentDept(props.activeDeptId)
  if (!hasSyncedActiveDept && currentDeptId.value === undefined) {
    currentDeptId.value = assignableTree[0]?.id ?? OrgStructureApi.UNASSIGNED_DEPT_ID
  }
  if (!hasSyncedActiveDept) {
    emitCurrentDept(nextDisplayFlatList)
  }
  if (!hasSyncedActiveDept) {
    nextTick(() => {
      if (currentDeptId.value !== undefined) {
        deptTreeRef.value?.setCurrentKey(currentDeptId.value)
      }
      applyExpandState(treeExpandedAll.value)
    })
  }
}

const fetchDeptTree = async () => {
  deptTreeLoading.value = true
  try {
    const [deptList, deptExtList] = await Promise.all([
      OrgStructureApi.getDeptList(),
      EduApi.getDeptExtSimpleList()
    ])
    const bizTypeMap = new Map(deptExtList.map((item) => [item.id, item.bizType]))
    buildDeptTree(
      deptList
        .map((item) => ({
          ...item,
          bizType: bizTypeMap.get(item.id)
        }))
        .sort(compareDept)
    )
  } finally {
    deptTreeLoading.value = false
  }
}

const handleRefreshTree = async () => {
  await fetchDeptTree()
  applyExpandState(treeExpandedAll.value)
}

const handleDeptClick = (dept: OrgStructureApi.OrgDeptVO) => {
  currentDeptId.value = dept.id
  emit('dept-change', dept)
}

watch(
  () => props.activeDeptId,
  (deptId) => {
    if (!displayFlatList.value.length || deptId === undefined || deptId === currentDeptId.value) {
      return
    }
    syncCurrentDept(deptId)
  }
)

onMounted(() => {
  fetchDeptTree()
})
</script>

<style scoped>
.org-structure-left {
  min-height: 560px;
}

.org-structure-tree {
  max-height: 520px;
  overflow: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.tree-node__main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tree-node__icon {
  flex-shrink: 0;
  font-size: 15px;
  color: var(--el-color-primary);
}

.tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.tree-node__source {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
