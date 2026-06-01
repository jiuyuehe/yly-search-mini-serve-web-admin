import request from '@/config/axios'

export function uploadDocument(datasetId: string, file: File) {
  const formData = new FormData()
  formData.append('dataset_id', datasetId)
  formData.append('file', file)
  return request.post({
    url: '/ragflow/documents/upload',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateDocument(datasetId: string, documentId: string, json: any) {
  return request.post({
    url: '/ragflow/documents/update_document',
    params: {
      dataset_id: datasetId,
      document_id: documentId,
      json: JSON.stringify(json)
    }
  })
}

export function listDocuments(params: Record<string, any>) {
  return request.get({
    url: '/ragflow/documents/list',
    params
  })
}

export function downloadDocument(datasetId: string, documentId: string) {
  return request.get({
    url: '/ragflow/documents/download',
    params: { dataset_id: datasetId, document_id: documentId },
    responseType: 'blob'
  })
}

export function downloadDocumentView(
  datasetId: string,
  documentId: string,
  fileName: string
) {
  return request.get({
    url: `/ragflow/documents/downloadView/${datasetId}/${documentId}/${encodeURIComponent(
      fileName
    )}`,
    responseType: 'blob'
  })
}

export function parseDocuments(datasetId: string, documentIds: string) {
  return request.post({
    url: '/ragflow/documents/parse',
    params: { dataset_id: datasetId, document_ids: documentIds }
  })
}

export function stopParsingDocuments(datasetId: string, documentIds: string) {
  return request.post({
    url: '/ragflow/documents/stop_parsing',
    params: { dataset_id: datasetId, document_ids: documentIds }
  })
}

export function deleteDocuments(datasetId: string, documentIds: string) {
  return request.post({
    url: '/ragflow/documents/delete',
    params: { dataset_id: datasetId, document_ids: documentIds }
  })
}

export function uploadToRagflow(datasetId: string, fileIds: string) {
  return request.post({
    url: `/ragflow/documents/upload_to_ragflow/${datasetId}`,
    params: { fileIds }
  })
}

export function listYlyFiles(fc: string = 'personal', pt: number = 1, pi?: number) {
  return request.get({
    url: '/ragflow/documents/yly_file_list',
    params: { fc, pt, pi }
  })
}

export function getRagflowDomain() {
  return request.get({
    url: '/ragflow/documents/get_ragflow_domain',
  })
}
