import React, { useState, useMemo } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  Plus,
  ChevronRight,
  BookOpen,
  Star,
  Zap,
  ArrowRight,
  GraduationCap,
  Link2,
  Bot,
  BookText,
  Brain,
  Palette,
  FileText,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'

import { useData } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { StatsCard } from '@/components/features/StatsCard'
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardDescription,
} from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/ui/SearchBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { ResourceCard } from '@/components/features/ResourceCard'
import { ResourceForm } from '@/components/features/ResourceForm'
import { QuickLinkCard } from '@/components/features/QuickLinkCard'
import { QuickLinkForm } from '@/components/features/QuickLinkForm'
import { Badge } from '@/components/ui/Badge'
import { hexToRgba } from '@/utils/helpers'
import type { Subject } from '@/types'

interface OutletCtx {
  globalSearch: string
}

const studyingTools = [
  { name: 'ChatGPT', icon: 'Bot', color: '#10A37F' },
  { name: 'Khan Academy', icon: 'GraduationCap', color: '#14BF96' },
  { name: 'Wikipedia', icon: 'BookText', color: '#6366f1' },
  { name: 'Quizlet', icon: 'Brain', color: '#4255FF' },
  { name: 'Canva', icon: 'Palette', color: '#00C4CC' },
  { name: 'Notion', icon: 'FileText', color: '#111827' },
]

const Dashboard: React.FC = () => {
  const { globalSearch } = useOutletContext<OutletCtx>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const {
    getStats,
    getSubjects,
    getRecentResources,
    getQuickLinks,
    searchResources,
    getFavoriteResources,
    getProfile,
  } = useData()

  const [resourceFormOpen, setResourceFormOpen] = useState(false)
  const [quickLinkFormOpen, setQuickLinkFormOpen] = useState(false)

  /*
   * FIX TÌM KIẾM
   *
   * globalSearch từ MainLayout có thể không có setter.
   * Vì vậy Dashboard dùng state riêng để SearchBar có thể nhập
   * và tìm kiếm trực tiếp trên trang này.
   */
  const [searchQuery, setSearchQuery] = useState(globalSearch || '')

  const stats = getStats()
  const subjects = getSubjects().slice(0, 6)
  const recentResources = getRecentResources(4)
  const quickLinks = getQuickLinks()
  const favoriteResources = getFavoriteResources().slice(0, 4)

  // =========================
  // XU CỦA NGƯỜI DÙNG
  // =========================
  const profile = getProfile()
  const coins = profile?.coins ?? 0

  /*
   * Tự động đồng bộ nếu globalSearch từ layout thay đổi.
   */
  React.useEffect(() => {
    setSearchQuery(globalSearch || '')
  }, [globalSearch])

  /*
   * TÌM KIẾM TÀI LIỆU
   */
  const filteredResources = useMemo(() => {
    const query = searchQuery.trim()

    if (!query) return null

    return searchResources({
      query,
    })
  }, [searchQuery, searchResources])

  /*
   * Xóa nội dung tìm kiếm
   */
  const clearSearch = () => {
    setSearchQuery('')
  }

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* =========================
          HERO
      ========================== */}
      <div className="rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-primary-600 via-primary-600 to-primary-800 text-white shadow-soft-lg relative overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_50%)] opacity-60" />

        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl opacity-30" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">

          <div className="min-w-0 flex-1">

            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-4">
              <span>✨</span>
              <span>Dữ liệu được lưu trữ an toàn trên máy bạn</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
              Xin chào 👋 Chào buổi{' '}
              {new Date().getHours() < 12
                ? 'sáng'
                : new Date().getHours() < 18
                  ? 'chiều'
                  : 'tối'}
              !
            </h1>

            <p className="text-white/80 text-sm sm:text-base max-w-xl">
              Quản lý toàn bộ link học tập, tài liệu, đề thi và công cụ học tập
              trong một nơi. Bắt đầu nào!
            </p>

          </div>

          <div className="w-full lg:w-80 flex-shrink-0">

            {/* =========================
                XU
            ========================== */}
            <div className="mb-3 flex items-center justify-between rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3">

              <div className="flex items-center gap-2">
                <span className="text-xl">🪙</span>

                <span className="text-sm font-medium">
                  Xu của bạn
                </span>
              </div>

              <span className="text-lg font-bold">
                {coins.toLocaleString('vi-VN')}
              </span>

            </div>

            {/* =========================
                SEARCH
            ========================== */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm tài liệu..."
            />

            <div className="mt-3 flex flex-wrap gap-2">

              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setResourceFormOpen(true)}
                className="!bg-white/15 !text-white !border !border-white/20 hover:!bg-white/25 backdrop-blur-sm"
              >
                Thêm tài liệu
              </Button>

              <Button
                size="sm"
                variant="secondary"
                leftIcon={<BookOpen className="h-4 w-4" />}
                onClick={() => navigate('/subjects')}
                className="!bg-white/15 !text-white !border !border-white/20 hover:!bg-white/25 backdrop-blur-sm"
              >
                Quản lý môn học
              </Button>

            </div>
          </div>

        </div>
      </div>

      {/* =========================
          SEARCH RESULTS
      ========================== */}
      {filteredResources !== null && (
        <Card>

          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">

              <Link2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />

              <span>
                Kết quả tìm kiếm: "{searchQuery}"
              </span>

              <Badge variant="primary" size="sm">
                {filteredResources.length} kết quả
              </Badge>

              {searchQuery.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="ml-auto"
                >
                  Xóa tìm kiếm
                </Button>
              )}

            </CardTitle>
          </CardHeader>

          <CardBody>

            {filteredResources.length === 0 ? (

              <EmptyState
                icon={LucideIcons.Search}
                title="Không tìm thấy kết quả"
                description={`Không tìm thấy tài liệu nào phù hợp với từ khóa "${searchQuery}"`}
                action={{
                  label: 'Xóa tìm kiếm',
                  onClick: clearSearch,
                }}
              />

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {filteredResources
                  .slice(0, 8)
                  .map((r: typeof filteredResources[0]) => (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                    />
                  ))}

              </div>

            )}

          </CardBody>

        </Card>
      )}

      {/* =========================
          NORMAL DASHBOARD
      ========================== */}
      {filteredResources === null && (
        <>

          {/* =========================
              STATS
          ========================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

            {/* Tổng môn học */}
            <Link
              to="/subjects"
              className="block group rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              title="Xem tất cả môn học"
            >
              <StatsCard
                icon="subjects"
                label="Tổng môn học"
                value={stats.totalSubjects}
                color="#3b82f6"
              />
            </Link>

            {/* Tổng tài liệu */}
            <Link
              to="/resources"
              className="block group rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              title="Xem tất cả tài liệu"
            >
              <StatsCard
                icon="resources"
                label="Tổng tài liệu"
                value={stats.totalResources}
                color="#10b981"
              />
            </Link>

            {/* Tài liệu yêu thích */}
            <Link
              to="/favorites"
              className="block group rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              title="Xem tài liệu yêu thích"
            >
              <StatsCard
                icon="favorites"
                label="Tài liệu yêu thích"
                value={stats.totalFavorites}
                color="#f59e0b"
              />
            </Link>

            {/* Truy cập nhanh */}
            <Link
              to="/quick-access"
              className="block group rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              title="Xem các link truy cập nhanh"
            >
              <StatsCard
                icon="links"
                label="Truy cập nhanh"
                value={stats.totalLinks}
                color="#8b5cf6"
              />
            </Link>

          </div>

          {/* =========================
              SUBJECTS + QUICK LINKS
          ========================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

            {/* MÔN HỌC */}
            <Card className="lg:col-span-2">

              <CardHeader className="flex flex-row items-center justify-between gap-3">

                <div>

                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    Môn học của tôi
                  </CardTitle>

                  <CardDescription>
                    {subjects.length > 0
                      ? 'Chọn môn để xem tài liệu liên quan'
                      : 'Bắt đầu thêm môn học đầu tiên'}
                  </CardDescription>

                </div>

                <Link to="/subjects">
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Xem tất cả
                  </Button>
                </Link>

              </CardHeader>

              <CardBody className="pt-1">

                {subjects.length === 0 ? (

                  <EmptyState
                    icon={LucideIcons.BookOpen}
                    title="Chưa có môn học"
                    description="Thêm môn học để bắt đầu quản lý tài liệu"
                    action={{
                      label: 'Thêm môn học',
                      onClick: () => navigate('/subjects'),
                    }}
                  />

                ) : (

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {subjects.map((s: Subject) => {

                      const I = (
                        LucideIcons as Record<string, unknown>
                      )[s.icon] as React.ComponentType<{
                        className?: string
                        style?: React.CSSProperties
                      }>

                      return (
                        <Link
                          key={s.id}
                          to={`/subjects/${s.id}`}
                          className="group flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-soft transition-all duration-200"
                        >

                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: hexToRgba(s.color, 0.15),
                              color: s.color,
                            }}
                          >
                            {I ? (
                              <I className="h-5 w-5" />
                            ) : (
                              <BookOpen className="h-5 w-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">

                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                              {s.name}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {s.teacher || 'Chưa có giáo viên'} · {s.code}
                            </p>

                          </div>

                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors flex-shrink-0" />

                        </Link>
                      )
                    })}

                  </div>

                )}

              </CardBody>

            </Card>

            {/* TRUY CẬP NHANH */}
            <Card>

              <CardHeader className="flex flex-row items-center justify-between gap-3">

                <div>

                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Truy cập nhanh
                  </CardTitle>

                  <CardDescription>
                    Mở nhanh link thường dùng
                  </CardDescription>

                </div>

                <Link to="/quick-access">
                  <Button
                    variant="ghost"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>

              </CardHeader>

              <CardBody className="pt-1">

                {quickLinks.length === 0 ? (

                  <EmptyState
                    icon={LucideIcons.Zap}
                    title="Chưa có link nhanh"
                    action={{
                      label: 'Thêm link',
                      onClick: () => setQuickLinkFormOpen(true),
                    }}
                  />

                ) : (

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">

                    {quickLinks.slice(0, 6).map((l) => (
                      <QuickLinkCard
                        key={l.id}
                        link={l}
                      />
                    ))}

                  </div>

                )}

              </CardBody>

            </Card>

          </div>

          {/* =========================
              RECENT + FAVORITES
          ========================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

            {/* TÀI LIỆU MỚI */}
            <Card>

              <CardHeader className="flex flex-row items-center justify-between gap-3">

                <div>

                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-emerald-500" />
                    Link mới thêm
                  </CardTitle>

                  <CardDescription>
                    Các tài liệu bạn vừa thêm gần đây
                  </CardDescription>

                </div>

                <div className="flex items-center gap-2">

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setResourceFormOpen(true)}
                    className="hidden sm:inline-flex"
                  >
                    Thêm
                  </Button>

                  <Link to="/resources">
                    <Button
                      variant="ghost"
                      size="sm"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      Tất cả
                    </Button>
                  </Link>

                </div>

              </CardHeader>

              <CardBody className="pt-1">

                {recentResources.length === 0 ? (

                  <EmptyState
                    title="Chưa có tài liệu"
                    description="Thêm tài liệu đầu tiên của bạn"
                    action={{
                      label: 'Thêm tài liệu',
                      onClick: () => setResourceFormOpen(true),
                    }}
                  />

                ) : (

                  <div className="space-y-3">

                    {recentResources.map((r: typeof recentResources[0]) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        viewMode="list"
                      />
                    ))}

                  </div>

                )}

              </CardBody>

            </Card>

            {/* YÊU THÍCH */}
            <Card>

              <CardHeader className="flex flex-row items-center justify-between gap-3">

                <div>

                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Yêu thích ⭐
                  </CardTitle>

                  <CardDescription>
                    Tài liệu bạn đánh dấu yêu thích
                  </CardDescription>

                </div>

                <Link to="/favorites">
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                  >
                    Xem tất cả
                  </Button>
                </Link>

              </CardHeader>

              <CardBody className="pt-1">

                {favoriteResources.length === 0 ? (

                  <EmptyState
                    icon={LucideIcons.Star}
                    title="Chưa có yêu thích"
                    description="Đánh dấu ⭐ tài liệu hay để xem nhanh"
                    action={{
                      label: 'Xem tài liệu',
                      onClick: () => navigate('/resources'),
                    }}
                  />

                ) : (

                  <div className="space-y-3">

                    {favoriteResources.map((r) => (
                      <ResourceCard
                        key={r.id}
                        resource={r}
                        viewMode="list"
                      />
                    ))}

                  </div>

                )}

              </CardBody>

            </Card>

          </div>

          {/* =========================
              STUDYING TOOLS
          ========================== */}
          <Card>

            <CardHeader>

              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                Công cụ học tập
              </CardTitle>

              <CardDescription>
                Các công cụ hữu ích cho học tập hiệu quả
              </CardDescription>

            </CardHeader>

            <CardBody className="pt-1">

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">

                {studyingTools.map((tool) => {

                  const I = (
                    LucideIcons as Record<string, unknown>
                  )[tool.icon] as React.ComponentType<{
                    className?: string
                  }>

                  return (
                    <button
                      key={tool.name}
                      onClick={() =>
                        showToast(
                          'info',
                          `Tính năng mở ${tool.name} đang được thêm!`
                        )
                      }
                      className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-200"
                    >

                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-1"
                        style={{
                          backgroundColor: hexToRgba(tool.color, 0.12),
                          color: tool.color,
                        }}
                      >
                        {I ? (
                          <I className="h-6 w-6" />
                        ) : (
                          <GraduationCap className="h-6 w-6" />
                        )}
                      </div>

                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {tool.name}
                      </span>

                    </button>
                  )
                })}

              </div>

            </CardBody>

          </Card>

        </>
      )}

      {/* =========================
          MODALS
      ========================== */}
      <ResourceForm
        open={resourceFormOpen}
        onClose={() => setResourceFormOpen(false)}
      />

      <QuickLinkForm
        open={quickLinkFormOpen}
        onClose={() => setQuickLinkFormOpen(false)}
      />

    </div>
  )
}

export default Dashboard