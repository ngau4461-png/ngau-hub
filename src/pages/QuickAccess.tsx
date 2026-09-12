import React, { useState } from 'react'
import { Plus, Zap, Pin, PinOff } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { QuickLinkCard } from '@/components/features/QuickLinkCard'
import { QuickLinkForm } from '@/components/features/QuickLinkForm'
import type { QuickLink } from '@/types'

const QuickAccess: React.FC = () => {
  const { showToast } = useToast()
  const { getQuickLinks, togglePinQuickLink } = useData()

  const [formOpen, setFormOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null)

  const allLinks = getQuickLinks()
  const pinned = allLinks.filter((l) => l.pinned)
  const others = allLinks.filter((l) => !l.pinned)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7 text-amber-500" />
            Truy cập nhanh
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {allLinks.length} link - Truy cập nhanh các website thường dùng
          </p>
        </div>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditingLink(null)
            setFormOpen(true)
          }}
          fullWidth
          className="sm:w-auto"
        >
          Thêm link mới
        </Button>
      </div>

      {allLinks.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={LucideIcons.Zap}
              title="Chưa có link truy cập nhanh"
              description="Thêm các website thường dùng như Google Drive, Classroom, YouTube..."
              action={{
                label: 'Thêm link đầu tiên',
                onClick: () => setFormOpen(true),
                icon: <Plus className="h-4 w-4" />,
              }}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          {pinned.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pin className="h-5 w-5 text-primary-600 dark:text-primary-400 fill-primary-500" />
                  Đã ghim
                  <Badge variant="primary" size="sm">
                    {pinned.length}
                  </Badge>
                </CardTitle>
                <CardDescription>Các link được ưu tiên hiển thị đầu tiên</CardDescription>
              </CardHeader>
              <CardBody className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {pinned.map((l) => (
                    <QuickLinkCard
                      key={l.id}
                      link={l}
                      onEdit={() => {
                        setEditingLink(l)
                        setFormOpen(true)
                      }}
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {others.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PinOff className="h-5 w-5 text-gray-500" />
                  Tất cả link
                  <Badge size="sm">{others.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Click vào ghim 📌 để đưa link lên đầu danh sách
                </CardDescription>
              </CardHeader>
              <CardBody className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {others.map((l) => (
                    <QuickLinkCard
                      key={l.id}
                      link={l}
                      onEdit={() => {
                        setEditingLink(l)
                        setFormOpen(true)
                      }}
                    />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <QuickLinkForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingLink(null)
        }}
        link={editingLink}
      />
    </div>
  )
}

export default QuickAccess
