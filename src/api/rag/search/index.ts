import request from '@/config/axios'
import { service } from '@/config/axios/service'

export type SearchType = 'keyword' | 'vector' | 'hybrid' | 'image'

export interface SearchParam {
  keyword?: string
  searchType?: SearchType
  /** 兼容后端旧图片 OCR 参数，新 UI 不再展示。 */
  searchMode?: 'none' | 'visual' | 'text'
  imageFile?: File | null
  precisionMode?: number
  scoreThreshold?: number
  docType?: string
  extname?: string
  folder?: boolean
  hasHistory?: boolean
  timeDis?: string
  startDate?: string
  endDate?: string
  fileSize?: string
  minSize?: number
  maxSize?: number
  createrId?: number | string
  userId?: number | string
  groupId?: number | string
  shareId?: number | string
  fileAiTag?: string
  fileSysTag?: string
  tag?: string
  includeEnrich?: boolean
  offset?: number
  limit?: number
  fileCategory?: 'nas'
}

export interface CommonFile {
  esId?: string
  nasId?: string
  subPath?: string
  fileName?: string
  filePath?: string
  fileSize?: number
  folder?: boolean
  docType?: string
  fileExt?: string
  fileCategory?: string
  fileContents?: string
  fileSummary?: string
  enrichSummary?: string
  fileAiTag?: string
  fileSysTag?: string
  tags?: string[]
  updateTime?: string
  createTime?: string
  lastModified?: number
  score?: number
  matchSource?: string
}

export interface SearchResult {
  total: number
  types?: Record<string, number>
  filters?: Record<string, FilterResult[]>
  fileList: CommonFile[]
  searchTime?: number
}

export interface FilterResult {
  key: string
  count: number
}

export interface FilePreviewMeta {
  esId: string
  fileName: string
  fileExt?: string
  mimeType?: string
  previewType: 'text' | 'image' | 'pdf' | 'video' | 'unsupported'
  fileSize?: number
  filePath?: string
  downloadable?: boolean
}

export interface NasFileEntry {
  fileName: string
  filePath: string
  parentPath?: string
  folder?: boolean
  fileSize?: number
  updateTime?: string
  permissions?: number
  canSee?: boolean
}

export interface NasFileViewResp {
  url?: string
  [key: string]: unknown
}

const append = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null || value === '') return
  formData.append(key, value instanceof File ? value : String(value))
}

// SearchParam 仍按后端的 multipart/form-data 接收；这里集中处理布尔值、数值和固定 fileCategory。
export const buildSearchFormData = (params: SearchParam) => {
  const formData = new FormData()
  const payload: SearchParam = {
    ...params,
    fileCategory: 'nas'
  }
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'imageFile') {
      if (value instanceof File) formData.append('file', value)
      return
    }
    append(formData, key, value)
  })
  return formData
}

export const searchDocuments = (params: SearchParam) => {
  return request.post<SearchResult>({
    url: '/rag/documents/search',
    headersType: 'multipart/form-data',
    data: buildSearchFormData(params)
  })
}

export const getPreviewMeta = (esId: string) => {
  return request.get<FilePreviewMeta>({
    url: '/rag/documents/preview/meta',
    params: { esId }
  })
}

export const getPreviewBlob = (esId: string) => {
  return request.download<Blob>({
    url: '/rag/documents/preview/content',
    params: { esId }
  })
}

export const downloadFileBlob = (esId: string) => {
  return request.download<Blob>({
    url: '/rag/documents/download',
    params: { esId }
  })
}

export const batchDownloadBlob = (esIds: string[]) => {
  return service({
    url: '/rag/documents/download/batch',
    method: 'POST',
    data: { esIds },
    responseType: 'blob'
  }) as unknown as Promise<Blob>
}

export const listNasFolderChildren = (nasId: string | number, parentNasPath: string) => {
  return request.get<NasFileEntry[]>({
    url: '/apps/nas/file/list',
    params: { nasId, parentNasPath }
  })
}

export const getNasFileViewUrl = (nasId: string | number, nasFilePath: string) => {
  return request.get<NasFileViewResp>({
    url: '/apps/nas/file/view',
    params: { nasId, nasFilePath }
  })
}

export const downloadNasFileBlob = (nasId: string | number, nasFilePath: string) => {
  return request.download<Blob>({
    url: '/apps/nas/file/download',
    params: { nasId, nasFilePath }
  })
}
