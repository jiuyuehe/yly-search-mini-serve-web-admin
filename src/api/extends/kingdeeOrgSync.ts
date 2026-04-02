import request from '@/config/axios'
import type { IntegrationConfigVO } from './integrationConfig'

// 金蝶云之家配置获取（本质上是一个特定 code 的系统配置）
export const getKingdeeConfig = () => {
  return request.get<IntegrationConfigVO>({
    url: '/extends/integration-config/get-by-code',
    params: { code: 'kingdee_cloud' }
  })
}

export const updateKingdeeConfig = (data: IntegrationConfigVO) => {
  return request.put<boolean>({ url: '/extends/integration-config/update', data })
}

// 组织架构同步：手动触发 / 重置 / 状态

export interface KingdeeOrgSyncResult {
  deptAddCount: number
  deptUpdateCount: number
  deptDeleteCount: number
  userAddCount: number
  userUpdateCount: number
  userDeleteCount: number
}

export type KingdeeOrgSyncStatus = 'WAIT' | 'SYNCING' | 'SUCCESS' | 'FAILED'

export interface KingdeeOrgSyncStatusVO {
  taskId: string
  token: string
  status: KingdeeOrgSyncStatus
  startTime?: string
  endTime?: string
  content?: string
  result?: KingdeeOrgSyncResult
  errorMsg?: string | null
}

export const startKingdeeOrgSync = (sourceType = 'kingdee_cloud') => {
  return request.post<boolean>({
    url: '/extends/org-sync/manual-trigger',
    data: { sourceType }
  })
}

export const resetKingdeeOrgSyncStatus = (sourceType = 'kingdee_cloud') => {
  return request.post<boolean>({
    url: '/extends/org-sync/reset-status',
    data: { sourceType }
  })
}

export const getKingdeeOrgSyncStatus = (sourceType = 'kingdee_cloud') => {
  return request.get<KingdeeOrgSyncStatusVO>({
    url: '/extends/org-sync/status',
    params: { sourceType }
  })
}
