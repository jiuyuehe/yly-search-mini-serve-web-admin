<script setup lang="ts">
import { Close, FullScreen, ScaleToOriginal } from '@element-plus/icons-vue'

defineOptions({ name: 'PreviewModal' })

type RectState = {
  left: number
  top: number
  width: number
  height: number
}

type ResizeDirection = 'bottom-left' | 'bottom-right'

const MIN_WIDTH = 520
const MIN_HEIGHT = 360
const COMPACT_VIEWPORT_WIDTH = 900
const COMPACT_VIEWPORT_HEIGHT = 640
const Z_INDEX = 3000

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    url?: string
    onClose?: () => void
  }>(),
  {
    title: '预览'
  }
)

const emit = defineEmits<{
  close: []
}>()

const slots = useSlots()
const isBrowser = typeof window !== 'undefined'
const windowRef = ref<HTMLDivElement>()
const rect = ref<RectState>(getDefaultRect())
const isFullscreen = ref(false)
const iframeLoading = ref(false)
const isInteracting = ref(false)
const beforeFullscreenRect = ref<RectState | null>(null)
const viewport = reactive({
  width: 0,
  height: 0
})
const bodyOverflow = ref('')
const resizeFrameId = ref<number | null>(null)
const pendingRect = ref<RectState | null>(null)

const commitRect = (nextRect: RectState) => {
  rect.value = nextRect
}

const scheduleRectUpdate = (nextRect: RectState) => {
  pendingRect.value = nextRect
  if (resizeFrameId.value !== null) return

  resizeFrameId.value = window.requestAnimationFrame(() => {
    resizeFrameId.value = null
    if (!pendingRect.value || !windowRef.value) return
    windowRef.value.style.left = `${pendingRect.value.left}px`
    windowRef.value.style.top = `${pendingRect.value.top}px`
    windowRef.value.style.width = `${pendingRect.value.width}px`
    windowRef.value.style.height = `${pendingRect.value.height}px`
  })
}

const cancelScheduledRectUpdate = () => {
  if (resizeFrameId.value === null) return
  window.cancelAnimationFrame(resizeFrameId.value)
  resizeFrameId.value = null
  pendingRect.value = null
}

const syncViewport = () => {
  if (!isBrowser) return
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
}

const isCompactViewport = () =>
  viewport.width < COMPACT_VIEWPORT_WIDTH || viewport.height < COMPACT_VIEWPORT_HEIGHT

const clampValue = (value: number, min: number, max: number) => {
  if (max < min) return max
  return Math.min(Math.max(value, min), max)
}

const getViewportWidth = () => (viewport.width > 0 ? viewport.width : MIN_WIDTH)
const getViewportHeight = () => (viewport.height > 0 ? viewport.height : MIN_HEIGHT)

function getDefaultRect(): RectState {
  if (!isBrowser) {
    return {
      left: 120,
      top: 80,
      width: 960,
      height: 640
    }
  }

  const width = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.8))
  const height = Math.max(MIN_HEIGHT, Math.floor(window.innerHeight * 0.8))

  return {
    width,
    height,
    left: Math.floor((window.innerWidth - width) / 2),
    top: Math.floor((window.innerHeight - height) / 2)
  }
}

function getFullscreenRect(): RectState {
  return {
    left: 0,
    top: 0,
    width: getViewportWidth(),
    height: getViewportHeight()
  }
}

function clampRect(nextRect: RectState): RectState {
  const viewportWidth = getViewportWidth()
  const viewportHeight = getViewportHeight()
  const widthMin = Math.min(MIN_WIDTH, viewportWidth)
  const heightMin = Math.min(MIN_HEIGHT, viewportHeight)

  const width = clampValue(Math.round(nextRect.width), widthMin, viewportWidth)
  const height = clampValue(Math.round(nextRect.height), heightMin, viewportHeight)
  const left = clampValue(Math.round(nextRect.left), 0, Math.max(0, viewportWidth - width))
  const top = clampValue(Math.round(nextRect.top), 0, Math.max(0, viewportHeight - height))

  return {
    left,
    top,
    width,
    height
  }
}

function normalizeResizeRect(
  nextRect: RectState,
  startRect: RectState,
  direction: ResizeDirection
): RectState {
  const viewportWidth = getViewportWidth()
  const viewportHeight = getViewportHeight()
  const widthMin = Math.min(MIN_WIDTH, viewportWidth)
  const heightMin = Math.min(MIN_HEIGHT, viewportHeight)
  const rectValue = { ...nextRect }

  if (rectValue.width < widthMin) {
    if (direction.includes('left')) {
      rectValue.left = startRect.left + startRect.width - widthMin
    }
    rectValue.width = widthMin
  }

  if (rectValue.height < heightMin) {
    rectValue.height = heightMin
  }

  if (rectValue.left + rectValue.width > viewportWidth) {
    if (direction.includes('left')) {
      rectValue.left = Math.max(0, viewportWidth - rectValue.width)
    } else {
      rectValue.width = Math.max(widthMin, viewportWidth - rectValue.left)
    }
  }

  if (rectValue.top + rectValue.height > viewportHeight) {
    rectValue.height = Math.max(heightMin, viewportHeight - rectValue.top)
  }

  return rectValue
}

const handleClose = () => {
  emit('close')
  props.onClose?.()
}

const enterFullscreen = () => {
  if (isFullscreen.value) return
  beforeFullscreenRect.value = clampRect(rect.value)
  isFullscreen.value = true
  commitRect(getFullscreenRect())
}

const exitFullscreen = () => {
  if (!isFullscreen.value) return
  isFullscreen.value = false
  commitRect(clampRect(beforeFullscreenRect.value ?? getDefaultRect()))
}

const toggleFullscreen = () => {
  if (isFullscreen.value) {
    exitFullscreen()
    return
  }
  enterFullscreen()
}

const handleHeaderPointerDown = (event: PointerEvent) => {
  if (isFullscreen.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('button')) return

  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  isInteracting.value = true
  const startRect = { ...rect.value }
  const startX = event.clientX
  const startY = event.clientY

  const handlePointerMove = (moveEvent: PointerEvent) => {
    scheduleRectUpdate(
      clampRect({
        ...startRect,
        left: startRect.left + (moveEvent.clientX - startX),
        top: startRect.top + (moveEvent.clientY - startY)
      })
    )
  }

  const handlePointerUp = () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    const finalRect = pendingRect.value ?? rect.value
    isInteracting.value = false
    cancelScheduledRectUpdate()
    commitRect(clampRect(finalRect))
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleResizePointerDown = (event: PointerEvent, direction: ResizeDirection) => {
  if (isFullscreen.value) return

  event.preventDefault()
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  isInteracting.value = true

  const startRect = { ...rect.value }
  const startX = event.clientX
  const startY = event.clientY

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const deltaX = moveEvent.clientX - startX
    const deltaY = moveEvent.clientY - startY
    const nextRect: RectState = { ...startRect }

    if (direction.includes('right')) {
      nextRect.width = startRect.width + deltaX
    }

    if (direction.includes('left')) {
      nextRect.left = startRect.left + deltaX
      nextRect.width = startRect.width - deltaX
    }

    if (direction.includes('bottom')) {
      nextRect.height = startRect.height + deltaY
    }

    scheduleRectUpdate(clampRect(normalizeResizeRect(nextRect, startRect, direction)))
  }

  const handlePointerUp = () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    const finalRect = pendingRect.value ?? rect.value
    isInteracting.value = false
    cancelScheduledRectUpdate()
    commitRect(clampRect(finalRect))
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) {
    handleClose()
  }
}

const handleWindowResize = () => {
  syncViewport()
  if (!props.open) return

  if (isFullscreen.value) {
    rect.value = getFullscreenRect()
    return
  }

  rect.value = clampRect(rect.value)
}

watch(
  () => props.open,
  (visible) => {
    if (!isBrowser) return

    syncViewport()

    if (visible) {
      bodyOverflow.value = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      isFullscreen.value = isCompactViewport()
      beforeFullscreenRect.value = null
      rect.value = isFullscreen.value ? getFullscreenRect() : clampRect(getDefaultRect())
      iframeLoading.value = Boolean(props.url) && !slots.default
      window.addEventListener('keydown', handleKeyDown)
      return
    }

    document.body.style.overflow = bodyOverflow.value
    window.removeEventListener('keydown', handleKeyDown)
    beforeFullscreenRect.value = null
    isFullscreen.value = false
  },
  { immediate: true }
)

watch(
  () => props.url,
  (url) => {
    if (!props.open || slots.default) return
    iframeLoading.value = Boolean(url)
  }
)

onMounted(() => {
  if (!isBrowser) return
  syncViewport()
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  if (!isBrowser) return
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('keydown', handleKeyDown)
  cancelScheduledRectUpdate()
  document.body.style.overflow = bodyOverflow.value
})

const windowStyle = computed(() => ({
  left: `${rect.value.left}px`,
  top: `${rect.value.top}px`,
  width: `${rect.value.width}px`,
  height: `${rect.value.height}px`
}))

const showIframe = computed(() => !slots.default && Boolean(props.url))
</script>

<template>
  <Teleport to="body">
    <Transition name="preview-modal-fade">
      <div
        v-if="open"
        class="preview-modal-root"
        :class="{ 'is-interacting': isInteracting }"
        :style="{ zIndex: Z_INDEX }"
        aria-modal="true"
        role="dialog"
      >
        <div
          ref="windowRef"
          class="preview-modal-window"
          :class="{ 'is-fullscreen': isFullscreen }"
          :style="windowStyle"
        >
          <div class="preview-modal-header" @pointerdown="handleHeaderPointerDown">
            <div class="preview-modal-title" :title="title">
              {{ title }}
            </div>

            <div class="preview-modal-actions">
              <button
                type="button"
                class="preview-modal-action-btn"
                :aria-label="isFullscreen ? '退出全屏' : '全屏'"
                :title="isFullscreen ? '退出全屏' : '全屏'"
                @click="toggleFullscreen"
              >
                <el-icon>
                  <ScaleToOriginal v-if="isFullscreen" />
                  <FullScreen v-else />
                </el-icon>
              </button>
              <button
                type="button"
                class="preview-modal-action-btn danger"
                aria-label="关闭"
                title="关闭"
                @click="handleClose"
              >
                <el-icon>
                  <Close />
                </el-icon>
              </button>
            </div>
          </div>

          <div class="preview-modal-body">
            <template v-if="slots.default">
              <slot ></slot>
            </template>

            <template v-else-if="showIframe">
              <div v-if="iframeLoading" class="preview-modal-loading">
                <el-skeleton animated :rows="8" />
              </div>
              <iframe
                class="preview-modal-iframe"
                :src="url"
                :title="title"
                @load="iframeLoading = false"
              ></iframe>
            </template>

            <div v-else class="preview-modal-empty">
              暂无可预览内容
            </div>
          </div>

          <template v-if="!isFullscreen">
            <div
              class="preview-modal-resize-handle bottom-left"
              @pointerdown="handleResizePointerDown($event, 'bottom-left')"
            ></div>
            <div
              class="preview-modal-resize-handle bottom-right"
              @pointerdown="handleResizePointerDown($event, 'bottom-right')"
            ></div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.preview-modal-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.preview-modal-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  background: var(--el-bg-color);
  border: 1px solid rgb(148 163 184 / 38%);
  border-radius: 4px;
  box-shadow:
    0 10px 28px rgb(15 23 42 / 18%),
    0 2px 8px rgb(15 23 42 / 10%);
  transition:
    border-radius 0.18s ease,
    box-shadow 0.18s ease;
  will-change: left, top, width, height;
}

.preview-modal-root.is-interacting .preview-modal-window {
  transition: none;
}

.preview-modal-root.is-interacting .preview-modal-iframe {
  pointer-events: none;
}

.preview-modal-window.is-fullscreen {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.preview-modal-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 10px 0 16px;
  cursor: move;
  background: linear-gradient(180deg, rgb(248 250 252 / 98%), rgb(241 245 249 / 96%));
  border-bottom: 1px solid rgb(226 232 240 / 90%);
  user-select: none;
  touch-action: none;
}

.preview-modal-window.is-fullscreen .preview-modal-header {
  cursor: default;
}

.preview-modal-title {
  position: absolute;
  left: 50%;
  max-width: calc(100% - 160px);
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateX(-50%);
}

.preview-modal-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.preview-modal-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 10px;
  transition:
    background-color 0.16s ease,
    color 0.16s ease,
    transform 0.12s ease;
}

.preview-modal-action-btn:hover {
  color: var(--el-text-color-primary);
  background: rgb(148 163 184 / 18%);
}

.preview-modal-action-btn:active {
  transform: scale(0.94);
}

.preview-modal-action-btn.danger:hover {
  color: var(--el-color-danger);
  background: rgb(248 113 113 / 14%);
}

.preview-modal-body {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #f8fafc;
}

.preview-modal-iframe {
  display: block;
  width: 100%;
  height: 100%;
  background: #fff;
  border: 0;
}

.preview-modal-loading,
.preview-modal-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-modal-loading {
  z-index: 1;
  background: rgb(248 250 252 / 84%);
  backdrop-filter: blur(2px);
}

.preview-modal-empty {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.preview-modal-resize-handle {
  position: absolute;
  z-index: 2;
  width: 30px;
  height: 30px;
  touch-action: none;
}

.preview-modal-resize-handle::after {
  position: absolute;
  inset: 4px;
  background: transparent;
  border-radius: 999px;
  content: '';
}

.preview-modal-resize-handle:hover::after {
  background: rgb(59 130 246 / 22%);
}

.preview-modal-resize-handle.bottom-left {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}

.preview-modal-resize-handle.bottom-right {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}

.preview-modal-fade-enter-active,
.preview-modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.preview-modal-fade-enter-from,
.preview-modal-fade-leave-to {
  opacity: 0;
}

.preview-modal-fade-enter-active .preview-modal-window,
.preview-modal-fade-leave-active .preview-modal-window {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.preview-modal-fade-enter-from .preview-modal-window,
.preview-modal-fade-leave-to .preview-modal-window {
  opacity: 0;
  transform: scale(0.98);
}
</style>
