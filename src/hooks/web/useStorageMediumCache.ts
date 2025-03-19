import { StorageMediumApi } from '@/api/rag/storagemedium'
import { ref } from 'vue'

export function useStorageMediumCache() {
  const storageNameCache = ref<Map<number, string>>(new Map())
  const storageTypeCache = ref<Map<string, number>>(new Map())
  const storageList = ref<any[]>([])
  let isLoading = false
  let loadPromise: Promise<void> | null = null

  async function ensureStorageData() {
    if (storageNameCache.value.size > 0) return
    
    if (isLoading) {
      return loadPromise 
    }

    isLoading = true
    loadPromise = StorageMediumApi.listStorageMediumNames().then(list => {
      storageList.value = list 
      list.forEach(item => {
        storageNameCache.value.set(item.id, item.mediumName)
        storageTypeCache.value.set(item.id, item.mediumType)
      })
    }).finally(() => {
      isLoading = false 
      loadPromise = null
    })

    return loadPromise
  }

  ensureStorageData()

  function getStorageName(id: number) {
    return storageNameCache.value.get(id) || id.toString()
  }

  function getStorageType(id: string) {
    return storageTypeCache.value.get(id) || 0
  }

  function getStorageList() {
    if (storageList.value.length === 0) {
      ensureStorageData()
    }
    return Promise.resolve(storageList.value)
  }

  return {
    ensureStorageData,
    getStorageName,
    getStorageType,
    getStorageList
  }
}