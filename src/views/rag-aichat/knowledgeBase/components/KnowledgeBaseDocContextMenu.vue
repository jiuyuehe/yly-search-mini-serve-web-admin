<template>
  <Teleport to="body">
    <transition name="doc-context-menu">
      <div
        v-if="visible"
        ref="menuRef"
        class="doc-context-menu"
        :style="menuStyle"
        @contextmenu.prevent
      >
        <div class="doc-context-menu__body">
          <el-button
            v-for="button in buttons"
            :key="button.text"
            :type="button.type"
            link
            :disabled="button.disabled"
            :style="{
              display: 'flex',
              justifyContent: 'flex-start',
              width: '100%',
              whiteSpace: 'nowrap',
              margin: 0,
              padding: '8px 10px',
              fontSize: '12px'
            }"
            @click="button.onClick"
          >
            <el-icon v-if="button.icon"><component :is="button.icon" /></el-icon>
            {{ button.text }}
          </el-button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Grid,
  List,
  Refresh,
  Upload,
  CaretRight,
  VideoPause,
  Delete
} from '@element-plus/icons-vue'

defineOptions({ name: 'RagAiKnowledgeBaseDocContextMenu' })

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  selectedCount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'refresh'): void
  (e: 'upload'): void
  (e: 'batch-parse'): void
  (e: 'batch-stop-parse'): void
  (e: 'batch-delete'): void
  (e: 'change-view', mode: 'grid' | 'list'): void
}>()

const menuRef = ref<HTMLElement | null>(null)

const hasSelection = computed(() => props.selectedCount > 0)

const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

const buttons = computed(() =>
  hasSelection.value
    ? [
        {
          text: '批量解析',
          icon: CaretRight,
          type: 'primary' as const,
          onClick: () => emit('batch-parse')
        },
        {
          text: '停止解析',
          icon: VideoPause,
          type: 'primary' as const,
          onClick: () => emit('batch-stop-parse')
        },
        {
          text: '批量删除',
          icon: Delete,
          type: 'danger' as const,
          onClick: () => emit('batch-delete')
        }
      ]
    : [
        { text: '刷新', icon: Refresh, type: 'primary' as const, onClick: () => emit('refresh') },
        { text: '上传', icon: Upload, type: 'primary' as const, onClick: () => emit('upload') },
        {
          text: '网格',
          icon: Grid,
          type: 'primary' as const,
          onClick: () => emit('change-view', 'grid')
        },
        {
          text: '列表',
          icon: List,
          type: 'primary' as const,
          onClick: () => emit('change-view', 'list')
        }
      ]
)

const handleGlobalPointerDown = (event: PointerEvent) => {
  if (!props.visible) return
  if (event.button !== 0) return
  const target = event.target as Node | null
  if (target && menuRef.value?.contains(target)) return
  emit('close')
}

const handleGlobalScroll = () => {
  if (props.visible) emit('close')
}

const handleGlobalResize = () => {
  if (props.visible) emit('close')
}

const addListeners = () => {
  window.addEventListener('pointerdown', handleGlobalPointerDown, true)
  window.addEventListener('scroll', handleGlobalScroll, true)
  window.addEventListener('resize', handleGlobalResize)
}

const removeListeners = () => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown, true)
  window.removeEventListener('scroll', handleGlobalScroll, true)
  window.removeEventListener('resize', handleGlobalResize)
}

watch(
  () => props.visible,
  (visible, previousVisible) => {
    if (visible && !previousVisible) {
      addListeners()
    } else if (!visible && previousVisible) {
      removeListeners()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  removeListeners()
})
</script>

<style scoped>
.doc-context-menu {
  position: fixed;
  z-index: 3000;
  width: 176px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #dce7f5;
  border-radius: 12px;
  box-shadow: 0 16px 38px rgb(15 23 42 / 16%);
}

.doc-context-menu__body {
  display: flex;
  padding: 8px 8px 10px;
  flex-direction: column;
  gap: 2px;
}

.doc-context-menu-enter-active,
.doc-context-menu-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}

.doc-context-menu-enter-from,
.doc-context-menu-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
