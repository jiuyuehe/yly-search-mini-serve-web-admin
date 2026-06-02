<template>
  <aside class="kb-sidebar" :class="{ collapsed: collapsed }">
    <div class="kb-sidebar-header">
      <div>
        <div class="kb-sidebar-title">知识库</div>
        <div class="kb-sidebar-subtitle">快速切换当前可用知识库</div>
      </div>
      <el-button text circle @click="emit('toggle-collapse')">
        <el-icon>
          <ArrowRight v-if="collapsed" />
          <ArrowLeft v-else />
        </el-icon>
      </el-button>
    </div>

    <template v-if="!collapsed">
      <el-input
        v-model="localSearchName"
        clearable
        placeholder="搜索知识库"
        class="mb-10px"
        @keyup.enter="emit('search')"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-button type="primary" class="w-full mb-10px" @click="emit('create')">
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
            @click="emit('select', item)"
            @contextmenu.prevent.stop="openContextMenu($event, item)"
          >
            <div class="kb-item-main">
              <div class="kb-item-avatar">
                {{ getDatasetInitials(item.dataset_name || item.name) }}
              </div>
              <div class="kb-item-copy">
                <div class="kb-item-name">{{ item.dataset_name || item.name }}</div>
                <div class="kb-item-desc">
                  {{ item.description || `共 ${item.document_count || 0} 个文档` }}
                </div>
              </div>
            </div>
            <el-tag size="small" type="info">{{ item.document_count || 0 }}</el-tag>
          </button>
        </div>
      </el-scrollbar>
    </template>
  </aside>

  <Teleport to="body">
    <div
      v-if="contextMenuVisible"
      class="kb-context-mask"
      @click="closeContextMenu"
      @contextmenu.prevent
    >
      <div class="kb-context-menu" :style="contextMenuStyle" @click.stop>
        <button class="kb-context-menu-item" @click="handleManageDataset">管理知识库</button>
        <button class="kb-context-menu-item danger" @click="handleDeleteDataset">删除知识库</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { PropType } from 'vue'
import { ArrowLeft, ArrowRight, Plus, Search } from '@element-plus/icons-vue'

defineOptions({ name: 'RagAiKnowledgeBaseSidebar' })

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  searchName: { type: String, default: '' },
  datasetGroups: {
    type: Array as PropType<Array<{ key: string; label: string; list: any[] }>>,
    default: () => []
  },
  selectedDatasetId: { type: [String, Number], default: '' }
})

const emit = defineEmits([
  'toggle-collapse',
  'search',
  'create',
  'select',
  'manage',
  'delete',
  'update:searchName'
])

const contextMenuVisible = ref(false)
const contextMenuItem = ref<any>(null)
const contextMenuStyle = ref({
  left: '0px',
  top: '0px'
})

const getDatasetInitials = (name = '') =>
  String(name || '')
    .trim()
    .slice(0, 2)
    .toUpperCase() || 'KB'

const localSearchName = computed({
  get: () => props.searchName,
  set: (value: string) => emit('update:searchName', value)
})

const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuItem.value = null
}

const openContextMenu = (event: MouseEvent, item: any) => {
  contextMenuItem.value = item
  const menuWidth = 160
  const menuHeight = 92
  const offset = 8
  const left = Math.min(event.clientX, window.innerWidth - menuWidth - offset)
  const top = Math.min(event.clientY, window.innerHeight - menuHeight - offset)
  contextMenuStyle.value = {
    left: `${Math.max(left, offset)}px`,
    top: `${Math.max(top, offset)}px`
  }
  contextMenuVisible.value = true
}

const handleManageDataset = () => {
  if (contextMenuItem.value) {
    emit('manage', contextMenuItem.value)
  }
  closeContextMenu()
}

const handleDeleteDataset = () => {
  if (contextMenuItem.value) {
    emit('delete', contextMenuItem.value)
  }
  closeContextMenu()
}

onMounted(() => {
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})
</script>

<style scoped>
.kb-sidebar {
  display: flex;
  width: 300px;
  height: 100%;
  min-width: 300px;
  min-height: 0;
  padding: 12px;
  overflow: hidden;
  background: var(--app-bg-subtle);
  background-color: #fafafa;
  border-right: 1px solid var(--app-border-color);
  box-sizing: border-box;
  flex-direction: column;
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
  flex: 1;
  min-height: 0;
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
  display: flex;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid transparent;
  border-radius: var(--app-radius-md);
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.kb-item + .kb-item {
  margin-top: 8px;
}

.kb-item.active {
  background: rgb(0 82 217 / 6%);
  border-color: rgb(0 82 217 / 20%);
}

.kb-item-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.kb-item-avatar {
  display: flex;
  width: 36px;
  height: 36px;
  font-weight: 600;
  color: var(--td-brand-color);
  background: rgb(0 82 217 / 10%);
  border-radius: 10px;
  align-items: center;
  justify-content: center;
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
  overflow: hidden;
  font-size: 12px;
  color: var(--app-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-context-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
}

.kb-context-menu {
  position: fixed;
  min-width: 160px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgb(15 23 42 / 12%);
}

.kb-context-menu-item {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.kb-context-menu-item:hover {
  background: var(--app-bg-subtle);
}

.kb-context-menu-item.danger {
  color: var(--el-color-danger);
}
</style>
