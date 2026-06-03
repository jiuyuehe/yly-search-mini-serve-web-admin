<template>
  <aside class="kb-sidebar" :class="{ collapsed: collapsed }">
    <div class="kb-sidebar-header">
      <div class="kb-sidebar-header-copy">
        <div class="kb-sidebar-title">知识库</div>
        <div class="kb-sidebar-subtitle">快速切换当前可用知识库</div>
      </div>
      <el-button text circle class="kb-collapse-btn" @click="emit('toggle-collapse')">
        <el-icon>
          <ArrowRight v-if="collapsed" />
          <ArrowLeft v-else />
        </el-icon>
      </el-button>
    </div>

    <div class="kb-sidebar-body" :class="{ 'is-collapsed': collapsed }">
      <el-input v-model="localSearchName" clearable placeholder="搜索知识库" class="mb-10px">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="kb-sidebar-actions">
        <el-button type="primary" class="kb-sidebar-action-btn" @click="emit('create')">
          <el-icon class="mr-5px"><Plus /></el-icon>
          新建知识库
        </el-button>
        <el-button class="kb-sidebar-action-btn" @click="emit('refresh')">
          <el-icon class="mr-5px"><Refresh /></el-icon>
          刷新知识库
        </el-button>
      </div>

      <el-scrollbar class="kb-list-scroll">
        <div v-for="group in filteredDatasetGroups" :key="group.key" class="kb-group">
          <div class="kb-group-header">
            <span>{{ group.label }}</span>
            <el-tag size="small">{{ group.list.length }}</el-tag>
          </div>
          <div v-if="group.list == 0" class="kb-list-empty"> 还没有知识库~ </div>
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
    </div>
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
import { ArrowLeft, ArrowRight, Plus, Refresh, Search } from '@element-plus/icons-vue'

defineOptions({ name: 'RagAiKnowledgeBaseSidebar' })

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  datasetGroups: {
    type: Array as PropType<Array<{ key: string; label: string; list: any[] }>>,
    default: () => []
  },
  selectedDatasetId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['toggle-collapse', 'create', 'refresh', 'select', 'manage', 'delete'])

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

const localSearchName = ref('')

const filteredDatasetGroups = computed(() => {
  const keyword = localSearchName.value.trim().toLowerCase()
  if (!keyword) return props.datasetGroups

  return props.datasetGroups
    .map((group) => ({
      ...group,
      list: group.list.filter((item) => {
        const name = String(item.dataset_name || item.name || '').toLowerCase()
        return name.includes(keyword)
      })
    }))
    .filter((group) => group.list.length > 0)
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
  transition: width 0.28s ease;
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
  flex-shrink: 0;
}

.kb-sidebar-header-copy {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.kb-sidebar.collapsed .kb-sidebar-header-copy {
  opacity: 0;
  pointer-events: none;
}

.kb-collapse-btn {
  flex-shrink: 0;
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

/* ---- collapsible body ---- */

.kb-sidebar-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.22s ease,
    transform 0.28s ease;
}

.kb-sidebar-body.is-collapsed {
  opacity: 0;
  transform: translateX(-12px);
  pointer-events: none;
}

.kb-sidebar-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.kb-sidebar-action-btn {
  flex: 1;
}

.kb-list-scroll {
  flex: 1;
  min-height: 0;
}

.kb-list-empty {
  display: flex;
  height: 120px;
  color: var(--app-text-secondary);
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.kb-group + .kb-group {
  margin-top: 10px;
}

.kb-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.kb-item {
  display: flex;
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: background 0.15s;
}

.kb-item:hover {
  background: rgb(0 0 0 / 4%);
}

.kb-item + .kb-item {
  margin-top: 2px;
}

.kb-item.active {
  background: rgb(0 82 217 / 8%);
}

.kb-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.kb-item-avatar {
  display: flex;
  width: 28px;
  height: 28px;
  font-size: 12px;
  font-weight: 500;
  color: var(--td-brand-color);
  background: rgb(0 82 217 / 8%);
  border-radius: 6px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.kb-item-copy {
  min-width: 0;
}

.kb-item-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-item-desc {
  margin-top: 1px;
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
