<template>
  <aside class="search-filter-panel">
    <div class="filter-head">
      <h2>筛选</h2>
      <el-button link type="primary" @click="$emit('reset')">重置</el-button>
    </div>

    <el-scrollbar class="filter-scroll">
      <el-collapse v-model="activeNames">
        <el-collapse-item title="范围" name="basic">
          <el-form label-position="top" class="filter-form">
            <div class="switch-line">
              <span>文件夹</span>
              <el-switch v-model="model.folder" />
            </div>
            <el-form-item label="文件类型">
              <el-segmented v-model="model.docType" :options="docTypeOptions" block />
            </el-form-item>
            <el-form-item label="扩展名">
              <el-input v-model="model.extname" placeholder="如 pdf、docx，多个用逗号分隔" clearable />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="时间范围" name="time">
          <el-form label-position="top" class="filter-form">
            <el-form-item>
              <div class="slider-field">
                <div class="slider-value">{{ timeMarks[timeIndex] }}</div>
                <el-slider v-model="timeIndex" :min="0" :max="5" :step="1" show-stops :marks="timeSliderMarks" />
              </div>
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="大小与精度" name="quality">
          <el-form label-position="top" class="filter-form">
            <el-form-item>
              <div class="slider-field">
                <div class="slider-value">{{ sizeRangeLabel }}</div>
                <el-slider v-model="sizeRange" range show-stops :min="0" :max="6" :marks="sizeSliderMarks" />
              </div>
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="标签" name="advanced">
          <el-form label-position="top" class="filter-form">
            <el-form-item label="AI 标签">
              <el-input v-model="model.fileAiTag" clearable />
            </el-form-item>
            <el-form-item label="系统标签">
              <el-input v-model="model.fileSysTag" clearable />
            </el-form-item>
            <el-form-item label="标签">
              <el-input v-model="model.tag" clearable />
            </el-form-item>
          </el-form>
        </el-collapse-item>
      </el-collapse>
    </el-scrollbar>
  </aside>
</template>

<script lang="ts" setup>
import type { SearchParam } from '@/api/rag/search'

defineEmits<{ reset: [] }>()

const model = defineModel<SearchParam>({ required: true })
const activeNames = ref(['basic', 'time', 'quality'])

const docTypeOptions = [
  { label: '全部', value: '' },
  { label: '文档', value: '2' },
  { label: '图片', value: '1' },
  { label: '音频', value: '3' },
  { label: '视频', value: '4' },
  { label: '压缩', value: '6' },
  { label: '其他', value: '5' }
]

const sizeStops = [
  { label: '0', value: 0 },
  { label: '1MB', value: 1024 * 1024 },
  { label: '10MB', value: 10 * 1024 * 1024 },
  { label: '50MB', value: 50 * 1024 * 1024 },
  { label: '200MB', value: 200 * 1024 * 1024 },
  { label: '1GB', value: 1024 * 1024 * 1024 },
  { label: '10GB+', value: 0 }
]

const sizeRange = ref<[number, number]>([0, 6])
const timeIndex = ref(0)
const timeMarks = ['全部', '今天', '近 7 天', '近 30 天', '近半年', '今年']
const sizeSliderMarks = { 0: '0', 1: '1M', 2: '10M', 3: '50M', 4: '200M', 5: '1G', 6: '10G+' }
const timeSliderMarks = { 0: '全部', 1: '今天', 2: '7天', 3: '30天', 4: '半年', 5: '今年' }

const formatDateTime = (date: Date) => {
  const pad = (value: number) => `${value}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const sizeRangeLabel = computed(() => {
  if (sizeRange.value[0] === 0 && sizeRange.value[1] === 6) return '不限大小'
  const start = sizeStops[sizeRange.value[0]]
  const end = sizeStops[sizeRange.value[1]]
  return `${start.label} - ${end.label}`
})

watch(sizeRange, ([start, end]) => {
  model.value.fileSize = ''
  if (start === 0 && end === 6) {
    model.value.minSize = undefined
    model.value.maxSize = undefined
    return
  }
  model.value.minSize = sizeStops[start].value
  model.value.maxSize = end === 6 ? 0 : sizeStops[end].value
}, { immediate: true })

watch(timeIndex, (value) => {
  model.value.timeDis = ''
  if (value === 0) {
    model.value.startDate = undefined
    model.value.endDate = undefined
    return
  }
  const now = new Date()
  let start = startOfToday()
  if (value === 2) start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (value === 3) start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  if (value === 4) start = new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000)
  if (value === 5) start = new Date(now.getFullYear(), 0, 1)
  model.value.startDate = formatDateTime(start)
  model.value.endDate = formatDateTime(now)
}, { immediate: true })

watch(() => [model.value.minSize, model.value.maxSize, model.value.startDate, model.value.endDate], ([minSize, maxSize, startDate, endDate]) => {
  if (minSize === undefined && maxSize === undefined) sizeRange.value = [0, 6]
  if (!startDate && !endDate) timeIndex.value = 0
})
</script>

<style scoped lang="scss">
.search-filter-panel {
  width: 300px;
  height: calc(100vh - 84px);
  min-width: 300px;
  overflow: hidden;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.filter-scroll {
  height: calc(100% - 56px);
}

.filter-form {
  padding: 8px 18px 4px;
}

.switch-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  padding: 0 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);

  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }
}

.slider-field {
  width: 100%;
  padding: 0 8px 24px;
}

.slider-value {
  margin-bottom: 2px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

:deep(.el-collapse) {
  border-top: 0;
  border-bottom: 0;
}

:deep(.el-collapse-item__header) {
  padding: 0 18px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-collapse-item__wrap) {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-collapse-item__content) {
  padding-bottom: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

:deep(.el-segmented) {
  width: 100%;
}

:deep(.el-slider__marks-text) {
  margin-top: 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
