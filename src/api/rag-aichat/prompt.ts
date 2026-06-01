import request from '@/config/axios'

export function createPrompt(prompt: string) {
  return request.post({
    url: '/ragflow/prompt/create',
    params: { prompt }
  })
}

export function updatePrompt(id: number, prompt: string) {
  return request.post({
    url: '/ragflow/prompt/update',
    params: { id, prompt }
  })
}

export function listPrompt(params: any) {
  return request.get({ url: '/ragflow/prompt/list', params })
}

export function deletePrompt(id: number) {
  return request.post({
    url: '/ragflow/prompt/delete',
    params: { id }
  })
}
