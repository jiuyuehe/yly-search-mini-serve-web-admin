<template>
  <ContentWrap>
    <h2 class="mb-10px">组织架构同步</h2>
    <p class="text-gray-500 text-13px mb-15px">
      本页为扩展中心的“组织架构同步”聚合入口，当前已支持
      <strong>金蝶云之家组织架构同步</strong>，钉钉、企业微信等其他渠道后续可在此扩展。
    </p>
  </ContentWrap>

  <ContentWrap>
    <h3 class="mb-10px">组织架构同步配置与任务</h3>
    <el-skeleton v-if="orgSyncConfigsLoading" :rows="4" animated />
    <template v-else>
      <template v-if="filteredOrgSyncConfigs.length">
        <el-row :gutter="12" class="org-sync-layout">
          <el-col :xs="24" :md="8">
            <el-card shadow="never" class="org-sync-sidebar">
              <el-scrollbar height="480px">
                <div
                  v-for="item in filteredOrgSyncConfigs"
                  :key="item.configCode"
                  :class="[
                    'org-sync-config-item',
                    selectedConfigCode === item.configCode ? 'is-active' : ''
                  ]"
                  @click="selectConfig(item.configCode)"
                >
                  <div class="config-item__title">{{ item.configName || item.configCode }}</div>
                  <div class="config-item__meta">
                    <el-tag size="small" :type="item.configStatus === 0 ? 'success' : 'info'">
                      {{ item.configStatus === 0 ? '启用' : '停用' }}
                    </el-tag>
                    <el-tag
                      size="small"
                      :type="getSyncEnable(item) ? 'success' : 'info'"
                      class="ml-6px"
                    >
                      {{ getSyncEnable(item) ? '同步已开启' : '同步未开启' }}
                    </el-tag>
                  </div>
                  <div class="config-item__desc text-12px text-gray-500 mt-6px">
                    频率：{{ getSyncFreq(item) }} 小时
                  </div>
                </div>
              </el-scrollbar>
            </el-card>
          </el-col>
          <el-col :xs="24" :md="16">
            <template v-if="selectedConfig">
              <el-card shadow="never">
                <template #header>
                  <div class="flex items-center justify-between">
                    <span>{{ selectedConfig.configName || selectedConfig.configCode }}</span>
                  </div>
                </template>
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item label="配置名称">{{
                    selectedConfig.configName || '-'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="配置代码">{{
                    selectedConfig.configCode
                  }}</el-descriptions-item>
                  <el-descriptions-item label="配置状态">
                    <el-tag :type="selectedConfig.configStatus === 0 ? 'success' : 'info'">
                      {{ selectedConfig.configStatus === 0 ? '启用' : '停用' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="配置分组">
                    {{ selectedConfig.configGroup || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="同步启用">
                    <el-tag :type="getSyncEnable(selectedConfig) ? 'success' : 'info'">
                      {{ getSyncEnable(selectedConfig) ? '已启用' : '未启用' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="同步频率（小时）">
                    {{ getSyncFreq(selectedConfig) }}
                  </el-descriptions-item>
                </el-descriptions>
                <el-divider />
                <el-space wrap>
                  <el-button
                    type="primary"
                    :loading="syncingMap[selectedConfig.configCode]"
                    v-hasPermi="['extends:org-sync:start']"
                    @click="handleStartSync(selectedConfig.configCode)"
                  >
                    <Icon icon="ep:refresh-right" class="mr-5px" />
                    手动触发同步
                  </el-button>
                  <el-button type="default" @click="fetchStatus(selectedConfig.configCode)">
                    <Icon icon="ep:refresh" class="mr-5px" />
                    手动刷新状态
                  </el-button>
                </el-space>

                <el-divider />
                <h4 class="mb-10px">同步状态</h4>
                <el-descriptions v-if="selectedConfigStatus" :column="2" border size="small">
                  <el-descriptions-item label="任务ID">
                    {{ selectedConfigStatus?.taskId || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="任务状态">
                    <el-tag :type="getStatusTag(selectedConfigStatus?.status)">
                      {{ getStatusLabel(selectedConfigStatus?.status) }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="开始时间">
                    {{ formatTimestamp(selectedConfigStatus?.startTime) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="结束时间">
                    {{ formatTimestamp(selectedConfigStatus?.endTime) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="总时长">
                    {{
                      formatDuration(selectedConfigStatus?.startTime, selectedConfigStatus?.endTime)
                    }}
                  </el-descriptions-item>
                  <el-descriptions-item label="任务内容" :span="2">
                    {{ selectedConfigStatus?.content || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item
                    v-if="selectedConfigStatus?.errorMsg"
                    label="错误信息"
                    :span="2"
                  >
                    <span class="text-red-500">{{ selectedConfigStatus?.errorMsg }}</span>
                  </el-descriptions-item>
                </el-descriptions>
                <el-empty v-else description="暂无同步任务信息" />

                <template v-if="selectedConfigStatus?.result">
                  <el-divider />
                  <h4 class="mb-10px">同步结果</h4>
                  <el-descriptions :column="3" border size="small">
                    <el-descriptions-item label="新增部门数">
                      {{ selectedConfigStatus?.result?.deptAddCount ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="更新部门数">
                      {{ selectedConfigStatus?.result?.deptUpdateCount ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="删除部门数">
                      {{ selectedConfigStatus?.result?.deptDeleteCount ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="新增用户数">
                      {{ selectedConfigStatus?.result?.userAddCount ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="更新用户数">
                      {{ selectedConfigStatus?.result?.userUpdateCount ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="删除用户数">
                      {{ selectedConfigStatus?.result?.userDeleteCount ?? 0 }}
                    </el-descriptions-item>
                  </el-descriptions>
                </template>
              </el-card>
            </template>
            <el-empty v-else description="请选择左侧的组织架构同步配置" />
          </el-col>
        </el-row>
      </template>
      <el-empty v-else description="暂无组织架构同步配置">
        <el-button type="primary" @click="goToIntegrationConfig">前往第三方集成配置</el-button>
      </el-empty>
    </template>
  </ContentWrap>

  <ContentWrap class="mt-16px">
    <h3 class="mb-10px">其他渠道组织架构同步（待开发）</h3>
    <el-alert
      type="info"
      :closable="false"
      class="mb-12px"
      description="钉钉、企业微信等渠道的组织架构同步功能正在规划中，上线后可在此处统一管理。"
    />
    <el-row :gutter="12">
      <el-col v-for="channel in pendingOrgSyncChannels" :key="channel" :xs="24" :md="12">
        <el-card shadow="never">
          <div class="flex items-center justify-between">
            <span class="font-500">{{ channel }}</span>
            <el-tag type="info" effect="plain">待开发</el-tag>
          </div>
          <p class="text-13px text-gray-500 mt-8px">
            我们将在后续版本中提供 {{ channel }} 的组织架构同步配置与任务管理能力，敬请期待。
          </p>
        </el-card>
      </el-col>
    </el-row>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { Icon } from '@/components/Icon'
import * as KingdeeApi from '@/api/extends/kingdeeOrgSync'
import * as IntegrationConfigApi from '@/api/extends/integrationConfig'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'ExtOrgSync' })

const message = useMessage()
const router = useRouter()

const orgSyncConfigsLoading = ref(false)
const orgSyncConfigs = ref<IntegrationConfigApi.IntegrationOrgSyncConfig[]>([])
const filteredOrgSyncConfigs = computed(() => orgSyncConfigs.value)
const selectedConfigCode = ref('')
const selectedConfig = computed(() =>
  filteredOrgSyncConfigs.value.find((item) => item.configCode === selectedConfigCode.value)
)
const selectedConfigStatus = computed(() =>
  selectedConfigCode.value ? statusMap[selectedConfigCode.value] : null
)
const pendingOrgSyncChannels = ['钉钉组织架构同步', '企业微信组织架构同步']

const statusMap = reactive<Record<string, KingdeeApi.KingdeeOrgSyncStatusVO | null>>({})
const syncingMap = reactive<Record<string, boolean>>({})
const statusTimers: Record<string, number | undefined> = {}
const POLLING_INTERVAL = 2000
const SUCCESS_STATUS_TEXTS = ['SUCCESS', '同步成功']

const selectConfig = (code: string) => {
  selectedConfigCode.value = code
}

const getOrgSyncObject = (item: IntegrationConfigApi.IntegrationOrgSyncConfig) => {
  return (
    item.orgSync ||
    (item.configContent && (item.configContent as any).orgSync) ||
    (item.configContent && (item.configContent as any).OrgSync) ||
    null
  )
}

const getSyncEnable = (item: IntegrationConfigApi.IntegrationOrgSyncConfig) => {
  const orgSync = getOrgSyncObject(item)
  return Boolean(orgSync?.enable ?? orgSync?.syncEnable ?? orgSync?.orgSyncEnable ?? false)
}

const getSyncFreq = (item: IntegrationConfigApi.IntegrationOrgSyncConfig) => {
  const orgSync = getOrgSyncObject(item)
  const freq = orgSync?.freq ?? orgSync?.syncFreq ?? orgSync?.orgSyncFreq
  return freq ?? '-'
}

const goToIntegrationConfig = () => {
  router.push('/extends/integration-config')
}

const parseTimestamp = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) return null
  return num < 1e12 ? num * 1000 : num
}

const formatTimestamp = (value?: string | number | null) => {
  const ms = parseTimestamp(value)
  if (!ms) return '-'
  return formatDate(new Date(ms), 'YYYY-MM-DD HH:mm:ss')
}

const formatDuration = (start?: string | number | null, end?: string | number | null) => {
  const startMs = parseTimestamp(start)
  const endMs = parseTimestamp(end)
  if (!startMs || !endMs || endMs <= startMs) return '-'
  const diff = endMs - startMs
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${pad(hours)} 时 ${pad(minutes)} 分 ${pad(seconds)} 秒`
}

const loadOrgSyncConfigs = async () => {
  orgSyncConfigsLoading.value = true
  try {
    const data = await IntegrationConfigApi.getOrgSyncConfigList()
    orgSyncConfigs.value = data
    if (data.length) {
      if (!data.find((item) => item.configCode === selectedConfigCode.value)) {
        selectedConfigCode.value = data[0].configCode
      }
    } else {
      selectedConfigCode.value = ''
    }
    if (!data.length) {
      message.warning('未获取到启用状态的组织架构同步配置，请先前往第三方集成配置添加。')
    }
  } finally {
    orgSyncConfigsLoading.value = false
  }
}

const isSuccessStatus = (status?: string) => {
  if (!status) return false
  return SUCCESS_STATUS_TEXTS.includes(status as string)
}

const stopPollingTimer = (sourceType: string) => {
  if (statusTimers[sourceType]) {
    window.clearInterval(statusTimers[sourceType])
    statusTimers[sourceType] = undefined
  }
}

const ensurePollingTimer = (sourceType: string) => {
  if (statusTimers[sourceType]) return
  statusTimers[sourceType] = window.setInterval(
    () => fetchStatus(sourceType, { fromTimer: true }),
    POLLING_INTERVAL
  )
}

const fetchStatus = async (
  sourceType: string,
  options: { autoPoll?: boolean; fromTimer?: boolean } = {}
) => {
  const { autoPoll = false, fromTimer = false } = options
  try {
    statusMap[sourceType] = await KingdeeApi.getKingdeeOrgSyncStatus(sourceType)
    const currentStatus = statusMap[sourceType]?.status as string | undefined
    if (isSuccessStatus(currentStatus)) {
      stopPollingTimer(sourceType)
    } else if (autoPoll || currentStatus === 'SYNCING') {
      ensurePollingTimer(sourceType)
    }
  } catch (e) {
    console.error(e)
    if (fromTimer) {
      stopPollingTimer(sourceType)
    }
  }
}

watch(filteredOrgSyncConfigs, (list) => {
  if (!list.length) {
    selectedConfigCode.value = ''
    return
  }
  if (!list.some((item) => item.configCode === selectedConfigCode.value)) {
    selectedConfigCode.value = list[0].configCode
  }
})

watch(
  () => selectedConfigCode.value,
  (code) => {
    if (code && !statusMap[code]) {
      fetchStatus(code)
    }
  }
)

const handleManualTrigger = async (sourceType: string) => {
  try {
    await message.confirm('确定要手动同步吗？', '提示')
    syncingMap[sourceType] = true
    await KingdeeApi.startKingdeeOrgSync(sourceType)
    await fetchStatus(sourceType, { autoPoll: true })
  } catch {
    // ignore
  } finally {
    syncingMap[sourceType] = false
  }
}

const handleStartSync = (sourceType: string) => handleManualTrigger(sourceType)
const getStatusLabel = (status?: KingdeeApi.KingdeeOrgSyncStatus) => {
  switch (status) {
    case 'WAIT':
      return '等待中'
    case 'SYNCING':
      return '同步中'
    case 'SUCCESS':
      return '同步成功'
    case 'FAILED':
      return '同步失败'
    default:
      return '-'
  }
}

const getStatusTag = (
  status?: KingdeeApi.KingdeeOrgSyncStatus
): 'info' | 'warning' | 'success' | 'danger' => {
  switch (status) {
    case 'WAIT':
      return 'info'
    case 'SYNCING':
      return 'warning'
    case 'SUCCESS':
      return 'success'
    case 'FAILED':
      return 'danger'
    default:
      return 'info'
  }
}

const clearAllTimers = () => {
  Object.keys(statusTimers).forEach((key) => {
    if (statusTimers[key]) {
      window.clearInterval(statusTimers[key])
      statusTimers[key] = undefined
    }
  })
}

onMounted(async () => {
  await loadOrgSyncConfigs()
  if (orgSyncConfigs.value.length) {
    await Promise.all(orgSyncConfigs.value.map((item) => fetchStatus(item.configCode)))
  }
})

onBeforeUnmount(() => {
  clearAllTimers()
})
</script>

<style scoped>
.org-sync-layout {
  min-height: 480px;
}

.org-sync-sidebar {
  height: 100%;
}

.org-sync-config-item {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.org-sync-config-item.is-active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.org-sync-config-item:hover {
  border-color: var(--el-color-primary);
}

.config-item__title {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.config-item__meta {
  margin-top: 6px;
}
</style>
