import request from '@/config/axios'

export interface DefaultModelTypeVO {
  code: string
  name: string
  modelType: number
}

export interface TaskModelMappingVO {
  taskCode: string
  taskName: string
  modelTypeCode: string
  modelType: number
}

export interface DefaultModelConfigItemVO {
  id?: number
  scopeType: string
  scopeCode: string
  modelType: number
  modelTypeCode?: string
  modelTypeName?: string
  modelId?: number
  modelName?: string
  modelCode?: string
  configName?: string
  endpointUrl?: string
  invokeMode: string
  apiKey?: string
  headersJson?: string
  requestTemplateJson?: string
  responseMappingJson?: string
  timeoutMs?: number
  status: number
  remark?: string
  initialized?: boolean
}

export interface ModelCandidateVO {
  id: number
  name: string
  model: string
  platform?: string
  type: number
}

export interface DefaultModelConfigPageInitVO {
  modelTypes: DefaultModelTypeVO[]
  tasks: TaskModelMappingVO[]
  typeDefaults: DefaultModelConfigItemVO[]
  taskOverrides: DefaultModelConfigItemVO[]
  modelCandidates: ModelCandidateVO[]
}

export interface DefaultModelConfigSaveReqVO {
  id?: number
  scopeType: string
  scopeCode: string
  modelType: number
  modelId?: number
  configName?: string
  endpointUrl?: string
  invokeMode: string
  apiKey?: string
  headersJson?: string
  requestTemplateJson?: string
  responseMappingJson?: string
  timeoutMs?: number
  status: number
  remark?: string
}

export interface DefaultModelConfigTestReqVO {
  modelId?: number
  endpointUrl?: string
  invokeMode: string
  apiKey?: string
}

export interface DefaultModelConfigTestRespVO {
  success: boolean
  message: string
  statusCode: number
}

export interface ResolvePreviewRespVO {
  resolvedSource: string
  scopeType: string
  scopeCode: string
  modelId?: number
  modelName?: string
  modelCode?: string
  endpointUrl?: string
  invokeMode?: string
  remark?: string
}

export const RagAppsApi = {
  getPageInit: async () => {
    return await request.get<DefaultModelConfigPageInitVO>({
      url: '/rag/default-model-config/page-init'
    })
  },

  saveTypeDefault: async (data: DefaultModelConfigSaveReqVO) => {
    return await request.put<boolean>({
      url: '/rag/default-model-config/save-type-default',
      data
    })
  },

  saveTaskOverride: async (data: DefaultModelConfigSaveReqVO) => {
    return await request.put<boolean>({
      url: '/rag/default-model-config/save-task-override',
      data
    })
  },

  deleteTaskOverride: async (taskCode: string) => {
    return await request.delete<boolean>({
      url: `/rag/default-model-config/delete-task-override?taskCode=${taskCode}`
    })
  },

  testConfig: async (data: DefaultModelConfigTestReqVO) => {
    return await request.post<DefaultModelConfigTestRespVO>({
      url: '/rag/default-model-config/test',
      data
    })
  },

  resolvePreview: async (taskCode: string) => {
    return await request.get<ResolvePreviewRespVO>({
      url: `/rag/default-model-config/resolve-preview?taskCode=${taskCode}`
    })
  }
}
