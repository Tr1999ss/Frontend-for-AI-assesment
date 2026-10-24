import { useCallback } from 'react'
import { api } from '../../api/client'
import type { CreateCategoryRequest, UpdateCategoryRequest } from '../../api/types'
import { useAuth } from '../../auth/AuthProvider'
import { useResource } from '../../lib/hooks'
import { invalidateActiveCategories } from './activeCategories'

/**
 * Category list plus admin mutations. Admins (kb-admin) see inactive categories too and can
 * edit; everyone else gets the public active list.
 */
export function useCategoryAdmin() {
  const { hasRole, status } = useAuth()
  const admin = status === 'authenticated' && hasRole('kb-admin')

  const resource = useResource(
    () => (admin ? api.admin.list(true) : api.activeCategories()),
    [admin],
  )

  const { reload } = resource
  const afterChange = useCallback(
    <T,>(result: T) => {
      reload()
      invalidateActiveCategories()
      return result
    },
    [reload],
  )

  const create = useCallback((body: CreateCategoryRequest) => api.admin.create(body).then(afterChange), [afterChange])
  const update = useCallback(
    (name: string, body: UpdateCategoryRequest) => api.admin.update(name, body).then(afterChange),
    [afterChange],
  )
  const remove = useCallback((name: string) => api.admin.remove(name).then(afterChange), [afterChange])

  return {
    categories: resource.data ?? [],
    admin,
    loading: resource.loading,
    error: resource.error,
    reload,
    create,
    update,
    remove,
  }
}
