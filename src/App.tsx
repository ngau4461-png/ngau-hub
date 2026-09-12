import React, { useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import { ToastProvider } from '@/hooks/useToast'
import { MainLayout } from '@/layouts/MainLayout'
import { startStudyHubCloudSync } from '@/services/cloudSync'

import Dashboard from '@/pages/Dashboard'
import Subjects from '@/pages/Subjects'
import SubjectDetail from '@/pages/SubjectDetail'
import Resources from '@/pages/Resources'
import Favorites from '@/pages/Favorites'
import QuickAccess from '@/pages/QuickAccess'
import Settings from '@/pages/Settings'
import Notes from '@/pages/Notes'
import Exams from '@/pages/Exams'
import Leaderboard from '@/pages/Leaderboard'
import Timer from '@/pages/Timer'
import Chat from '@/pages/Chat'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Backups from '@/pages/Backups'
import NgauAI from '@/pages/NgauAI'

const App: React.FC = () => {
  // =====================================================
  // SUPABASE CLOUD SYNC
  // =====================================================

  useEffect(() => {
    startStudyHubCloudSync()
  }, [])

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* ================================
              AUTH / ĐỘC LẬP LAYOUT
              ================================ */}

          <Route
            path="/chat"
            element={<Chat />}
          />

          {/* NGÂU AI ĐỘC LẬP LAYOUT - kiểu ChatGPT, full màn hình */}
          <Route
            path="/ngau-ai"
            element={<NgauAI />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* ================================
              APP
              ================================ */}

          <Route element={<MainLayout />}>
            {/* TRANG CHỦ */}

            <Route
              path="/"
              element={<Dashboard />}
            />

            {/* CHẠY THỜI GIAN */}

            <Route
              path="/timer"
              element={<Timer />}
            />

            {/* MÔN HỌC */}

            <Route
              path="/subjects"
              element={<Subjects />}
            />

            <Route
              path="/subjects/:id"
              element={<SubjectDetail />}
            />

            {/* TÀI NGUYÊN */}

            <Route
              path="/resources"
              element={<Resources />}
            />

            {/* YÊU THÍCH */}

            <Route
              path="/favorites"
              element={<Favorites />}
            />

            {/* TRUY CẬP NHANH */}

            <Route
              path="/quick-access"
              element={<QuickAccess />}
            />

            {/* GHI CHÚ */}

            <Route
              path="/notes"
              element={<Notes />}
            />

            {/* ĐỀ THI */}

            <Route
              path="/exams"
              element={<Exams />}
            />

            {/* BẢNG XẾP HẠNG */}

            <Route
              path="/leaderboard"
              element={<Leaderboard />}
            />

            {/* BẢN SAO LƯU PREMIUM */}

            <Route
              path="/backups"
              element={<Backups />}
            />

            {/* CÀI ĐẶT */}

            <Route
              path="/settings"
              element={<Settings />}
            />

            {/* FALLBACK - LUÔN ĐỂ CUỐI */}

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
