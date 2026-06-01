import request from '@/config/axios'

export interface KnowledgeBaseVO {
  id: string
  name: string
  description?: string
  dataset_name?: string
  chunk_count?: number
  document_count?: number
  [key: string]: any
}

export function getKnowledgeBaseList(params: {
  dataset_name?: string
  dataset_id?: string
}) {
  return request.get({
    url: '/ragflow/datasets/listAllView',
    params
  })
}

export function getKnowledgeBaseDetail(datasetId: string) {
  return request.get({
    url: `/ragflow/datasets/get/${datasetId}`,
  })
}

export function getKnowledgeBaseListByMe(params: {
  dataset_name?: string
  dataset_id?: string
}) {
  return request.get({
    url: '/ragflow/datasets/listByMe',
    params
  })
}

export function getKnowledgeBaseListInvite(params: {
  dataset_name?: string
  dataset_id?: string
}) {
  return request.get({
    url: '/ragflow/datasets/listInvite',
    params
  })
}

export function createKnowledgeBase(data: Record<string, any>) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(data))
  return request.post({
    url: '/ragflow/datasets/create',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateKnowledgeBase(
  datasetId: string,
  data: Record<string, any>
) {
  const formData = new FormData()
  formData.append('json', JSON.stringify(data))
  return request.post({
    url: `/ragflow/datasets/update/${datasetId}`,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function deleteKnowledgeBase(datasetId: string) {
  return request.post({
    url: '/ragflow/datasets/delete',
    params: { datasetIds: datasetId }
  })
}

export function getMemberList(datasetId: string) {
  return request.get({
    url: `/ragflow/datasets/listMember/${datasetId}`,
  })
}

export function addMember(datasetId: string, users: any[]) {
  return request.post({
    url: `/ragflow/datasets/addMember/${datasetId}`,
    data: users
  })
}

export function deleteMember(datasetId: string, userIds: string) {
  return request.post({
    url: `/ragflow/datasets/deleteMember/${datasetId}`,
    params: { userIds }
  })
}

export function getDeptList(params: { di?: number; key?: string }) {
  return request.get({
    url: '/ragflow/datasets/listDept',
    params
  })
}

export function getUserList(params: { di?: number; key?: string }) {
  return request.get({
    url: '/ragflow/datasets/listUser',
    params
  })
}
