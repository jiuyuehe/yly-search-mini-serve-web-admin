import request from '@/config/axios'

export interface MetadataModelVO {
  id?: number
  name: string
  code?: string
  description?: string
  structure?: string
  structureResult?: string
  promptString?: string
  modelId?: number
  status?: number
  systemFlag?: number
  esIndexName?: string
  [key: string]: any
}

export interface MetadataTemplateCardVO {
  id?: number
  name: string
  code?: string
  category?: string
  scene?: string
  description?: string
  structure?: string
  promptString?: string
  fieldCount?: number
  systemFlag?: number
  esIndexName?: string
}

export interface MetadataModelCardVO extends MetadataTemplateCardVO {
  status?: number
  modelId?: number
  resultCount?: number
  indexExists?: boolean
  createTime?: string
  updateTime?: string
}

export interface MetadataMcpPublishVO {
  name: string
  canonicalName: string
  module: string
  description: string
  writable: boolean
  deleteTool: boolean
  mcpPublished: boolean
  publishStatus: string
  endpoint: string
  protocol: string
}

export interface MetadataGraphVO {
  scene: string
  demo?: boolean
  nodes: any[]
  edges: any[]
  sourceFiles?: any[]
  nodeCount?: number
  edgeCount?: number
}

export interface GraphSourceTraceVO {
  scene: string
  sourceFile?: any
  personProfiles?: any[]
  hasSourceFile?: boolean
  hasPersonProfile?: boolean
}

export const MetadataApi = {
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/ai/form/page', params })
  },
  getTemplateMarket: async (params?: any) => {
    return await request.get({ url: '/rag/ai/form/template-market', params })
  },
  generateAiDraftTemplate: async (requirement: string) => {
    return await request.post({ url: '/rag/ai/form/template-market/ai-draft', data: { requirement } })
  },
  getModelCards: async (params?: any) => {
    return await request.get({ url: '/rag/ai/form/model-cards', params })
  },
  getBuiltinModels: async () => {
    return await request.get({ url: '/rag/ai/form/builtin-models' })
  },
  loadBuiltinDemo: async (modelId: number) => {
    return await request.post({ url: '/rag/ai/form/builtin-models/load-demo', params: { modelId } })
  },
  getMcpPublishCatalog: async () => {
    return await request.get({ url: '/rag/ai/form/mcp-publish/catalog' })
  },
  getMetadataGraph: async (scene: string, params?: any) => {
    return await request.get({ url: `/rag/graph/metadata/${scene}`, params })
  },
  getGraphSourceTrace: async (params?: any) => {
    return await request.get({ url: '/rag/graph/metadata/source-trace', params })
  },
  get: async (id: number) => {
    return await request.get({ url: '/rag/ai/form/get', params: { id } })
  },
  create: async (data: MetadataModelVO) => {
    return await request.post({ url: '/rag/ai/form/create', data })
  },
  update: async (data: MetadataModelVO) => {
    return await request.post({ url: '/rag/ai/form/update', data })
  },
  delete: async (id: number) => {
    return await request.delete({ url: '/rag/ai/form/delete', params: { id } })
  },
  updatePrompt: async (data: { formId: number; promptString: string; modelId?: number }) => {
    return await request.post({ url: '/rag/ai/form/update-prompt', data })
  },
  pageFormData: async (params: any) => {
    return await request.get({ url: '/rag/ai/form/page-form-data', params })
  },
  saveFormData: async (formId: number, data: any) => {
    return await request.post({ url: '/rag/ai/form/save-form-data', params: { formId }, data })
  },
  updateFormData: async (formId: number, resultId: string, data: any) => {
    return await request.post({ url: '/rag/ai/form/update-form-data', params: { formId, resultId }, data })
  },
  deleteFormData: async (formId: number, resultId: string) => {
    return await request.delete({
      url: '/rag/ai/form/delete-form-data',
      params: { formId, resultId, allowDelete: true }
    })
  },
  extractFormNew: async (data: any) => {
    return await request.post({ url: '/rag/metadata/extraction/formnew', data })
  },
  generateEsIndex: async (formId: number) => {
    return await request.post({ url: '/rag/ai/form/generate-es-index', params: { formId } })
  }
}
