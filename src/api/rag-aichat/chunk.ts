import request from '@/config/axios'

function toJsonFormData(obj: Record<string, any>) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(obj))
  return formData
}

export function addChunk(datasetId: string, documentId: string, data: any) {
  return request.post({
    url: '/ragflow/chunk/add',
    data: toJsonFormData(data),
    params: { dataset_id: datasetId, document_id: documentId },
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateChunk(
  datasetId: string,
  documentId: string,
  chunkId: string,
  data: any
) {
  return request.post({
    url: '/ragflow/chunk/update',
    data: toJsonFormData(data),
    params: { dataset_id: datasetId, document_id: documentId, chunk_id: chunkId },
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function listChunks(
  datasetId: string,
  documentId: string,
  keywords?: string,
  page?: number,
  page_size?: number,
  chunk_id?: string
) {
  return request.get({
    url: '/ragflow/chunk/list',
    params: { dataset_id: datasetId, document_id: documentId, keywords, page, page_size, id: chunk_id }
  })
}

export function retrievalChunks(json: string) {
  return request.post({
    url: '/ragflow/chunk/retrieval',
    data: json,
    headers: { 'Content-Type': 'application/json' }
  })
}

export function deleteChunks(
  datasetId: string,
  documentId: string,
  chunkIds: string
) {
  return request.post({
    url: '/ragflow/chunk/delete',
    params: { dataset_id: datasetId, document_id: documentId, chunk_ids: chunkIds }
  })
}
