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

export const MetadataApi = {
  getPage: async (params: any) => {
    return await request.get({ url: '/rag/ai/form/page', params })
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
  extractFormNew: async (data: any) => {
    return await request.post({ url: '/rag/metadata/extraction/formnew', data })
  },
  generateEsIndex: async (formId: number) => {
    return await request.post({ url: '/rag/ai/form/generate-es-index', params: { formId } })
  }
}
