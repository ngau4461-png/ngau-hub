import React, { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Star, Pencil, FolderOpen } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ResourceCard } from '@/components/features/ResourceCard'
import { ResourceForm } from '@/components/features/ResourceForm'
import type { Resource } from '@/types'

interface OutletCtx {
  globalSearch: string
}

const Favorites: React.FC = () => {
  const { globalSearch } = useOutletContext<OutletCtx>()
  const { showToast } = useToast()
  const { getFavoriteResources, searchResources } = useData()

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)

  const favorites = useMemo(() => {
    const finalQuery = globalSearch || query
    if (!finalQuery.trim()) return getFavoriteResources()
    return searchResources({ query: finalQuery, type: 'favorite' })
  }, [globalSearch, query, getFavoriteResources, searchResources])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight flex items-center gap-2">
          <Star className="h-7 w-7 text-amber-500 fill-amber-400" />
          Yêu thích
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {favorites.length} tài liệu bạn đã đánh dấu yêu thích ⭐
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <SearchBar value={query} onChange={setQuery} placeholder="Tìm trong yêu thích..." />
            </div>
            <Badge variant="warning" size="sm">
              {favorites.length} mục
            </Badge>
          </div>
        </CardHeader>
        <CardBody className="pt-2">
          {favorites.length === 0 ? (
            <EmptyState
              icon={LucideIcons.Star}
              title="Chưa có tài liệu yêu thích"
              description={
                query || globalSearch
                  ? 'Không tìm thấy kết quả trong danh sách yêu thích'
                  : 'Đánh dấu ⭐ các tài liệu hay để xem nhanh tại đây'
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {favorites.map((r: Resource) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  onEdit={() => {
                    setEditingResource(r)
                    setFormOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ResourceForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingResource(null)
        }}
        resource={editingResource}
      />
    </div>
  )
}

export default Favorites
