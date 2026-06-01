import { getConfigKey as getInfraConfigKey } from '@/api/infra/config'

export function getConfigKey(key: string) {
  return getInfraConfigKey(key)
}
