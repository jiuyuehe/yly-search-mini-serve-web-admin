import request from '@/config/axios'

export interface GovernanceRuleVO {
  id?: number
  name?: string
  prompt?: string
  dataScope?: Record<string, any>
  targetModelId?: number
  targetModelName?: string
  outputSchema?: Record<string, any>
  allowedTools?: string[]
  allowedMcps?: string[]
  allowDelete?: boolean
  dryRunDefault?: boolean
  enabled?: boolean
}

export interface GovernanceTaskVO {
  id?: number
  ruleId?: number
  name?: string
  esId?: string
  toolName?: string
  payload?: Record<string, any>
  dryRun?: boolean
  cronExpression?: string
  infraJobId?: number
  status?: string
}

export interface GovernanceExecutionReqVO {
  ruleId?: number
  taskId?: number
  esId?: string
  toolName?: string
  payload?: Record<string, any>
  dryRun?: boolean
}

export interface GovernanceToolCatalogVO {
  name: string
  canonicalName: string
  module: string
  description: string
  writable: boolean
  deleteTool: boolean
}

export const GovernanceApi = {
  saveRule: (data: GovernanceRuleVO) => request.post({ url: '/rag/governance/rule/save', data }),
  getRule: (id: number) => request.get({ url: `/rag/governance/rule/${id}` }),
  listRules: () => request.get({ url: '/rag/governance/rule/list' }),
  createTask: (data: GovernanceTaskVO) => request.post({ url: '/rag/governance/task/create', data }),
  getTask: (id: number) => request.get({ url: `/rag/governance/task/${id}` }),
  listTasks: () => request.get({ url: '/rag/governance/task/list' }),
  triggerTask: (id: number) => request.post({ url: '/rag/governance/task/trigger', params: { id } }),
  executeTask: (data: GovernanceExecutionReqVO) => request.post({ url: '/rag/governance/task/execute', data }),
  testTask: (data: GovernanceExecutionReqVO) => request.post({ url: '/rag/governance/task/test', data }),
  listTaskLogs: (taskId?: number) => request.get({ url: '/rag/governance/task/logs', params: { taskId } }),
  listTaskResults: (taskId?: number) => request.get({ url: '/rag/governance/task/results', params: { taskId } }),
  listToolLogs: (taskId?: number) => request.get({ url: '/rag/governance/tool/logs', params: { taskId } }),
  listToolCatalog: () => request.get({ url: '/rag/governance/tool/catalog' }),
  dashboardBase: () => request.get({ url: '/rag/governance/dashboard/base' }),
  dashboardAiTask: () => request.get({ url: '/rag/governance/dashboard/ai-task' }),
  dashboardScheduleTask: () => request.get({ url: '/rag/governance/dashboard/schedule-task' }),
  dashboardSearch: () => request.get({ url: '/rag/governance/dashboard/search' }),
  dashboardTaxonomy: () => request.get({ url: '/rag/governance/dashboard/taxonomy' }),
  dashboardMetadataFill: () => request.get({ url: '/rag/governance/dashboard/metadata-fill' })
}
