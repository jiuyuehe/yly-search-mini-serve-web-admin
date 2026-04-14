import request from '@/config/axios'

// 第三方集成配置（integration 分组）
export interface IntegrationConfigVO {
  id: number
  configCode: string
  configName: string
  configGroup: string
  sortNumber?: number
  configContent: Record<string, any>
  configType: number
  configStatus: number
  createTime: string
  updateTime?: string
  creator?: string
  updater?: string
}

export interface IntegrationConfigPageReqVO {
  pageNo: number
  pageSize: number
  configCode?: string
  configName?: string
  configGroup?: string
  configType?: number
  configStatus?: number
}

export interface IntegrationConfigTemplateField {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  description?: string
  example?: any
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    enum?: any[]
    minLength?: number
    maxLength?: number
  }
  children?: IntegrationConfigTemplateField[]
}

export interface IntegrationConfigTemplate {
  code: string
  name: string
  description?: string
  group: string
  enable: boolean
  allowed: boolean
  fields: IntegrationConfigTemplateField[]
}

// 分页查询集成配置
export const getIntegrationConfigPage = (params: IntegrationConfigPageReqVO) => {
  return request.get<{ list: IntegrationConfigVO[]; total: number }>({
    url: '/extends/integration-config/page',
    params
  })
}

// 获取集成配置详情
export const getIntegrationConfig = (id: number) => {
  return request.get<IntegrationConfigVO>({ url: '/extends/integration-config/get', params: { id } })
}

// 根据代码获取配置
export const getIntegrationConfigByCode = (code: string) => {
  return request.get<IntegrationConfigVO>({
    url: '/extends/integration-config/get-by-code',
    params: { code }
  })
}

// 创建配置
export const createIntegrationConfig = (data: IntegrationConfigVO) => {
  return request.post<IntegrationConfigVO>({ url: '/extends/integration-config/create', data })
}

// 更新配置
export const updateIntegrationConfig = (data: IntegrationConfigVO) => {
  return request.put<boolean>({ url: '/extends/integration-config/update', data })
}

// 删除配置
export const deleteIntegrationConfig = (id: number) => {
  return request.delete<boolean>({
    url: '/extends/integration-config/delete',
    params: { id }
  })
}

// 导出列表（返回原始响应体，交由调用方处理下载）
export const exportIntegrationConfigList = (
  params: Omit<IntegrationConfigPageReqVO, 'pageNo' | 'pageSize'>
) => {
  return request.get<IntegrationConfigVO[]>({
    url: '/extends/integration-config/list',
    params
  })
}

// 获取配置模板列表
export interface IntegrationConfigTemplateListReq {
  group?: string
  filter?: string
  sort?: string
}

export const getIntegrationConfigTemplateList = (params: IntegrationConfigTemplateListReq) => {
  return request.get<IntegrationConfigTemplate[]>({
    url: '/extends/integration-config/templates',
    params
  })
}

// 获取模板详情
export const getIntegrationConfigTemplateDetail = (code: string) => {
  return request.get<IntegrationConfigTemplate>({
    url: `/extends/integration-config/templates/${code}`
  })
}

export interface IntegrationOrgSyncConfig {
  configCode: string
  configName: string
  configGroup?: string
  configStatus?: number
  configType?: number
  configContent?: Record<string, any>
  orgSync?: Record<string, any>
  [key: string]: any
}

export const getOrgSyncConfigList = () => {
  return request.get<IntegrationOrgSyncConfig[]>({
    url: '/extends/integration-config/org-sync/list'
  })
}


