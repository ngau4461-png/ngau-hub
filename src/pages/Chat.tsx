import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Image as ImageIcon,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Crown,
  Gem,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase/client'
import { useToast } from '@/hooks/useToast'

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  level: number
  exp: number
  coins: number
  documents_count: number
  zalo_url?: string | null
  facebook_url?: string | null
}

type FriendRequest = {
  id: string
  sender_id: string
  receiver_id: string
  status: string
  created_at: string
  sender?: Profile
  receiver?: Profile
}

type Friend = Profile & {
  friendship_id: string
}

type ChatMessage = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  pending?: boolean
}

const PREMIUM_STORAGE_PREFIX = 'studyhub_premium_v1_'

function isPremiumUser(userId: string | null) {
  if (!userId) return false
  return localStorage.getItem(`${PREMIUM_STORAGE_PREFIX}${userId}`) === 'true'
}

function initials(name: string) {
  return (name || 'N')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(v => v[0])
    .join('')
    .toUpperCase()
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const avatarFallback =
  'linear-gradient(135deg,#7c3aed 0%,#4f46e5 48%,#06b6d4 100%)'

export default function Chat() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [premium, setPremium] = useState(false)
  const [myProfile, setMyProfile] = useState<Profile | null>(null)

  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Profile[]>([])

  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilePreview, setProfilePreview] = useState<Profile | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [tab, setTab] = useState<'friends' | 'requests'>('friends')

  const loadAll = useCallback(async () => {
    setLoading(true)

    const { data: auth } = await supabase.auth.getUser()
    const id = auth.user?.id ?? null
    setUserId(id)

    if (!id) {
      setLoading(false)
      return
    }

    setPremium(isPremiumUser(id))

    const [profileRes, incomingRes, outgoingRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, avatar_url, level, exp, coins, zalo_url, facebook_url')
        .eq('id', id)
        .maybeSingle(),

      supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at')
        .eq('receiver_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),

      supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status, created_at')
        .eq('sender_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])

    if (profileRes.data) {
      setMyProfile({
        ...profileRes.data,
        documents_count: 0,
      })
    }

    const incomingRows = (incomingRes.data ?? []) as FriendRequest[]
    const outgoingRows = (outgoingRes.data ?? []) as FriendRequest[]

    const incomingIds = incomingRows.map(x => x.sender_id)
    const outgoingIds = outgoingRows.map(x => x.receiver_id)

    const ids = [...new Set([...incomingIds, ...outgoingIds])]

    if (ids.length) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, level, exp, coins, zalo_url, facebook_url')
        .in('id', ids)

      const map = new Map((data ?? []).map(p => [p.id, p]))

      setIncoming(
        incomingRows.map(r => ({
          ...r,
          sender: map.get(r.sender_id)
            ? { ...map.get(r.sender_id)!, documents_count: 0 }
            : undefined,
        })),
      )

      setOutgoing(
        outgoingRows.map(r => ({
          ...r,
          receiver: map.get(r.receiver_id)
            ? { ...map.get(r.receiver_id)!, documents_count: 0 }
            : undefined,
        })),
      )
    } else {
      setIncoming([])
      setOutgoing([])
    }

    await loadFriends(id)
    setLoading(false)
  }, [])

  const loadFriends = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id')
      .or(`user_id.eq.${id},friend_id.eq.${id}`)

    if (error) {
      console.warn('[Bạn bè] friendships:', error.message)
      setFriends([])
      return
    }

    const rows = data ?? []
    const friendIds = rows.map(row =>
      row.user_id === id ? row.friend_id : row.user_id,
    )

    if (!friendIds.length) {
      setFriends([])
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, level, exp, coins, zalo_url, facebook_url')
      .in('id', friendIds)

    const profileMap = new Map(
      (profiles ?? []).map(profile => [profile.id, profile]),
    )

    setFriends(
      rows
        .map(row => {
          const friendId =
            row.user_id === id ? row.friend_id : row.user_id
          const profile = profileMap.get(friendId)
          if (!profile) return null

          return {
            ...profile,
            documents_count: 0,
            friendship_id: row.id,
          }
        })
        .filter(Boolean) as Friend[],
    )
  }, [])

  useEffect(() => {
    loadAll()
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()

    const channel = supabase
      .channel('friends-page-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => loadAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => loadAll(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadAll])

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(`chat-notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, payload => {
        const msg = payload.new as ChatMessage
        if (selectedFriend?.id === msg.sender_id) return
        showToast('info', 'Bạn vừa nhận được tin nhắn mới.')
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Ngâu Hub · Tin nhắn mới', { body: msg.content.startsWith('[[image]]') ? 'Bạn nhận được một hình ảnh.' : msg.content.slice(0, 90) })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${userId}` }, () => showToast('info', 'Bạn có lời mời kết bạn mới.'))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, selectedFriend, showToast])

  useEffect(() => {
    const onPremium = () => {
      if (userId) setPremium(isPremiumUser(userId))
    }

    window.addEventListener('studyhub-premium-changed', onPremium)
    window.addEventListener('storage', onPremium)

    return () => {
      window.removeEventListener('studyhub-premium-changed', onPremium)
      window.removeEventListener('storage', onPremium)
    }
  }, [userId])

  const searchUsers = async () => {
    const q = search.trim()

    if (!q) {
      setResults([])
      return
    }

    setSearching(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, level, exp, coins, zalo_url, facebook_url')
      .ilike('username', `%${q}%`)
      .neq('id', userId ?? '')
      .limit(20)

    if (error) {
      showToast('error', 'Không thể tìm người dùng.')
      console.error(error)
    } else {
      setResults(
        (data ?? []).map(profile => ({
          ...profile,
          documents_count: 0,
        })),
      )
    }

    setSearching(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search.trim()) searchUsers()
      else setResults([])
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search, userId])

  const friendIds = useMemo(
    () => new Set(friends.map(friend => friend.id)),
    [friends],
  )

  const incomingIds = useMemo(
    () => new Set(incoming.map(request => request.sender_id)),
    [incoming],
  )

  const outgoingIds = useMemo(
    () => new Set(outgoing.map(request => request.receiver_id)),
    [outgoing],
  )

  const sendRequest = async (target: Profile) => {
    if (!userId) {
      showToast('error', 'Bạn cần đăng nhập để kết bạn.')
      return
    }

    if (friendIds.has(target.id) || outgoingIds.has(target.id)) return

    const { error } = await supabase.from('friend_requests').insert({
      sender_id: userId,
      receiver_id: target.id,
      status: 'pending',
    })

    if (error) {
      showToast(
        'error',
        error.code === '23505'
          ? 'Lời mời kết bạn đã tồn tại.'
          : 'Không thể gửi lời mời kết bạn.',
      )
      return
    }

    showToast('success', `Đã gửi lời mời kết bạn cho ${target.username}.`)
    await loadAll()
  }

  const respondRequest = async (
    request: FriendRequest,
    accept: boolean,
  ) => {
    if (!userId) return

    if (!accept) {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id)

      if (error) {
        showToast('error', 'Không thể từ chối lời mời.')
        return
      }

      showToast('success', 'Đã từ chối lời mời kết bạn.')
      await loadAll()
      return
    }

    const { error: requestError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', request.id)

    if (requestError) {
      showToast('error', 'Không thể chấp nhận lời mời.')
      return
    }

    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        user_id: request.sender_id,
        friend_id: request.receiver_id,
      })

    if (friendshipError && friendshipError.code !== '23505') {
      showToast('error', 'Đã nhận lời mời nhưng chưa tạo được tình bạn.')
      return
    }

    showToast('success', `Đã kết bạn với ${request.sender?.username ?? 'người dùng'}!`)
    await loadAll()
  }

  const openChat = async (friend: Friend) => {
    setSelectedFriend(friend)

    if (!userId) return

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, created_at')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${userId})`,
      )
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.warn('[Bạn bè] messages:', error.message)
      setMessages([])
      return
    }

    setMessages((data ?? []) as ChatMessage[])
  }

  useEffect(() => {
    if (!userId || !selectedFriend) return

    const channel = supabase
      .channel(`private-chat-${selectedFriend.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          const msg = payload.new as ChatMessage
          const relevant =
            (msg.sender_id === userId &&
              msg.receiver_id === selectedFriend.id) ||
            (msg.sender_id === selectedFriend.id &&
              msg.receiver_id === userId)

          if (relevant) {
            setMessages(prev =>
              prev.some(item => item.id === msg.id)
                ? prev
                : [...prev, msg],
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, selectedFriend])

  const sendMessage = async () => {
    const text = message.trim()
    if (!text || !userId || !selectedFriend || sending) return

    setSending(true)
    const optimisticId = `local-${Date.now()}`
    const optimistic: ChatMessage = { id: optimisticId, sender_id: userId, receiver_id: selectedFriend.id, content: text, created_at: new Date().toISOString(), pending: true }
    setMessages(prev => [...prev, optimistic])
    setMessage('')

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: userId, receiver_id: selectedFriend.id, content: text })
      .select('id, sender_id, receiver_id, content, created_at')
      .single()

    if (error) {
      setMessages(prev => prev.filter(item => item.id !== optimisticId))
      showToast('error', 'Không thể gửi tin nhắn.')
      console.error(error)
    } else if (data) {
      setMessages(prev => prev.map(item => item.id === optimisticId ? data as ChatMessage : item))
    }
    setSending(false)
  }

  const sendImage = async (file: File) => {
    if (!userId || !selectedFriend) return
    if (!file.type.startsWith('image/')) { showToast('error', 'Chỉ hỗ trợ tệp hình ảnh.'); return }
    if (file.size > 8 * 1024 * 1024) { showToast('error', 'Ảnh tối đa 8MB.'); return }
    setUploadingImage(true)
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, file, { upsert: false, contentType: file.type })
    if (uploadError) { setUploadingImage(false); showToast('error', 'Không tải được ảnh. Hãy tạo Storage bucket chat-images.'); return }
    const { data: publicData } = supabase.storage.from('chat-images').getPublicUrl(path)
    const content = `[[image]]${publicData.publicUrl}`
    const optimisticId = `local-image-${Date.now()}`
    setMessages(prev => [...prev, { id: optimisticId, sender_id: userId, receiver_id: selectedFriend.id, content, created_at: new Date().toISOString(), pending: true }])
    const { data, error } = await supabase.from('messages').insert({ sender_id: userId, receiver_id: selectedFriend.id, content }).select('id, sender_id, receiver_id, content, created_at').single()
    if (error) { setMessages(prev => prev.filter(m => m.id !== optimisticId)); showToast('error', 'Ảnh đã tải lên nhưng chưa gửi được tin nhắn.') }
    else if (data) setMessages(prev => prev.map(m => m.id === optimisticId ? data as ChatMessage : m))
    setUploadingImage(false)
  }

  const displayResults = results

  const saveMyProfile = async (username: string, zaloUrl: string, facebookUrl: string) => {
    if (!userId || !myProfile) return false
    const cleanName = username.trim().slice(0, 40)
    if (!cleanName) { showToast('error', 'Tên người dùng không được để trống.'); return false }
    const { data, error } = await supabase.from('profiles').update({ username: cleanName, zalo_url: zaloUrl.trim() || null, facebook_url: facebookUrl.trim() || null }).eq('id', userId).select('id, username, avatar_url, level, exp, coins, zalo_url, facebook_url').single()
    if (error) { console.error(error); showToast('error', 'Không thể lưu thông tin. Hãy kiểm tra cột zalo_url và facebook_url trong profiles.'); return false }
    const updated = { ...(data as Profile), documents_count: myProfile.documents_count }
    setMyProfile(updated); setProfilePreview(updated); showToast('success', 'Đã cập nhật thông tin cá nhân.'); return true
  }

  return (
    <div
      className={[
        'friends-page relative min-h-[100dvh] w-full overflow-hidden bg-slate-50 text-slate-900',
        premium ? 'friends-premium' : '',
      ].join(' ')}
    >
      <style>{`
        .friends-page {
          --fp-purple: #7c3aed;
          --fp-indigo: #4f46e5;
          --fp-cyan: #06b6d4;
          background:
            radial-gradient(700px 400px at -10% -5%, rgba(124,58,237,.13), transparent 70%),
            radial-gradient(650px 420px at 110% 0%, rgba(6,182,212,.12), transparent 68%),
            linear-gradient(135deg,#f8fafc,#eef2ff 55%,#ecfeff);
        }

        .friends-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(rgba(99,102,241,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.035) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom, black, transparent 75%);
        }

        .fp-glass {
          background: rgba(255,255,255,.76);
          border: 1px solid rgba(148,163,184,.18);
          box-shadow: 0 18px 55px rgba(30,41,59,.08);
          backdrop-filter: blur(18px);
        }

        .fp-premium-glow {
          box-shadow:
            0 0 0 1px rgba(124,58,237,.14),
            0 18px 70px rgba(79,70,229,.17),
            0 0 45px rgba(6,182,212,.10);
        }

        .friends-premium {
          color: #eef2ff;
          background:
            radial-gradient(850px 500px at -8% -10%, rgba(124,58,237,.38), transparent 66%),
            radial-gradient(800px 500px at 108% -5%, rgba(6,182,212,.26), transparent 64%),
            radial-gradient(700px 500px at 50% 110%, rgba(59,130,246,.18), transparent 70%),
            linear-gradient(135deg,#060714,#0b1024 48%,#061822);
        }

        .friends-premium::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .55;
          background:
            linear-gradient(rgba(99,102,241,.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,.045) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(circle at center, black, transparent 82%);
        }

        .friends-premium .fp-glass {
          background: linear-gradient(145deg,rgba(17,24,50,.82),rgba(8,19,34,.72));
          border-color: rgba(129,140,248,.18);
          box-shadow:
            0 24px 80px rgba(0,0,0,.32),
            inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(22px);
        }

        .friends-premium .fp-card {
          background: linear-gradient(145deg,rgba(30,27,75,.78),rgba(8,24,42,.72));
          border: 1px solid rgba(129,140,248,.20);
        }

        .friends-premium .fp-card:hover {
          border-color: rgba(34,211,238,.45);
          transform: translateY(-2px);
          box-shadow: 0 20px 60px rgba(76,29,149,.22);
        }

        .fp-card {
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }

        .fp-neon {
          background: linear-gradient(135deg,#7c3aed,#4f46e5,#06b6d4);
          box-shadow: 0 10px 30px rgba(79,70,229,.25);
        }

        .fp-premium-badge {
          background: linear-gradient(135deg,#a78bfa,#6366f1,#22d3ee);
          box-shadow: 0 0 28px rgba(34,211,238,.25);
        }

        .fp-back-btn{color:#334155!important;background:#fff!important;border:1px solid #cbd5e1!important;box-shadow:0 8px 22px rgba(15,23,42,.10);transition:.18s ease}.fp-back-btn:hover{color:#4338ca!important;border-color:#818cf8!important;transform:translateX(-2px)}.fp-edit-profile-btn{color:#4338ca!important;background:linear-gradient(135deg,#eef2ff,#ecfeff)!important;border:1px solid #a5b4fc!important;box-shadow:0 8px 22px rgba(79,70,229,.12);white-space:nowrap}.fp-edit-profile-btn:hover{border-color:#6366f1!important;transform:translateY(-1px)}.fp-action-btn{color:#334155!important;background:#fff!important;border:1px solid #cbd5e1!important;box-shadow:0 8px 22px rgba(15,23,42,.08)}.fp-action-btn:hover{color:#4338ca!important;border-color:#818cf8!important}.fp-action-icon{color:#475569!important;background:#fff!important;border:1px solid #cbd5e1!important}.fp-action-icon:hover{color:#4338ca!important;border-color:#818cf8!important}.fp-secondary-btn{color:#334155;background:#f1f5f9;border:1px solid #cbd5e1}.fp-social-btn{display:inline-flex;align-items:center;border-radius:12px;padding:8px 11px;font-size:11px;font-weight:900;color:#334155;background:#fff;border:1px solid #cbd5e1;transition:.18s ease}.fp-social-btn:hover{color:#4338ca;border-color:#818cf8;transform:translateY(-1px)}.fp-input{color:#0f172a;background:#fff;border-color:#cbd5e1}.fp-input::placeholder{color:#94a3b8}.fp-input:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.12)}.friends-premium .fp-back-btn{color:#eef2ff!important;background:#172554!important;border-color:#6366f1!important}.friends-premium .fp-back-btn:hover{color:#67e8f9!important;background:#312e81!important;border-color:#22d3ee!important}.friends-premium .fp-edit-profile-btn{color:#fff!important;background:linear-gradient(135deg,#7c3aed,#4f46e5,#0891b2)!important;border-color:#818cf8!important;box-shadow:0 8px 28px rgba(79,70,229,.30)}.friends-premium .fp-action-btn,.friends-premium .fp-action-icon{color:#f8fafc!important;background:#172554!important;border-color:#6366f1!important}.friends-premium .fp-action-btn:hover,.friends-premium .fp-action-icon:hover{color:#67e8f9!important;background:#312e81!important;border-color:#22d3ee!important}.friends-premium .fp-secondary-btn{color:#e5e7eb;background:#172554;border-color:#6366f1}.friends-premium .fp-social-btn{color:#eef2ff;background:#172554;border-color:#6366f1}.friends-premium .fp-social-btn:hover{color:#67e8f9;border-color:#22d3ee}.friends-premium .fp-input{color:#f8fafc!important;background:#0f1737!important;border-color:#6366f1!important}.friends-premium .fp-input::placeholder{color:#8290b2!important}.friends-premium .fp-glass .text-slate-500{color:#c7d2fe!important}.friends-premium .fp-glass .text-slate-400{color:#a5b4fc!important}.friends-premium .fp-glass .bg-slate-100\/70{background:rgba(30,41,75,.82)!important}.friends-premium .fp-glass .bg-slate-50\/70{background:rgba(24,34,66,.9)!important}
        .fp-hero{position:relative;background:linear-gradient(120deg,rgba(255,255,255,.9),rgba(238,242,255,.8) 55%,rgba(236,254,255,.78));overflow:hidden}.fp-hero::after{content:'';position:absolute;width:220px;height:220px;right:-70px;top:-90px;border-radius:999px;background:linear-gradient(135deg,rgba(124,58,237,.22),rgba(6,182,212,.16));filter:blur(4px)}
        .fp-mini-stat{border:1px solid rgba(148,163,184,.18);background:rgba(255,255,255,.72);border-radius:18px;padding:12px;text-align:center}.fp-mini-stat strong{display:block;font-size:16px}.fp-mini-stat span{display:flex;justify-content:center;align-items:center;gap:5px;font-size:9px;font-weight:800;color:#64748b;margin-bottom:3px}
        .friends-premium .fp-hero{background:linear-gradient(120deg,rgba(19,26,56,.9),rgba(21,16,58,.82) 55%,rgba(5,31,45,.86));border-color:rgba(99,102,241,.28)}.friends-premium .fp-hero h2{color:#f8fafc}.friends-premium .fp-hero p{color:#aab8d6}.friends-premium .fp-mini-stat{background:rgba(15,23,55,.82);border-color:rgba(99,102,241,.25)}.friends-premium .fp-mini-stat span{color:#9fb0d6}.friends-premium .fp-mini-stat strong{color:#fff}
        .friends-premium .fp-card,.friends-premium .fp-card *{transition:color .18s ease,background .18s ease,border-color .18s ease,transform .18s ease}.friends-premium button:not(.fp-neon):not(.fp-action-btn):not(.fp-action-icon){color:#dbeafe}.friends-premium textarea{color:#f8fafc}.friends-premium textarea::placeholder{color:#8190b5}.friends-premium .bg-slate-100{background:rgba(30,41,75,.75)!important}.friends-premium .bg-white{background:#172554!important;color:#f8fafc!important}.friends-premium .text-indigo-600{color:#a5b4fc!important}
        @media (max-width: 1023px){.friends-page{overflow:auto}.fp-hero{margin-bottom:12px}.friends-page .grid.min-h-0.flex-1{display:flex;flex-direction:column}.friends-page .grid.min-h-0.flex-1>aside{min-height:520px}.friends-page .grid.min-h-0.flex-1>main{min-height:unset}}
        @media (prefers-reduced-motion: reduce) {
          .fp-card { transition: none !important; }
        }
      `}</style>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col p-3 sm:p-5 lg:p-7">
        <header className="fp-glass fp-premium-glow mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Quay lại" title="Quay lại" className="fp-back-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
              <ArrowLeft size={20} />
            </button>
            <div className={`fp-neon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${premium ? 'fp-premium-badge' : ''}`}>
              {premium ? <Sparkles size={23} /> : <Users size={23} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                  Bạn bè
                </h1>
                {premium && (
                  <span className="fp-premium-badge inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                    <Crown size={11} /> Premium
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 sm:text-sm">
                Tìm bạn học · Kết nối · Trò chuyện
              </p>
            </div>
          </div>

          {myProfile && (
            <div className="flex items-center gap-2">
            <button
              onClick={() => setProfilePreview(myProfile)}
              className="flex items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-slate-100/70"
            >
              <div
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-xs font-black text-white"
                style={{ background: avatarFallback }}
              >
                {myProfile.avatar_url ? (
                  <img src={myProfile.avatar_url} className="h-full w-full object-cover" alt="" />
                ) : (
                  initials(myProfile.username)
                )}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-bold">{myProfile.username}</div>
                <div className="text-[11px] text-slate-500">
                  Lv.{myProfile.level} · {myProfile.coins.toLocaleString('vi-VN')} xu
                </div>
              </div>
            </button>
            <button type="button" onClick={() => setEditingProfile(true)} aria-label="Thêm hoặc sửa link Zalo và Facebook" className="fp-edit-profile-btn inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black">
              <span className="text-base leading-none">✎</span>
              <span className="hidden sm:inline">Sửa hồ sơ & liên kết</span>
              <span className="sm:hidden">Sửa liên kết</span>
            </button>
            </div>
          )}
        </header>

        <section className="fp-hero fp-glass mb-4 overflow-hidden rounded-[28px] p-5 sm:p-6">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-indigo-600">
                <Sparkles size={12} /> Social Study Network
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Kết nối để học tốt hơn.</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Tìm bạn học, xem hồ sơ, gửi lời mời và trò chuyện realtime trong một không gian riêng.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
              <MiniStat icon={<Users size={15}/>} label="Bạn bè" value={String(friends.length)} />
              <MiniStat icon={<UserPlus size={15}/>} label="Lời mời" value={String(incoming.length)} />
              <MiniStat icon={<MessageCircle size={15}/>} label="Realtime" value="ON" />
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_410px]">
          <main className="fp-glass min-h-0 overflow-hidden rounded-3xl p-4 sm:p-5">
            <div className="mb-4 flex gap-2 rounded-2xl bg-slate-100/70 p-1">
              <button
                onClick={() => setTab('friends')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  tab === 'friends'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <Users size={16} />
                Bạn bè ({friends.length})
              </button>
              <button
                onClick={() => setTab('requests')}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  tab === 'requests'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <UserPlus size={16} />
                Lời mời
                {incoming.length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                    {incoming.length}
                  </span>
                )}
              </button>
            </div>

            {tab === 'friends' ? (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Tìm tên người dùng..."
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                    />
                    {searching && (
                      <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                    )}
                  </div>
                </div>

                {search.trim() && (
                  <section className="mb-5">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-sm font-black">Kết quả tìm kiếm</h2>
                      <span className="text-xs text-slate-400">{displayResults.length} người</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {displayResults.map(profile => (
                        <UserCard
                          key={profile.id}
                          profile={profile}
                          premium={premium}
                          friend={friendIds.has(profile.id)}
                          pending={outgoingIds.has(profile.id)}
                          incoming={incomingIds.has(profile.id)}
                          onProfile={() => setProfilePreview(profile)}
                          onAdd={() => sendRequest(profile)}
                        />
                      ))}
                    </div>

                    {!searching && displayResults.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                        Không tìm thấy người dùng phù hợp.
                      </div>
                    )}
                  </section>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-black">Danh sách bạn bè</h2>
                  <span className="text-xs text-slate-400">{friends.length} người</span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {friends.map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => openChat(friend)}
                      className="fp-card group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/65 p-3 text-left hover:shadow-lg"
                    >
                      <Avatar profile={friend} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">{friend.username}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-bold">Lv.{friend.level}</span>
                          <span>•</span>
                          <span>{friend.coins.toLocaleString('vi-VN')} xu</span>
                        </div>
                      </div>
                      <MessageCircle className="shrink-0 text-indigo-400 transition group-hover:scale-110" size={18} />
                    </button>
                  ))}
                </div>

                {!loading && friends.length === 0 && !search.trim() && (
                  <div className="mt-8 rounded-3xl border border-dashed border-slate-200 p-10 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                      <Users size={25} />
                    </div>
                    <div className="font-black">Chưa có bạn bè</div>
                    <p className="mt-1 text-sm text-slate-400">
                      Tìm username ở phía trên để bắt đầu kết nối.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <UserPlus size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black">Lời mời kết bạn</h2>
                    <p className="text-xs text-slate-400">Kết nối với những người cùng học</p>
                  </div>
                </div>

                {incoming.map(request => (
                  <div key={request.id} className="fp-card flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-3">
                    {request.sender && <Avatar profile={request.sender} size="md" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black">
                        {request.sender?.username ?? 'Người dùng'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Lv.{request.sender?.level ?? 1} · đang muốn kết bạn
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => respondRequest(request, true)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:scale-105"
                        title="Chấp nhận"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => respondRequest(request, false)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:scale-105"
                        title="Từ chối"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {outgoing.length > 0 && (
                  <>
                    <div className="pt-4 text-xs font-black uppercase tracking-wider text-slate-400">
                      Đã gửi
                    </div>
                    {outgoing.map(request => (
                      <div key={request.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/55 p-3">
                        {request.receiver && <Avatar profile={request.receiver} size="sm" />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">
                            {request.receiver?.username ?? 'Người dùng'}
                          </div>
                          <div className="text-[11px] text-slate-400">Đang chờ phản hồi</div>
                        </div>
                        <Clock3 size={15} className="text-slate-400" />
                      </div>
                    ))}
                  </>
                )}

                {!loading && incoming.length === 0 && outgoing.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
                    Hiện chưa có lời mời kết bạn.
                  </div>
                )}
              </div>
            )}
          </main>

          <aside className="fp-glass min-h-0 overflow-hidden rounded-3xl">
            {selectedFriend ? (
              <div className="flex h-full min-h-[420px] flex-col">
                <div className="flex items-center gap-3 border-b border-slate-200/60 p-4">
                  <button
                    onClick={() => setSelectedFriend(null)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar profile={selectedFriend} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black">{selectedFriend.username}</div>
                    <div className="text-[11px] text-emerald-500">Bạn bè · Lv.{selectedFriend.level}</div>
                  </div>
                  <button
                    onClick={() => setProfilePreview(selectedFriend)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${premium ? 'fp-premium-badge text-white' : 'bg-indigo-50 text-indigo-500'}`}>
                        <MessageCircle size={24} />
                      </div>
                      <div className="text-sm font-black">Bắt đầu cuộc trò chuyện</div>
                      <p className="mt-1 max-w-[230px] text-xs text-slate-400">
                        Gửi tin nhắn đầu tiên cho {selectedFriend.username}.
                      </p>
                    </div>
                  )}

                  {messages.map(msg => {
                    const mine = msg.sender_id === userId
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
                          mine
                            ? premium
                              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/20'
                              : 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {msg.content.startsWith('[[image]]') ? (
                            <img src={msg.content.slice(9)} alt="Ảnh được gửi" className="max-h-72 max-w-full rounded-xl object-cover" loading="lazy" />
                          ) : (
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                          )}
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${mine ? 'text-white/65' : 'text-slate-400'}`}>
                            {formatTime(msg.created_at)}
                            {mine && (msg.pending ? <Clock3 size={10} /> : <CheckCheck size={11} />)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-slate-200/60 p-3">
                  <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1.5">
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      rows={1}
                      placeholder="Nhập tin nhắn..."
                      className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                    />
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void sendImage(file); e.currentTarget.value = '' }} />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className="fp-action-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" title="Gửi ảnh">
                      <ImageIcon size={17} />
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!message.trim() || sending}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40 ${premium ? 'fp-neon' : 'bg-indigo-600'}`}
                    >
                      <Send size={17} />
                    </button>
                  </div>
                  <div className="mt-1 px-2 text-[9px] text-slate-400">
                    Enter để gửi · Shift + Enter xuống dòng
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center p-8 text-center">
                <div className={`mb-5 flex h-20 w-20 items-center justify-center rounded-3xl ${premium ? 'fp-premium-badge text-white' : 'bg-gradient-to-br from-indigo-50 to-cyan-50 text-indigo-500'}`}>
                  {premium ? <Sparkles size={34} /> : <MessageCircle size={34} />}
                </div>
                <h2 className="text-lg font-black">Trò chuyện riêng</h2>
                <p className="mt-2 max-w-xs text-sm text-slate-400">
                  Chọn một người bạn để mở cuộc trò chuyện.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">Realtime</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5">Riêng tư</span>
                  {premium && (
                    <span className="fp-premium-badge rounded-full px-3 py-1.5 text-white">
                      PREMIUM MODE
                    </span>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {profilePreview && (
        <ProfileModal
          profile={profilePreview}
          premium={premium}
          onClose={() => setProfilePreview(null)}
          editable={profilePreview.id === userId}
          onEdit={() => { setProfilePreview(null); setEditingProfile(true) }}
          onChat={
            profilePreview.id !== userId && friendIds.has(profilePreview.id)
              ? () => {
                  const friend = friends.find(f => f.id === profilePreview.id)
                  if (friend) {
                    setProfilePreview(null)
                    openChat(friend)
                  }
                }
              : undefined
          }
        />
      )}

      {editingProfile && myProfile && (
        <EditProfileModal profile={myProfile} premium={premium} onClose={() => setEditingProfile(false)} onSave={saveMyProfile} />
      )}
    </div>
  )
}

function EditProfileModal({ profile, premium, onClose, onSave }: { profile: Profile; premium: boolean; onClose: () => void; onSave: (username: string, zalo: string, facebook: string) => Promise<boolean> }) {
  const [username, setUsername] = useState(profile.username)
  const [zalo, setZalo] = useState(profile.zalo_url ?? '')
  const [facebook, setFacebook] = useState(profile.facebook_url ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const ok = await onSave(username, zalo, facebook)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="fp-glass w-full max-w-xl rounded-[30px] p-5 sm:p-7" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-black">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500">
                <Users size={19} />
              </div>
              <span>Chỉnh sửa hồ sơ & liên kết</span>
            </div>
            <div className="mt-2 text-xs leading-5 text-slate-500">Tên hiển thị và các đường dẫn liên hệ sẽ được lưu trực tiếp vào hồ sơ Supabase.</div>
          </div>
          <button type="button" onClick={onClose} className="fp-action-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Tên người dùng" value={username} onChange={setUsername} placeholder="Tên hiển thị" />

          <SocialField
            label="🔵 Link Zalo"
            value={zalo}
            onChange={setZalo}
            placeholder="https://zalo.me/..."
            icon="Z"
            helper="Ví dụ: https://zalo.me/0123456789"
          />

          <SocialField
            label="🔵 Link Facebook"
            value={facebook}
            onChange={setFacebook}
            placeholder="https://facebook.com/..."
            icon="f"
            helper="Ví dụ: https://facebook.com/ten-cua-ban"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-indigo-200/60 bg-indigo-50/60 p-3 text-xs text-indigo-700">
          <div className="font-black">Liên kết sẽ hiển thị trong hồ sơ</div>
          <div className="mt-1 text-indigo-600/80">Người khác có thể mở Zalo hoặc Facebook từ trang thông tin của bạn nếu bạn đã nhập link.</div>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="fp-secondary-btn flex-1 rounded-2xl py-3 text-sm font-black">Hủy</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className={`flex-1 rounded-2xl py-3 text-sm font-black text-white ${premium ? 'fp-neon' : 'bg-indigo-600'} disabled:opacity-50`}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="fp-input w-full rounded-2xl border px-4 py-3 text-sm outline-none transition" />
    </label>
  )
}

function SocialField({ label, value, onChange, placeholder, helper, icon }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; helper: string; icon: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-sm font-black text-white shadow-lg">{icon}</div>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="fp-input w-full rounded-2xl border px-4 py-3 text-sm outline-none transition" />
      </div>
      <span className="mt-1.5 block text-[10px] text-slate-400">{helper}</span>
      {value.trim() && <span className="mt-1 block truncate text-[10px] font-bold text-emerald-500">✓ Đã nhập: {value.trim()}</span>}
    </label>
  )
}

function Avatar({
  profile,
  size = 'md',
}: {
  profile: Profile
  size?: 'sm' | 'md'
}) {
  const cls = size === 'sm' ? 'h-10 w-10 rounded-xl text-xs' : 'h-12 w-12 rounded-2xl text-sm'

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden font-black text-white ${cls}`}
      style={{ background: avatarFallback }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(profile.username)
      )}
    </div>
  )
}

function UserCard({
  profile,
  premium,
  friend,
  pending,
  incoming,
  onProfile,
  onAdd,
}: {
  profile: Profile
  premium: boolean
  friend: boolean
  pending: boolean
  incoming: boolean
  onProfile: () => void
  onAdd: () => void
}) {
  return (
    <div className="fp-card group rounded-2xl border border-slate-200/70 bg-white/70 p-3">
      <div className="flex items-center gap-3">
        <Avatar profile={profile} />
        <button onClick={onProfile} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm font-black">{profile.username}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            <span className="font-bold">Lv.{profile.level}</span>
            <span>•</span>
            <span>{profile.coins.toLocaleString('vi-VN')} xu</span>
            <span>•</span>
            <span>{profile.documents_count} tài liệu</span>
          </div>
        </button>
        <button
          onClick={onAdd}
          disabled={friend || pending || incoming}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition disabled:cursor-default ${
            friend
              ? 'bg-emerald-500'
              : pending
                ? 'bg-slate-300'
                : incoming
                  ? 'bg-amber-500'
                  : premium
                    ? 'fp-neon'
                    : 'bg-indigo-600'
          }`}
          title={friend ? 'Đã là bạn' : pending ? 'Đã gửi' : 'Kết bạn'}
        >
          {friend ? <Check size={15} /> : pending ? <Clock3 size={15} /> : <UserPlus size={15} />}
        </button>
      </div>

      <button
        onClick={onProfile}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50/80 px-3 py-2 text-[10px] font-bold text-slate-500"
      >
        Xem thông tin
        <ChevronRight size={13} />
      </button>
    </div>
  )
}

function ProfileModal({
  profile,
  premium,
  onClose,
  onEdit,
  editable,
  onChat,
}: {
  profile: Profile
  premium: boolean
  onClose: () => void
  onEdit?: () => void
  editable?: boolean
  onChat?: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`fp-glass w-full max-w-md rounded-3xl p-5 ${premium ? 'fp-premium-glow' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="text-sm font-black">Thông tin người dùng</div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className={`rounded-[28px] p-1 ${premium ? 'bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-500/25' : ''}`}>
            <Avatar profile={profile} size="md" />
          </div>
          <h2 className="mt-3 text-xl font-black">{profile.username}</h2>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <ShieldCheck size={13} />
            Thành viên Ngâu Hub
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <Stat icon={<Zap size={15} />} label="Level" value={String(profile.level)} />
          <Stat icon={<Gem size={15} />} label="Xu" value={profile.coins.toLocaleString('vi-VN')} />
          <Stat icon={<BookOpen size={15} />} label="Tài liệu" value={String(profile.documents_count)} />
        </div>

        <div className="mt-3 rounded-2xl bg-slate-100/70 p-3">
          <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500">
            <span>Kinh nghiệm</span>
            <span>{profile.exp} EXP</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${premium ? 'bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, (profile.exp / Math.max(1, profile.level * 10)) * 100)}%` }}
            />
          </div>
        </div>

        {(profile.zalo_url || profile.facebook_url || editable) && (
          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3">
            <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Liên hệ</div>
            <div className="flex flex-wrap gap-2">
              {profile.zalo_url && <a href={profile.zalo_url} target="_blank" rel="noreferrer" className="fp-social-btn">Zalo</a>}
              {profile.facebook_url && <a href={profile.facebook_url} target="_blank" rel="noreferrer" className="fp-social-btn">Facebook</a>}
              {editable && onEdit && <button type="button" onClick={onEdit} className="fp-social-btn">✎ Chỉnh sửa thông tin</button>}
            </div>
          </div>
        )}

        {onChat && (
          <button
            onClick={onChat}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-white ${
              premium ? 'fp-neon' : 'bg-indigo-600'
            }`}
          >
            <MessageCircle size={17} />
            Trò chuyện
          </button>
        )}
      </div>
    </div>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="fp-mini-stat"><span>{icon}{label}</span><strong>{value}</strong></div>
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl bg-slate-100/70 p-3 text-center">
      <div className="mx-auto mb-1 flex w-fit items-center gap-1 text-indigo-500">
        {icon}
        <span className="text-[10px] font-bold">{label}</span>
      </div>
      <div className="text-sm font-black">{value}</div>
    </div>
  )
}
