<template>
  <aside
    class="session-sidebar"
    :class="{
      collapsed,
      'embedded-mode': !showToggleControls,
      'embedded-hidden': collapsed && !showToggleControls
    }"
  >
    <div v-if="!collapsed || !showToggleControls" class="session-sidebar-body">
      <div class="session-header">
        <div class="session-header-top">
          <div class="session-header-copy">
            <div class="session-header-title">会话历史</div>
            <div class="session-header-subtitle">{{ sessionCountText }}</div>
          </div>
          <el-button
            v-if="showToggleControls"
            class="collapse-btn"
            text
            @click="$emit('collapse')"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="session-list-wrap">
        <el-scrollbar class="session-list">
          <div v-if="sessionList?.length" class="session-list-inner">
            <div
              v-for="session in sessionList"
              :key="session.id"
              class="session-item"
              :class="{ active: String(session.id) === String(activeSessionId) }"
              @click="$emit('switch-session', session)"
            >
              <div class="session-item-main">
                <div class="session-icon-wrap">
                  <el-icon class="session-icon"><ChatLineSquare /></el-icon>
                </div>
                <div class="session-copy">
                  <template v-if="editingSessionId === session.id">
                    <div class="session-rename-row" @click.stop>
                      <el-input
                        ref="renameInputRef"
                        v-model="editingName"
                        class="session-rename-input"
                        maxlength="60"
                        @keydown.enter.stop.prevent="submitRename(session)"
                        @keydown.esc.stop.prevent="cancelRename"
                      />
                      <el-button
                        class="session-rename-confirm"
                        size="small"
                        type="primary"
                        :disabled="!editingName.trim()"
                        @click.stop="submitRename(session)"
                      >
                        <el-icon><Check /></el-icon>
                      </el-button>
                      <el-button
                        class="session-rename-cancel"
                        size="small"
                        text
                        @click.stop="cancelRename"
                      >
                        <el-icon><Close /></el-icon>
                      </el-button>
                    </div>
                  </template>
                  <span v-else class="session-title" :title="displaySessionName(session)">
                    {{ displaySessionName(session) }}
                  </span>
                </div>
              </div>

              <div class="session-item-actions" @click.stop>
                <el-dropdown trigger="click" @command="(command) => handleSessionAction(command, session)">
                  <el-button class="session-more-btn" text>
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
            </div>

            <div class="session-list-end">没有更多会话了</div>
          </div>

          <div v-else class="session-empty">
            <el-icon class="session-empty-icon"><Clock /></el-icon>
            <div class="session-empty-title">还没有会话</div>
            <div class="session-empty-desc">点击下方“新的会话”开始提问</div>
          </div>
        </el-scrollbar>
      </div>

      <div class="session-sidebar-footer">
        <el-button
          type="primary"
          :disabled="!canCreateSession"
          @click="$emit('new-session')"
        >
          <el-icon><Plus /></el-icon>
          新的会话
        </el-button>
        <el-popconfirm
          width="220"
          title="确定要重置当前会话吗？"
          confirm-button-text="确定重置"
          cancel-button-text="取消"
          @confirm="$emit('reset-session')"
        >
          <template #reference>
            <el-button
              type="danger"
              plain
              :loading="resettingSession"
              :disabled="!canResetSession"
            >
              <el-icon><Delete /></el-icon>
              重置会话
            </el-button>
          </template>
        </el-popconfirm>
      </div>
    </div>

    <div v-else-if="showToggleControls" class="sidebar-collapsed-bar">
      <el-button class="expand-btn" text @click="$emit('collapse')">
        <el-icon><ArrowRight /></el-icon>
      </el-button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  ChatLineSquare,
  Check,
  Clock,
  Close,
  Delete,
  MoreFilled,
  Plus
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { PropType } from 'vue'

defineOptions({ name: 'RagAiChatSessionList' })

type SessionRecord = {
  id: string
  name?: string
  [key: string]: any
}

const props = defineProps({
  sessionList: {
    type: Array as PropType<SessionRecord[]>,
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
const editingSessionId = ref('')
const editingName = ref('')
const renameInputRef = ref<any>(null)

const sessionCountText = computed(() => {
  const count = props.sessionList?.length || 0
  if (!count) return '暂无历史会话'
  return `最近 ${count} 个会话`
})

const displaySessionName = (session: any) => {
  const name = String(session?.name ?? '').trim()
  return name || DEFAULT_SESSION_NAME
}

const startRename = async (session: any) => {
  editingSessionId.value = session?.id || ''
  editingName.value = displaySessionName(session)
  await nextTick()
  // el-input ref may be an array in v-for
  const inputEl = Array.isArray(renameInputRef.value)
    ? renameInputRef.value[0]
    : renameInputRef.value
  inputEl?.focus?.()
  inputEl?.select?.()
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
  if (nextName === previousName) return
  emit('rename-session', { sessionId, name: nextName })
}

const handleSessionAction = async (command: string, session: any) => {
  if (command === 'rename') {
    startRename(session)
    return
  }
  if (command === 'delete') {
    try {
      await ElMessageBox.confirm(
        `确定删除会话「${displaySessionName(session)}」吗？删除后无法恢复。`,
        '删除会话',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
      )
      emit('delete-session', session?.id)
    } catch {
      // cancelled
    }
  }
}
</script>

<style scoped>
.session-sidebar {
  display: flex;
  width: 300px;
  height: 100%;
  padding: 16px 12px 14px;
  overflow: hidden;
  background: #f8faff;
  border-right: 1px solid rgb(15 23 42 / 4%);
  transition:
    width 0.24s ease,
    min-width 0.24s ease,
    max-width 0.24s ease,
    padding 0.24s ease,
    opacity 0.2s ease,
    border-color 0.2s ease;
  flex-direction: column;
}

.session-sidebar.collapsed {
  width: 72px !important;
  max-width: 72px !important;
  min-width: 72px !important;
  padding: 10px 8px;
}

.session-sidebar.embedded-mode {
  width: 300px;
  max-width: 300px;
  min-width: 300px;
}

.session-sidebar.embedded-hidden {
  width: 0 !important;
  max-width: 0 !important;
  min-width: 0 !important;
  padding: 0;
  border-right-color: transparent;
  opacity: 0;
}

.session-sidebar-body {
  display: flex;
  height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.session-sidebar.embedded-hidden .session-sidebar-body {
  pointer-events: none;
  opacity: 0;
  transform: translateX(-12px);
}

.sidebar-collapsed-bar {
  display: flex;
  width: 100%;
  height: 48px;
  background: #fff;
  border: 1px solid var(--app-border-color);
  border-radius: var(--app-radius-md);
  align-items: center;
  justify-content: center;
}

.expand-btn,
.collapse-btn {
  width: 38px;
  height: 38px;
  color: var(--app-text-secondary);
  background: #f4f7fb;
  border-radius: 10px;
}

.session-header {
  display: flex;
  padding: 0 4px 0 6px;
  background: transparent;
  border-radius: 0;
  flex-direction: column;
  gap: 8px;
}

.session-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.session-header-title {
  font-size: 18px;
  font-weight: var(--app-font-weight-semibold);
  color: var(--app-text-primary);
}

.session-header-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: var(--app-text-secondary);
}

.session-list-wrap {
  display: flex;
  min-height: 0;
  padding: 8px;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  flex: 1;
  flex-direction: column;
}

.session-list {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
}

.session-list :deep(.el-scrollbar__wrap) {
  width: 100%;
}

.session-list :deep(.el-scrollbar__view) {
  width: 100%;
  min-width: 100%;
  min-height: 100%;
}

.session-list-inner {
  display: flex;
  width: 100%;
  min-width: 100%;
  min-height: 100%;
  flex-direction: column;
}

.session-item {
  display: flex;
  min-height: 0;
  padding: 13px 14px;
  margin-bottom: 6px;
  cursor: pointer;
  background: transparent;
  border-radius: 8px;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
  align-items: center;
  justify-content: space-between;
}

.session-item:hover {
  background: rgb(0 82 217 / 5%);
}

.session-item.active {
  background: rgb(0 82 217 / 10%);
}

.session-item-main {
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-grow: 1;
  align-items: center;
}

.session-icon-wrap {
  display: flex;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.session-icon {
  font-size: 15px;
  color: var(--app-color-brand);
}

.session-copy {
  min-width: 0;
  margin-left: 10px;
  flex: 1;
}

.session-title {
  display: block;
  overflow: hidden;
  font-size: 14px;
  font-weight: var(--app-font-weight-medium);
  color: var(--app-text-primary);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item.active .session-title {
  color: var(--app-color-brand);
}

.session-title-input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: var(--app-font-weight-medium);
  color: var(--app-text-primary);
  background: #fff;
  border: 1px solid rgb(0 82 217 / 24%);
  border-radius: var(--app-radius-sm);
  outline: none;
}

.session-title-input:focus {
  border-color: var(--app-color-brand);
  box-shadow: 0 0 0 2px rgb(0 82 217 / 12%);
}

/* ---- rename row ---- */

.session-rename-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.session-rename-input {
  flex: 1;
  min-width: 0;
}

.session-rename-input :deep(.el-input__wrapper) {
  padding: 0 8px;
  font-size: 14px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 0 0 1px rgb(0 82 217 / 28%);
}

.session-rename-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgb(0 82 217 / 40%);
}

.session-rename-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgb(0 82 217 / 16%);
}

.session-rename-input :deep(.el-input__inner) {
  height: 30px;
  font-size: 14px;
  font-weight: var(--app-font-weight-medium);
  color: var(--app-text-primary);
}

.session-rename-confirm,
.session-rename-cancel {
  width: 28px;
  height: 28px;
  padding: 0;
  flex-shrink: 0;
}

.session-rename-confirm {
  border-radius: 6px;
}

.session-rename-cancel {
  color: var(--app-text-secondary);
}

.session-item-actions {
  display: flex;
  margin-left: 8px;
  flex-shrink: 0;
  align-items: center;
}

.session-more-btn {
  width: 28px;
  height: 28px;
  color: var(--app-text-secondary);
  border-radius: var(--app-radius-sm);
  flex-shrink: 0;
}

.session-item.active .session-more-btn {
  color: var(--app-color-brand);
}

.session-empty {
  display: flex;
  height: 100%;
  min-height: 180px;
  padding: 18px 14px;
  text-align: center;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.session-list-end {
  padding: 8px 10px 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--app-text-placeholder);
  text-align: center;
}

.session-empty-icon {
  font-size: 28px;
  color: var(--app-text-placeholder);
}

.session-empty-title {
  margin-top: 10px;
  font-size: 14px;
  font-weight: var(--app-font-weight-medium);
  color: var(--app-text-primary);
}

.session-empty-desc {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.session-sidebar-footer {
  display: flex;
  padding: 0;
  flex-direction: row;
  gap: 10px;
  flex-shrink: 0;
}

.session-sidebar-footer > :first-child {
  flex: 1;
}

.session-sidebar-footer :deep(.el-button) {
  height: 36px;
  margin-left: 0;
  font-size: 15px;
  font-weight: var(--app-font-weight-semibold);
  border-radius: 8px;
}

.session-sidebar-footer :deep(.el-button--danger.is-plain) {
  color: #fff;
  background: #dc4c43;
  border-color: #dc4c43;
}

.session-sidebar-footer :deep(.el-button--danger.is-plain:hover),
.session-sidebar-footer :deep(.el-button--danger.is-plain:focus) {
  color: #fff;
  background: #cf3f37;
  border-color: #cf3f37;
}
</style>
