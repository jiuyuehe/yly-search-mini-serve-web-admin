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
  position: relative;
  z-index: 2;
  width: 300px;
  min-width: 300px;
  height: calc(100vh - 84px);
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 255 255 / 58%), rgb(255 255 255 / 34%));
  border-right: 1px solid rgb(255 255 255 / 70%);
  box-shadow: 20px 0 60px rgb(15 23 42 / 8%), inset -1px 0 0 rgb(148 163 184 / 16%);
  backdrop-filter: blur(28px) saturate(160%);
}

.search-filter-panel::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: linear-gradient(115deg, rgb(255 255 255 / 45%), transparent 32%, rgb(255 255 255 / 20%) 68%, transparent);
}

.filter-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 20px;
  border-bottom: 1px solid rgb(255 255 255 / 52%);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
  }
}

.filter-head :deep(.el-button) {
  height: 30px;
  padding: 0 10px;
  color: #2563eb;
  background: rgb(255 255 255 / 36%);
  border: 1px solid rgb(255 255 255 / 48%);
  border-radius: 11px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 62%);
  transition: background 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.filter-head :deep(.el-button:hover) {
  opacity: 0.9;
  background: rgb(255 255 255 / 58%);
  transform: translateY(-1px);
}

.filter-scroll {
  position: relative;
  z-index: 1;
  height: calc(100% - 64px);
}

.filter-form {
  padding: 4px 20px ;
}

.switch-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 6px;
  margin-bottom: 10px;

  color: #172033;
  background: rgb(255 255 255 / 76%);
  border: 1px solid rgb(203 213 225 / 72%);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgb(15 23 42 / 6%), inset 0 1px 0 rgb(255 255 255 / 85%);

  span {
    font-size: 13px;
    font-weight: 650;
  }
}

.slider-field {
  width: 100%;
  padding: 2px 16px 34px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid rgb(203 213 225 / 70%);
  border-radius: 14px;
  box-shadow: 0 10px 22px rgb(15 23 42 / 7%), inset 0 1px 0 rgb(255 255 255 / 86%);
}

.slider-value {
  margin-bottom: -4px;
  font-size: 12px;
  color: #1e293b;
}

:deep(.el-collapse) {
  border-top: 0;
  background: transparent;
}

:deep(.el-collapse-item__header) {
  padding: 0 20px;
  font-weight: 650;
  color: #1f2937;
  background: transparent;
  border-bottom-color: rgb(255 255 255 / 42%);
  transition: color 0.18s ease, opacity 0.18s ease;
}

:deep(.el-collapse-item__header:hover) {
  color: #2563eb;
  opacity: 0.92;
}

:deep(.el-collapse-item__wrap) {
  border-bottom-color: rgb(255 255 255 / 44%);
  background: transparent;
}

:deep(.el-segmented) {
  width: 100%;
  padding: 8px;
  border: 1px solid rgb(203 213 225 / 72%);
  border-radius: 13px;
  --el-segmented-item-selected-bg-color: #2563eb;
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-item-hover-bg-color: rgb(219 234 254 / 80%);
  --el-segmented-item-hover-color: #1d4ed8;
  box-shadow: 0 10px 24px rgb(15 23 42 / 8%), inset 0 1px 0 rgb(255 255 255 / 86%);
  backdrop-filter: blur(18px) saturate(150%);
}

:deep(.el-segmented__item) {
  border-radius: 10px;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

:deep(.el-segmented__item:hover) {
  opacity: 0.86;
}

:deep(.el-form-item__label) {

  font-size: 13px;
  font-weight: 650;
  color: #334155;
}

:deep(.el-input__wrapper) {
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(203 213 225 / 72%);
  border-radius: 12px;
  box-shadow: 0 10px 22px rgb(15 23 42 / 6%), inset 0 1px 0 rgb(255 255 255 / 86%);
  backdrop-filter: blur(18px);
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  background: rgb(255 255 255 / 62%);
  border-color: rgb(147 197 253 / 80%);
  box-shadow: 0 16px 30px rgb(37 99 235 / 8%), inset 0 1px 0 rgb(255 255 255 / 78%);
}

:deep(.el-switch__core),
:deep(.el-slider__runway) {
  background: rgb(226 232 240 / 92%);
  border: 1px solid rgb(203 213 225 / 82%);
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 8%);
  backdrop-filter: blur(12px);
}

:deep(.el-slider__bar) {
  background: linear-gradient(90deg, #60a5fa, #2563eb);
}

:deep(.el-slider__button) {
  background: linear-gradient(180deg, #ffffff, #dbeafe);
  border: 1px solid rgb(255 255 255 / 84%);
  box-shadow: 0 8px 18px rgb(37 99 235 / 18%), inset 0 1px 0 #ffffff;
}

:deep(.el-slider__marks-text) {
  margin-top: 12px;
  font-size: 11px;
  font-weight: 650;
  color: #475569;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background: #2563eb;
  border-color: #2563eb;
}
</style>
