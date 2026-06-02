<template>
  <aside class="session-sidebar" :class="{ collapsed }">
    <div v-if="!collapsed" class="session-sidebar-body">
      <div class="session-header">
        <div class="session-header-top">
          <div class="session-header-copy">
            <div class="session-header-title">会话历史</div>
            <div class="session-header-subtitle">{{ sessionCountText }}</div>
          </div>
          <el-button v-if="showToggleControls" text circle @click="$emit('collapse')">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
        </div>

        <el-button
          type="primary"
          class="w-full"
          :disabled="!canCreateSession"
          @click="$emit('new-session')"
        >
          <el-icon class="mr-5px"><Plus /></el-icon>
          新的会话
        </el-button>

        <el-button class="w-full" :disabled="!canResetSession" @click="$emit('reset-session')">
          <el-icon class="mr-5px"><RefreshRight /></el-icon>
          重置会话
        </el-button>
      </div>

      <div class="session-list-wrap">
        <el-input v-model="searchName" clearable placeholder="搜索历史记录" class="mb-10px">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-empty v-if="!filteredSessions.length" description="还没有会话" />

        <el-scrollbar v-else class="session-list">
          <div
            v-for="session in filteredSessions"
            :key="session.id"
            class="session-item"
            :class="{ active: String(session.id) === String(activeSessionId) }"
            @click="$emit('switch-session', session)"
          >
            <div class="session-item-main">
              <div class="session-icon-wrap">
                <el-icon><ChatLineSquare /></el-icon>
              </div>
              <div class="session-copy">
                <el-input
                  v-if="editingSessionId === session.id"
                  ref="renameInputRef"
                  v-model="editingName"
                  maxlength="60"
                  class="session-title-input"
                  @click.stop
                  @keydown.enter.stop.prevent="submitRename(session)"
                  @keydown.esc.stop.prevent="cancelRename"
                  @blur="submitRename(session)"
                />
                <span v-else class="session-title" :title="displaySessionName(session)">
                  {{ displaySessionName(session) }}
                </span>
              </div>
            </div>

            <el-dropdown
              trigger="click"
              @command="(command) => handleSessionAction(command, session)"
            >
              <el-button text circle @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rename">重命名</el-dropdown-item>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <div v-else-if="showToggleControls" class="sidebar-collapsed-bar">
      <el-button text circle @click="$emit('collapse')">
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  ChatLineSquare,
  MoreFilled,
  Plus,
  RefreshRight,
  Search
} from '@element-plus/icons-vue'

defineOptions({ name: 'RagAiChatSessionList' })

const props = defineProps({
  sessionList: {
    type: Array,
    default: () => []
  },
  activeSessionId: {
    type: [String, Number],
    default: ''
  },
  canCreateSession: {
    type: Boolean,
    default: true
  },
  canResetSession: {
    type: Boolean,
    default: false
  },
  resettingSession: {
    type: Boolean,
    default: false
  },
  collapsed: {
    type: Boolean,
    default: false
  },
  showToggleControls: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'collapse',
  'switch-session',
  'delete-session',
  'new-session',
  'reset-session',
  'rename-session'
])

const DEFAULT_SESSION_NAME = '新的会话'
const searchName = ref('')
const editingSessionId = ref('')
const editingName = ref('')
const renameInputRef = ref()

const filteredSessions = computed(() => {
  const keyword = searchName.value.trim().toLowerCase()
  const list = (props.sessionList || []) as any[]
  if (!keyword) return list
  return list.filter((item) =>
    String(item?.name || DEFAULT_SESSION_NAME)
      .toLowerCase()
      .includes(keyword)
  )
})

const sessionCountText = computed(() => {
  const count = (props.sessionList as any[])?.length || 0
  if (!count) return '暂无历史会话'
  return `最近 ${count} 个会话`
})

const displaySessionName = (session: any) => {
  const name = String(session?.name ?? '').trim()
  return name || DEFAULT_SESSION_NAME
}

const getRenameInputElement = () => {
  if (Array.isArray(renameInputRef.value)) {
    return renameInputRef.value[0] || null
  }
  return renameInputRef.value
}

const startRename = async (session: any) => {
  editingSessionId.value = session?.id || ''
  editingName.value = displaySessionName(session)
  await nextTick()
  const input = getRenameInputElement()
  input?.focus?.()
  input?.select?.()
}

const cancelRename = () => {
  editingSessionId.value = ''
  editingName.value = ''
}

const submitRename = (session: any) => {
  const sessionId = session?.id || ''
  if (!sessionId || editingSessionId.value !== sessionId) return
  const nextName = editingName.value.trim() || DEFAULT_SESSION_NAME
  const previousName = displaySessionName(session)
  editingSessionId.value = ''
  editingName.value = ''
  if (nextName === previousName) {
    return
  }
  emit('rename-session', { sessionId, name: nextName })
}

const handleSessionAction = (command: string, session: any) => {
  if (command === 'rename') {
    startRename(session)
    return
  }
  if (command === 'delete') {
    emit('delete-session', session?.id)
  }
}
</script>

<style scoped>
.session-sidebar {
  display: flex;
  width: 272px;
  height: 100%;
  padding: 10px;
  overflow: hidden;
  background: var(--app-bg-subtle);
  border-right: 1px solid var(--app-border-color);
  flex-direction: column;
}

.session-sidebar-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.session-header {
  display: flex;
  padding: 8px;
  background: #fff;
  border-radius: var(--app-radius-md);
  flex-direction: column;
  gap: 10px;
}

.session-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.session-header-title {
  font-size: 15px;
  font-weight: 600;
}

.session-header-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.session-list-wrap {
  min-height: 0;
  padding: 8px;
  background: #fff;
  border-radius: var(--app-radius-md);
  flex: 1;
}

.session-list {
  height: calc(100% - 44px);
}

.session-item {
  display: flex;
  padding: 8px 10px;
  margin-bottom: 4px;
  cursor: pointer;
  border-radius: var(--app-radius-md);
  transition: background-color 0.2s ease;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.session-item:hover {
  background: rgb(15 23 42 / 5%);
}

.session-item.active {
  background: rgb(0 82 217 / 8%);
}

.session-item-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.session-icon-wrap {
  display: flex;
  width: 28px;
  height: 28px;
  color: var(--td-brand-color);
  background: rgb(0 82 217 / 10%);
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}

.session-copy {
  min-width: 0;
}

.session-title {
  display: block;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-collapsed-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
