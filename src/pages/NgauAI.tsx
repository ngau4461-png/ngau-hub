import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Bot,
  BrainCircuit,
  Camera,
  Check,
  ChevronDown,
  House,
  Copy,
  Lock,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/* =========================================================
   TYPES
========================================================= */

type MessageRole = 'user' | 'assistant'

type AIServer = 'gemini' | 'gpt'

type AIMessage = {
  id: string
  role: MessageRole
  content: string
  imageDataUrl?: string
  createdAt: number
  server?: AIServer
}

type Conversation = {
  id: string
  title: string
  messages: AIMessage[]
  createdAt: number
  updatedAt: number
}

/* =========================================================
   CONSTANTS
========================================================= */

const STORAGE_KEY = 'ngau-ai-conversations-v1'
const SERVER_STORAGE_KEY = 'ngau-ai-selected-server-v1'

const AI_SERVERS: Record<
  AIServer,
  {
    name: string
    shortName: string
    description: string
    functionName: string
    icon: typeof Bot
  }
> = {
  gemini: {
    name: 'NgauHub Classic',
    shortName: 'Classic',
    description: 'Server Gemini • Miễn phí',
    functionName: 'ngau-ai',
    icon: Sparkles,
  },
  gpt: {
    name: 'Ngâu Hub Premium',
    shortName: 'Premium',
    description: 'Server GPT • Yêu cầu Premium',
    functionName: 'ngau-ai-gpt',
    icon: BrainCircuit,
  },
}

const PREMIUM_STORAGE_PREFIX = 'studyhub_premium_v1_'

// Premium được lưu riêng theo từng tài khoản.
const detectPremium = (userId?: string | null): boolean => {
  if (typeof window === 'undefined' || !userId) return false
  try {
    return localStorage.getItem(`${PREMIUM_STORAGE_PREFIX}${userId}`) === 'true'
  } catch {
    return false
  }
}

const MAX_INPUT_HEIGHT = 220

const createId = () => {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

const createConversation = (): Conversation => {
  const now = Date.now()

  return {
    id: createId(),
    title: 'Cuộc trò chuyện mới',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

/* =========================================================
   STORAGE
========================================================= */

const loadSelectedServer = (): AIServer => {
  try {
    const value = localStorage.getItem(SERVER_STORAGE_KEY)
    return value === 'gpt' || value === 'gemini' ? value : 'gemini'
  } catch {
    return 'gemini'
  }
}

const loadConversations = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(
        item =>
          item &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          Array.isArray(item.messages),
      )
      .map(item => ({
        id: item.id,
        title: item.title,
        messages: item.messages
          .filter(
            (message: any) =>
              message &&
              typeof message === 'object' &&
              typeof message.id === 'string' &&
              (
                message.role === 'user' ||
                message.role === 'assistant'
              ) &&
              typeof message.content === 'string',
          )
          .map((message: any) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            imageDataUrl:
              typeof message.imageDataUrl === 'string'
                ? message.imageDataUrl
                : undefined,
            createdAt:
              typeof message.createdAt === 'number'
                ? message.createdAt
                : Date.now(),
            server:
              message.server === 'gpt' ||
              message.server === 'gemini'
                ? message.server
                : undefined,
          })),
        createdAt:
          typeof item.createdAt === 'number'
            ? item.createdAt
            : Date.now(),
        updatedAt:
          typeof item.updatedAt === 'number'
            ? item.updatedAt
            : Date.now(),
      }))
  } catch {
    return []
  }
}

const saveConversations = (
  conversations: Conversation[],
) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(conversations),
    )
  } catch {
    // Không để localStorage làm app crash.
  }
}

/* =========================================================
   SUGGESTIONS
========================================================= */

const suggestions = [
  {
    icon: '📚',
    title: 'Lập kế hoạch học tập',
    description: 'Giúp mình lên lịch học hiệu quả',
  },
  {
    icon: '💡',
    title: 'Giải thích bài học',
    description: 'Giải thích một chủ đề thật dễ hiểu',
  },
  {
    icon: '✨',
    title: 'Tạo ý tưởng',
    description: 'Brainstorm ý tưởng cho mình',
  },
  {
    icon: '💬',
    title: 'Trò chuyện',
    description: 'Nói chuyện tự do với Ngâu AI',
  },
]

/* =========================================================
   MARKDOWN + LATEX RENDERER
========================================================= */

/**
 * Ngâu AI có thể trả về:
 *   \( ... \)       -> inline math
 *   \[ ... \]       -> block math
 *   $$ ... $$       -> block math
 *   $ ... $         -> inline math
 *
 * Ngoài ra vẫn hỗ trợ Markdown cơ bản:
 *   **đậm**, `code`, # heading, - list, 1. list, > quote
 *
 * KaTeX được render trực tiếp ở phía client nên không cần
 * gọi thêm API cho phần hiển thị công thức.
 */

const renderKatex = (
  expression: string,
  displayMode: boolean,
): React.ReactNode => {
  try {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: katex.renderToString(expression.trim(), {
            displayMode,
            throwOnError: false,
            strict: false,
            trust: false,
            output: 'htmlAndMathml',
          }),
        }}
      />
    )
  } catch {
    return (
      <code className="rounded-md bg-black/5 px-1 dark:bg-white/10">
        {displayMode ? `$$${expression}$$` : `$${expression}$`}
      </code>
    )
  }
}

const renderTextWithMath = (text: string): React.ReactNode[] => {
  const result: React.ReactNode[] = []
  let remaining = text
  let index = 0

  // Ưu tiên các dạng block trước inline.
  const mathPattern =
    /(\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$)/

  while (remaining.length > 0) {
    const match = remaining.match(mathPattern)

    if (!match || match.index === undefined) {
      result.push(
        <React.Fragment key={`text-${index++}`}>
          {remaining}
        </React.Fragment>,
      )
      break
    }

    if (match.index > 0) {
      result.push(
        <React.Fragment key={`text-${index++}`}>
          {remaining.slice(0, match.index)}
        </React.Fragment>,
      )
    }

    const fullMatch = match[0]
    const isBlock =
      fullMatch.startsWith('\\[') ||
      fullMatch.startsWith('$$')

    const expression =
      fullMatch.startsWith('\\[')
        ? match[2] ?? ''
        : fullMatch.startsWith('\\(')
          ? match[3] ?? ''
          : fullMatch.startsWith('$$')
            ? match[4] ?? ''
            : match[5] ?? ''

    result.push(
      <span
        key={`math-${index++}`}
        className={
          isBlock
            ? 'my-3 block overflow-x-auto overflow-y-hidden py-1 text-center'
            : 'inline-block max-w-full align-middle'
        }
      >
        {renderKatex(expression, isBlock)}
      </span>,
    )

    remaining = remaining.slice(match.index + fullMatch.length)
  }

  return result
}

const formatInlineText = (text: string) => {
  // Tách code và bold trước, sau đó để renderTextWithMath
  // xử lý LaTeX ở phần văn bản còn lại.
  const parts = text.split(/(`[^`]+`|\*\*[\s\S]+?\*\*)/g)

  return parts.map((part, index) => {
    if (
      part.startsWith('`') &&
      part.endsWith('`')
    ) {
      return (
        <code
          key={`code-${index}`}
          className="rounded-md bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    if (
      part.startsWith('**') &&
      part.endsWith('**')
    ) {
      return (
        <strong key={`bold-${index}`}>
          {renderTextWithMath(part.slice(2, -2))}
        </strong>
      )
    }

    return (
      <React.Fragment key={`inline-${index}`}>
        {renderTextWithMath(part)}
      </React.Fragment>
    )
  })
}

const renderMessageContent = (content: string) => {
  // Chuẩn hóa một số trường hợp AI trả về escaped LaTeX.
  // Không đụng vào nội dung code.
  const normalizeLatex = (text: string) => {
    let normalized = text

    // Chuẩn hóa delimiter LaTeX dù dữ liệu bị escape 1, 2 hoặc nhiều lần.
    normalized = normalized
      .replace(/\\+\[/g, '\\[')
      .replace(/\\+\]/g, '\\]')
      .replace(/\\+\(/g, '\\(')
      .replace(/\\+\)/g, '\\)')

    return normalized
  }

  const normalized = normalizeLatex(content)

  const lines = normalized.split('\n')
  const elements: React.ReactNode[] = []

  let codeBlock = false
  let codeLanguage = ''
  let codeLines: string[] = []

  // Hỗ trợ block LaTeX nhiều dòng:
  // \[
  // ...
  // \]
  let mathBlock = false
  let mathLines: string[] = []

  const flushCodeBlock = (key: string) => {
    if (!codeBlock) return null

    const code = codeLines.join('\n')

    return (
      <pre
        key={key}
        className="my-3 overflow-x-auto rounded-xl bg-black/[0.06] p-4 text-xs leading-6 dark:bg-white/[0.06]"
      >
        <code className="font-mono">
          {code}
        </code>
      </pre>
    )
  }

  lines.forEach((line, index) => {
    const key = `line-${index}`

    // Nếu đang ở trong block LaTeX nhiều dòng thì chỉ tìm delimiter đóng.
    if (mathBlock) {
      const trimmed = line.trim()

      if (trimmed === '\\]' || trimmed === '$$') {
        elements.push(
          <div
            key={`math-block-${index}`}
            className="my-3 overflow-x-auto py-1 text-center"
          >
            {renderKatex(mathLines.join('\n'), true)}
          </div>,
        )

        mathBlock = false
        mathLines = []
      } else {
        mathLines.push(line)
      }

      return
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      if (!codeBlock) {
        codeBlock = true
        codeLanguage = line.trim().slice(3).trim()
        codeLines = []
      } else {
        const block = flushCodeBlock(`code-${index}`)
        if (block) elements.push(block)
        codeBlock = false
        codeLanguage = ''
        codeLines = []
      }
      return
    }

    if (codeBlock) {
      codeLines.push(line)
      return
    }

    if (!line.trim()) {
      elements.push(
        <div
          key={key}
          className="h-2"
          aria-hidden="true"
        />,
      )
      return
    }

    // Block LaTeX mở ở một dòng và đóng ở dòng khác.
    if (line.trim() === '\\[' || line.trim() === '$$') {
      mathBlock = true
      mathLines = []
      return
    }

    // Một dòng chỉ chứa block LaTeX.
    const blockMathMatch = line.trim().match(
      /^\\\[([\s\S]*)\\\]$/,
    )

    const dollarBlockMatch = line.trim().match(
      /^\$\$([\s\S]*)\$\$$/,
    )

    if (blockMathMatch || dollarBlockMatch) {
      const expression =
        blockMathMatch?.[1] ??
        dollarBlockMatch?.[1] ??
        ''

      elements.push(
        <div
          key={key}
          className="my-3 overflow-x-auto py-1 text-center"
        >
          {renderKatex(expression, true)}
        </div>,
      )
      return
    }

    if (/^###\s+/.test(line)) {
      elements.push(
        <div
          key={key}
          className="pt-2 text-base font-bold"
        >
          {formatInlineText(
            line.replace(/^###\s+/, ''),
          )}
        </div>,
      )
      return
    }

    if (/^##\s+/.test(line)) {
      elements.push(
        <div
          key={key}
          className="pt-2 text-lg font-bold"
        >
          {formatInlineText(
            line.replace(/^##\s+/, ''),
          )}
        </div>,
      )
      return
    }

    if (/^#\s+/.test(line)) {
      elements.push(
        <div
          key={key}
          className="pt-2 text-xl font-bold"
        >
          {formatInlineText(
            line.replace(/^#\s+/, ''),
          )}
        </div>,
      )
      return
    }

    if (/^[-*]\s+/.test(line)) {
      elements.push(
        <div
          key={key}
          className="flex gap-2"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
          <span>
            {formatInlineText(
              line.replace(/^[-*]\s+/, ''),
            )}
          </span>
        </div>,
      )
      return
    }

    if (/^\d+\.\s+/.test(line)) {
      const match = line.match(/^(\d+)\.\s+(.*)$/)

      elements.push(
        <div
          key={key}
          className="flex gap-2"
        >
          <span className="font-semibold opacity-70">
            {match?.[1]}.
          </span>
          <span>
            {formatInlineText(match?.[2] ?? line)}
          </span>
        </div>,
      )
      return
    }

    if (line.startsWith('> ')) {
      elements.push(
        <div
          key={key}
          className="border-l-2 border-primary/40 pl-3 italic opacity-80"
        >
          {formatInlineText(line.slice(2))}
        </div>,
      )
      return
    }

    elements.push(
      <div key={key}>
        {formatInlineText(line)}
      </div>,
    )
  })

  if (codeBlock) {
    const block = flushCodeBlock(
      `code-final-${codeLanguage || 'plain'}`,
    )
    if (block) elements.push(block)
  }

  // Nếu AI trả về block LaTeX chưa có delimiter đóng, vẫn render phần đã nhận.
  if (mathBlock && mathLines.length > 0) {
    elements.push(
      <div
        key="math-block-final"
        className="my-3 overflow-x-auto py-1 text-center"
      >
        {renderKatex(mathLines.join('\n'), true)}
      </div>,
    )
  }

  return (
    <div className="space-y-1.5 [&_.katex-display]:my-0 [&_.katex]:text-[1em]">
      {elements}
    </div>
  )
}

/* =========================================================
   COMPONENT
========================================================= */

const NgauAI: React.FC = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [conversations, setConversations] =
    useState<Conversation[]>(() => loadConversations())

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null)

  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  // Chờ xác minh auth rồi mới khôi phục server Premium.
  const [selectedServer, setSelectedServer] =
    useState<AIServer>('gemini')

  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null)

  const [premium, setPremium] = useState(false)

  const textareaRef =
    useRef<HTMLTextAreaElement>(null)

  const messagesEndRef =
    useRef<HTMLDivElement>(null)

  const messagesContainerRef =
    useRef<HTMLDivElement>(null)

  // Giữ đúng hành vi kiểu ChatGPT: chỉ tự cuộn khi người dùng đang ở cuối.
  // Khi người dùng vuốt lên đọc tin cũ, tin mới không được kéo họ xuống lại.
  const stickToBottomRef = useRef(true)

  const inputWrapperRef =
    useRef<HTMLDivElement>(null)

  const imageInputRef =
    useRef<HTMLInputElement>(null)

  const cameraInputRef =
    useRef<HTMLInputElement>(null)

  /* =======================================================
     CURRENT CONVERSATION
  ======================================================= */

  const activeConversation = useMemo(() => {
    if (!activeConversationId) {
      return null
    }

    return (
      conversations.find(
        conversation =>
          conversation.id === activeConversationId,
      ) ?? null
    )
  }, [
    activeConversationId,
    conversations,
  ])

  /* =======================================================
     SORTED CONVERSATIONS
  ======================================================= */

  const sortedConversations = useMemo(() => {
    return [...conversations].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
  }, [conversations])

  /* =======================================================
     SAVE
  ======================================================= */

  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  useEffect(() => {
    try {
      localStorage.setItem(
        SERVER_STORAGE_KEY,
        selectedServer,
      )
    } catch {
      // Không để localStorage làm app crash.
    }
  }, [selectedServer])

  /* =======================================================
     PREMIUM REFRESH + AUTH SYNC
  ======================================================= */

  const verifyPremiumAccess = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      const verified = detectPremium(data.user?.id ?? null)
      setPremium(verified)

      if (!verified) {
        setSelectedServer(current => current === 'gpt' ? 'gemini' : current)
      }

      return verified
    } catch (error) {
      console.error('[Ngâu AI] Premium verification error:', error)
      setPremium(false)
      setSelectedServer(current => current === 'gpt' ? 'gemini' : current)
      return false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const refreshPremium = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!mounted) return

        const isUserPremium = detectPremium(data.user?.id ?? null)
        const saved = loadSelectedServer()

        setPremium(isUserPremium)
        setSelectedServer(saved === 'gpt' && isUserPremium ? 'gpt' : 'gemini')
      } catch (error) {
        console.error('[Ngâu AI] Premium refresh error:', error)
        if (!mounted) return
        setPremium(false)
        setSelectedServer('gemini')
      }
    }

    void refreshPremium()

    const handlePremiumChanged = () => void refreshPremium()
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(PREMIUM_STORAGE_PREFIX)) void refreshPremium()
    }
    const handleFocus = () => void refreshPremium()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshPremium()
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        if (mounted) void refreshPremium()
      }, 0)
    })

    window.addEventListener('studyhub-premium-changed', handlePremiumChanged)
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
      window.removeEventListener('studyhub-premium-changed', handlePremiumChanged)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  /* =======================================================
     AUTO SELECT
  ======================================================= */

  useEffect(() => {
    if (
      activeConversationId &&
      conversations.some(
        conversation =>
          conversation.id === activeConversationId,
      )
    ) {
      return
    }

    if (conversations.length > 0) {
      setActiveConversationId(
        sortedConversations[0]?.id ?? null,
      )
    }
  }, [
    activeConversationId,
    conversations,
    sortedConversations,
  ])

  /* =======================================================
     SCROLL
  ======================================================= */

  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return true

    const distance =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight

    return distance < 90
  }, [])

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const move = () => {
        const container = messagesContainerRef.current
        if (!container) return

        const top = Math.max(0, container.scrollHeight - container.clientHeight)

        if (behavior === 'smooth') {
          container.scrollTo({ top, behavior: 'smooth' })
        } else {
          // Gán trực tiếp để Android/WebView không cuộn nhầm phần tử cha.
          container.scrollTop = top
        }
      }

      requestAnimationFrame(() => {
        move()
        requestAnimationFrame(move)
      })
    },
    [],
  )

  const handleMessagesScroll = useCallback(() => {
    const nearBottom = isNearBottom()
    stickToBottomRef.current = nearBottom
    setShowScrollToBottom(!nearBottom)
  }, [isNearBottom])

  useEffect(() => {
    stickToBottomRef.current = true
    setShowScrollToBottom(false)
    scrollToBottom('auto')
  }, [activeConversationId, scrollToBottom])

  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom('auto')
    }
  }, [
    activeConversation?.messages.length,
    isLoading,
    scrollToBottom,
  ])

  /* =======================================================
     FOCUS
  ======================================================= */

  useEffect(() => {
    if (!isLoading) {
      window.setTimeout(() => {
        textareaRef.current?.focus()
      }, 60)
    }
  }, [
    activeConversationId,
    isLoading,
  ])

  /* =======================================================
     NEW CHAT
  ======================================================= */

  const handleNewChat = useCallback(() => {
    if (isLoading) {
      return
    }

    const newConversation =
      createConversation()

    setConversations(prev => [
      newConversation,
      ...prev,
    ])

    setActiveConversationId(
      newConversation.id,
    )

    setInput('')
    setSidebarOpen(false)
    setMenuOpen(false)
    setModelMenuOpen(false)

    window.setTimeout(() => {
      textareaRef.current?.focus()
    }, 80)
  }, [isLoading])

  /* =======================================================
     SELECT CHAT
  ======================================================= */

  const handleSelectConversation = (
    conversationId: string,
  ) => {
    if (isLoading) {
      return
    }

    setActiveConversationId(conversationId)
    setSidebarOpen(false)
    setMenuOpen(false)
    setModelMenuOpen(false)
    setInput('')
  }

  /* =======================================================
     DELETE CHAT
  ======================================================= */

  const handleDeleteConversation = (
    conversationId: string,
  ) => {
    if (isLoading) {
      return
    }

    const remaining = conversations.filter(
      conversation =>
        conversation.id !== conversationId,
    )

    setConversations(remaining)

    if (
      activeConversationId ===
      conversationId
    ) {
      setActiveConversationId(
        remaining[0]?.id ?? null,
      )
    }

    setMenuOpen(false)
  }

  /* =======================================================
     CLEAR ALL
  ======================================================= */

  const handleClearAll = () => {
    if (
      conversations.length === 0 ||
      isLoading
    ) {
      return
    }

    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa toàn bộ lịch sử Ngâu AI không?',
    )

    if (!confirmed) {
      return
    }

    setConversations([])
    setActiveConversationId(null)
    setInput('')
    setMenuOpen(false)
    setModelMenuOpen(false)
  }

  /* =======================================================
     UPDATE CONVERSATION
  ======================================================= */

  const updateConversation = (
    conversationId: string,
    updater: (
      conversation: Conversation,
    ) => Conversation,
  ) => {
    setConversations(prev =>
      prev.map(conversation =>
        conversation.id ===
        conversationId
          ? updater(conversation)
          : conversation,
      ),
    )
  }

  /* =======================================================
     TITLE
  ======================================================= */

  const generateTitle = (text: string) => {
    const clean = text
      .replace(/\s+/g, ' ')
      .trim()

    if (!clean) {
      return 'Cuộc trò chuyện mới'
    }

    if (clean.length <= 38) {
      return clean
    }

    return `${clean.slice(0, 38)}...`
  }

  /* =======================================================
     CALL EDGE FUNCTION
  ======================================================= */

  const selectAIServer = async (server: AIServer) => {
    if (isLoading) return

    if (server === 'gpt') {
      const verified = await verifyPremiumAccess()
      if (!verified) {
        setModelMenuOpen(false)
        showToast('error', 'Ngâu Hub Premium sử dụng server GPT và chỉ dành cho tài khoản Premium.')
        return
      }
    }

    setSelectedServer(server)
    setModelMenuOpen(false)
  }

  const callNgauAI = async (
    messages: AIMessage[],
    server: AIServer = selectedServer,
  ): Promise<string> => {
    const apiMessages = messages
      .filter(
        message =>
          message.role === 'user' ||
          message.role === 'assistant',
      )
      .map(message => ({
        role: message.role,
        content: message.content,
        ...(message.imageDataUrl
          ? { image: message.imageDataUrl }
          : {}),
      }))

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      AI_SERVERS[server].functionName,
      {
        body: {
          messages: apiMessages,
        },
      },
    )

    if (error) {
      console.error(
        '[Ngâu AI] Edge Function error:',
        error,
      )

      try {
        const context = (error as any)?.context

        if (context instanceof Response) {
          const response = context.clone()

          let errorBody: any = null

          try {
            errorBody =
              await response.json()
          } catch {
            errorBody = null
          }

          if (
            errorBody &&
            typeof errorBody.error ===
              'string'
          ) {
            throw new Error(
              errorBody.error,
            )
          }
        }
      } catch (bodyError) {
        if (
          bodyError instanceof Error &&
          bodyError.message !==
            error.message
        ) {
          throw bodyError
        }
      }

      throw new Error(
        error.message ||
          'Không thể kết nối tới Ngâu AI.',
      )
    }

    if (!data) {
      throw new Error(
        'Ngâu AI không trả về dữ liệu.',
      )
    }

    if (
      typeof data.error === 'string' &&
      data.error.trim()
    ) {
      throw new Error(
        data.error.trim(),
      )
    }

    if (
      typeof data.message !== 'string' ||
      !data.message.trim()
    ) {
      console.error(
        '[Ngâu AI] Invalid response:',
        data,
      )

      throw new Error(
        'Ngâu AI không trả về nội dung hợp lệ.',
      )
    }

    return data.message.trim()
  }

  /* =======================================================
     SEND
  ======================================================= */


  /* =======================================================
     IMAGE INPUT
  ======================================================= */

  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        const source = String(reader.result || '')
        const image = new Image()

        image.onload = () => {
          const maxSize = 1280
          const scale = Math.min(
            1,
            maxSize / Math.max(image.width, image.height),
          )

          const canvas = document.createElement('canvas')
          canvas.width = Math.max(
            1,
            Math.round(image.width * scale),
          )
          canvas.height = Math.max(
            1,
            Math.round(image.height * scale),
          )

          const context = canvas.getContext('2d')

          if (!context) {
            reject(new Error('Không thể xử lý ảnh.'))
            return
          }

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height,
          )

          resolve(canvas.toDataURL('image/jpeg', 0.76))
        }

        image.onerror = () =>
          reject(new Error('Ảnh không hợp lệ.'))

        image.src = source
      }

      reader.onerror = () =>
        reject(new Error('Không thể đọc ảnh.'))

      reader.readAsDataURL(file)
    })

  const handleImageFile = async (file?: File) => {
    if (!file || isLoading || !file.type.startsWith('image/')) {
      return
    }

    try {
      const image = await compressImage(file)

      // Giữ payload nhẹ để Android/WebView + Edge Function gửi ổn định.
      if (image.length > 2_500_000) {
        throw new Error('Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.')
      }

      setPendingImage(image)

      window.setTimeout(() => {
        textareaRef.current?.focus()
      }, 30)
    } catch (error) {
      console.error('[Ngâu AI] Image error:', error)
    }
  }

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    void handleImageFile(file)
  }

  const sendMessage = async () => {
    const text = input.trim()

    if ((!text && !pendingImage) || isLoading) {
      return
    }

    let serverForRequest = selectedServer

    if (serverForRequest === 'gpt') {
      const verified = await verifyPremiumAccess()
      if (!verified) {
        showToast('error', 'Tài khoản hiện tại chưa có quyền sử dụng Ngâu Hub Premium.')
        return
      }
    }

    let conversationId =
      activeConversationId

    let currentMessages: AIMessage[] = []

    if (!conversationId) {
      const newConversation =
        createConversation()

      conversationId =
        newConversation.id

      setConversations(prev => [
        newConversation,
        ...prev,
      ])

      setActiveConversationId(
        conversationId,
      )
    } else {
      const existing =
        conversations.find(
          conversation =>
            conversation.id ===
            conversationId,
        )

      currentMessages =
        existing?.messages ?? []
    }

    const userMessage: AIMessage = {
      id: createId(),
      role: 'user',
      content: text,
      imageDataUrl: pendingImage || undefined,
      createdAt: Date.now(),
      server: serverForRequest,
    }

    const messagesForAI = [
      ...currentMessages,
      userMessage,
    ]

    // Người dùng vừa gửi tin -> luôn đưa cuộc trò chuyện xuống cuối.
    stickToBottomRef.current = true
    setShowScrollToBottom(false)

    updateConversation(
      conversationId,
      conversation => ({
        ...conversation,
        title:
          conversation.messages
            .length === 0
            ? generateTitle(
                text || 'Phân tích hình ảnh',
              )
            : conversation.title,
        messages: [
          ...conversation.messages,
          userMessage,
        ],
        updatedAt: Date.now(),
      }),
    )

    setInput('')
    setPendingImage(null)
    resetTextarea()
    setIsLoading(true)

    try {
      const answer =
        await callNgauAI(
          messagesForAI,
          serverForRequest,
        )

      const assistantMessage: AIMessage =
        {
          id: createId(),
          role: 'assistant',
          content: answer,
          createdAt: Date.now(),
          server: serverForRequest,
        }

      updateConversation(
        conversationId,
        conversation => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            assistantMessage,
          ],
          updatedAt: Date.now(),
        }),
      )
    } catch (error) {
      console.error(
        '[Ngâu AI] Send error:',
        error,
      )

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra khi kết nối với Ngâu AI.'

      const assistantMessage: AIMessage =
        {
          id: createId(),
          role: 'assistant',
          content:
            `Xin lỗi, mình chưa thể trả lời lúc này.\n\n` +
            `Lỗi: ${errorMessage}`,
          createdAt: Date.now(),
        }

      updateConversation(
        conversationId,
        conversation => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            assistantMessage,
          ],
          updatedAt: Date.now(),
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  /* =======================================================
     REGENERATE
  ======================================================= */

  const regenerateLastResponse = async () => {
    if (
      !activeConversation ||
      isLoading
    ) {
      return
    }

    const messages =
      activeConversation.messages

    const lastAssistantIndex =
      [...messages]
        .reverse()
        .findIndex(
          message =>
            message.role ===
            'assistant',
        )

    if (lastAssistantIndex < 0) {
      return
    }

    const actualIndex =
      messages.length -
      1 -
      lastAssistantIndex

    const previousMessages =
      messages.slice(0, actualIndex)

    const lastUser =
      [...previousMessages]
        .reverse()
        .find(
          message =>
            message.role === 'user',
        )

    if (!lastUser) {
      return
    }

    updateConversation(
      activeConversation.id,
      conversation => ({
        ...conversation,
        messages:
          conversation.messages.slice(
            0,
            actualIndex,
          ),
        updatedAt: Date.now(),
      }),
    )

    const serverForRequest =
      lastUser.server ||
      activeConversation.messages
        .slice()
        .reverse()
        .find(message => message.server)?.server ||
      selectedServer

    if (serverForRequest === 'gpt') {
      const verified = await verifyPremiumAccess()
      if (!verified) {
        showToast('error', 'Tài khoản hiện tại chưa có quyền sử dụng Ngâu Hub Premium.')
        return
      }
    }

    setIsLoading(true)

    try {
      const answer =
        await callNgauAI(
          previousMessages,
          serverForRequest,
        )

      const assistantMessage: AIMessage =
        {
          id: createId(),
          role: 'assistant',
          content: answer,
          createdAt: Date.now(),
          server: serverForRequest,
        }

      updateConversation(
        activeConversation.id,
        conversation => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            assistantMessage,
          ],
          updatedAt: Date.now(),
        }),
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể tạo lại câu trả lời.'

      updateConversation(
        activeConversation.id,
        conversation => ({
          ...conversation,
          messages: [
            ...conversation.messages,
            {
              id: createId(),
              role: 'assistant',
              content:
                `Không thể tạo lại câu trả lời.\n\nLỗi: ${message}`,
              createdAt: Date.now(),
            },
          ],
          updatedAt: Date.now(),
        }),
      )
    } finally {
      setIsLoading(false)
    }
  }

  /* =======================================================
     COPY
  ======================================================= */

  const copyMessage = async (
    message: AIMessage,
  ) => {
    try {
      await navigator.clipboard.writeText(
        message.content,
      )

      setCopiedMessageId(message.id)

      window.setTimeout(() => {
        setCopiedMessageId(
          current =>
            current === message.id
              ? null
              : current,
        )
      }, 1600)
    } catch {
      // Clipboard có thể bị trình duyệt chặn.
    }
  }

  /* =======================================================
     KEYBOARD
  ======================================================= */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      void sendMessage()
    }
  }

  /* =======================================================
     TEXTAREA
  ======================================================= */

  const resetTextarea = () => {
    if (!textareaRef.current) {
      return
    }

    textareaRef.current.style.height = 'auto'
  }

  const handleInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const element = event.target

    setInput(element.value)

    element.style.height = 'auto'

    element.style.height = `${Math.min(
      element.scrollHeight,
      MAX_INPUT_HEIGHT,
    )}px`
  }

  /* =======================================================
     SUGGESTION
  ======================================================= */

  const useSuggestion = (
    title: string,
  ) => {
    if (isLoading) {
      return
    }

    setInput(title)
    setModelMenuOpen(false)

    window.setTimeout(() => {
      textareaRef.current?.focus()
    }, 30)
  }

  /* =======================================================
     TIME
  ======================================================= */

  const formatTime = (
    timestamp: number,
  ) => {
    try {
      return new Intl.DateTimeFormat(
        'vi-VN',
        {
          hour: '2-digit',
          minute: '2-digit',
        },
      ).format(timestamp)
    } catch {
      return ''
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={`
        relative flex h-[100dvh] min-h-0 max-h-[100dvh] w-full min-w-0
        overflow-hidden
        bg-background text-foreground
        ${premium ? 'ngau-ai-premium' : ''} ${premium && selectedServer === 'gpt' ? 'ngau-ai-gpt-active' : ''}
      `}
    >
      {/* Premium dùng nền tĩnh để tránh lag trên điện thoại. */}
      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="
            fixed inset-0 z-40
            bg-black/35
            md:hidden
          "
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[290px] max-w-[88vw] flex-col
          border-r bg-card
          transition-transform duration-200
          md:relative md:inset-y-auto md:left-auto md:z-auto md:w-[280px] md:max-w-none md:translate-x-0
          md:shrink-0
          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full md:translate-x-0'
          }
        `}
      >
        {/* Sidebar header */}

        <div
          className="
            flex h-14 shrink-0 items-center justify-between
            border-b px-3 pt-[env(safe-area-inset-top)]
          "
        >
          <div className="flex items-center gap-3 px-2">
            <div
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                bg-primary
                text-primary-foreground
                shadow-sm
              "
            >
              <Sparkles size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold">
                  Ngâu AI
                </span>

                {premium && (
                  <span
                    className="
                      inline-flex items-center
                      gap-1 rounded-full
                      bg-primary/10 px-1.5 py-0.5
                      text-[9px] font-bold
                      text-primary
                    "
                  >
                    <Zap size={9} />
                    PRO
                  </span>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground">
                Trợ lý thông minh
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="
              rounded-xl p-2
              transition
              hover:bg-muted
              md:hidden
            "
            aria-label="Đóng sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* New chat */}

        <div className="p-3">
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isLoading}
            className="
              group flex w-full
              items-center gap-3
              rounded-xl
              border
              bg-background/70
              px-4 py-3
              text-sm font-semibold
              shadow-sm
              transition-colors
              hover:bg-muted
              disabled:pointer-events-none
              disabled:opacity-50
            "
          >
            <span
              className="
                flex h-7 w-7
                items-center justify-center
                rounded-lg
                bg-primary/10
                text-primary
                transition
                group-hover:bg-primary
                group-hover:text-primary-foreground
              "
            >
              <Plus size={16} />
            </span>

            <span>
              Cuộc trò chuyện mới
            </span>
          </button>
        </div>

        {/* History title */}

        <div className="px-4 pb-2 pt-2">
          <div
            className="
              text-[10px] font-bold
              uppercase tracking-[0.14em]
              text-muted-foreground
            "
          >
            Lịch sử trò chuyện
          </div>
        </div>

        {/* History */}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sortedConversations.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div
                className="
                  mx-auto mb-3
                  flex h-11 w-11
                  items-center justify-center
                  rounded-xl bg-muted
                "
              >
                <MessageSquare
                  size={20}
                  className="opacity-50"
                />
              </div>

              <p className="text-xs font-medium">
                Chưa có cuộc trò chuyện
              </p>

              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Bắt đầu một cuộc trò chuyện mới
                với Ngâu AI.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedConversations.map(
                conversation => {
                  const active =
                    conversation.id ===
                    activeConversationId

                  return (
                    <div
                      key={conversation.id}
                      className={`
                        group flex w-full
                        items-center gap-1
                        rounded-xl
                        transition
                        ${
                          active
                            ? 'bg-muted shadow-sm'
                            : 'hover:bg-muted/70'
                        }
                      `}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectConversation(
                            conversation.id,
                          )
                        }
                        disabled={isLoading}
                        className="
                          flex min-w-0 flex-1
                          items-center gap-2.5
                          rounded-xl
                          px-3 py-2.5
                          text-left text-sm
                          disabled:pointer-events-none
                        "
                      >
                        <MessageSquare
                          size={15}
                          className={`
                            shrink-0
                            ${
                              active
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }
                          `}
                        />

                        <span className="min-w-0 flex-1 truncate">
                          {conversation.title}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteConversation(
                            conversation.id,
                          )
                        }
                        disabled={isLoading}
                        className="
                          mr-1 hidden
                          rounded-lg p-1.5
                          text-muted-foreground
                          transition
                          hover:bg-background
                          hover:text-destructive
                          group-hover:block
                          disabled:pointer-events-none
                        "
                        aria-label="Xóa cuộc trò chuyện"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                },
              )}
            </div>
          )}
        </div>

        {/* Sidebar bottom */}

        <div className="border-t p-3">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={
              conversations.length === 0 ||
              isLoading
            }
            className="
              flex w-full
              items-center gap-3
              rounded-xl
              px-3 py-2.5
              text-sm text-muted-foreground
              transition
              hover:bg-muted
              hover:text-destructive
              disabled:pointer-events-none
              disabled:opacity-40
            "
          >
            <Trash2 size={16} />
            <span>Xóa lịch sử</span>
          </button>
        </div>
      </aside>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main
        className="
          relative z-10
          flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header
          className="
            sticky top-0 z-30 flex h-14 shrink-0
            items-center justify-between
            border-b bg-background/95
            px-1.5 sm:h-16 sm:px-3 md:px-5
          "
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Về trang chủ */}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                text-muted-foreground
                hover:bg-muted
                hover:text-foreground
              "
              aria-label="Về trang chủ"
              title="Về trang chủ"
            >
              <House size={17} />
            </button>

            {/* Mobile menu */}

            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="
                rounded-xl p-2
                transition
                hover:bg-muted
                md:hidden
              "
              aria-label="Mở menu"
            >
              <Menu size={21} />
            </button>

            {/* Identity */}

            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`
                  flex h-8 w-8 shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-primary
                  text-primary-foreground
                  shadow-sm
                  ${premium && selectedServer === 'gpt' ? 'ngau-premium-icon' : ''}
                `}
              >
                <Bot size={18} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="max-w-[110px] truncate text-sm font-bold sm:max-w-none">
                    Ngâu AI
                  </span>

                  {premium && (
                    <span
                      className="
                        hidden items-center
                        gap-1 rounded-full
                        bg-primary/10
                        px-2 py-0.5
                        text-[9px] font-bold
                        text-primary
                        sm:inline-flex
                      "
                    >
                      <Zap size={9} />
                      PREMIUM
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`
                      h-1.5 w-1.5 shrink-0 rounded-full
                      ${
                        isLoading
                          ? 'animate-pulse bg-yellow-500'
                          : 'bg-green-500'
                      }
                    `}
                  />

                  <span className="max-w-[78px] truncate text-[10px] text-muted-foreground sm:max-w-none">
                    {isLoading
                      ? 'Đang suy nghĩ...'
                      : `${AI_SERVERS[selectedServer].name} • Sẵn sàng`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI server selector + header menu */}

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!isLoading) {
                    setModelMenuOpen(
                      previous => !previous,
                    )
                    setMenuOpen(false)
                  }
                }}
                disabled={isLoading}
                className={`
                  inline-flex h-9 items-center gap-1.5
                  rounded-xl border bg-card px-2.5
                  text-xs font-semibold shadow-sm
                  transition touch-manipulation
                  hover:bg-muted
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:px-3
                  ${premium && selectedServer === 'gpt' ? 'ngau-premium-selector text-primary' : ''}
                `}
                aria-label="Chọn máy chủ AI"
                aria-expanded={modelMenuOpen}
              >
                {React.createElement(
                  AI_SERVERS[selectedServer].icon,
                  { size: 15 },
                )}
                <span className="max-w-[54px] truncate sm:max-w-none">
                  {AI_SERVERS[selectedServer].shortName}
                </span>
                <ChevronDown
                  size={13}
                  className={`transition-transform ${
                    modelMenuOpen
                      ? 'rotate-180'
                      : ''
                  }`}
                />
              </button>

              {modelMenuOpen && (
                <div
                  className="
                    absolute right-0 top-full z-50 mt-2
                    w-[220px] overflow-hidden rounded-2xl
                    border bg-card p-1.5 shadow-xl
                  "
                >
                  <div className="px-3 pb-1.5 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Máy chủ trò chuyện
                    </div>
                  </div>

                  {(Object.keys(AI_SERVERS) as AIServer[]).map(
                    server => {
                      const config = AI_SERVERS[server]
                      const active =
                        selectedServer === server

                      return (
                        <button
                          key={server}
                          type="button"
                          onClick={() => selectAIServer(server)}
                          className={`
                            flex w-full items-center gap-3
                            rounded-xl px-3 py-2.5
                            text-left transition
                            ${
                              server === 'gpt' && !premium
                                ? 'cursor-not-allowed opacity-55'
                                : active
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted'
                            }
                          `}
                        >
                          <span
                            className={`
                              flex h-9 w-9 shrink-0
                              items-center justify-center
                              rounded-xl
                              ${
                                active
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }
                            `}
                          >
                            <config.icon size={17} />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-bold">
                              {config.name}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {config.description}
                            </span>
                          </span>

                          {server === 'gpt' && !premium ? (
                            <Lock
                              size={15}
                              className="shrink-0 text-muted-foreground"
                            />
                          ) : active ? (
                            <Check
                              size={16}
                              className="shrink-0"
                            />
                          ) : null}
                        </button>
                      )
                    },
                  )}

                  <div className="mt-1 border-t px-3 py-2 text-[9px] leading-4 text-muted-foreground">
                    Classic dùng Gemini. Premium dùng GPT và cần tài khoản Premium.
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setMenuOpen(
                    previous => !previous,
                  )
                }
              className="
                rounded-xl p-2
                transition
                hover:bg-muted
              "
              aria-label="Tùy chọn"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={21} />
            </button>

            {menuOpen && (
              <div
                className="
                  absolute right-0 top-full
                  z-50 mt-2 w-52
                  overflow-hidden
                  rounded-2xl
                  border
                  bg-card
                  p-1.5
                  shadow-lg
                "
              >
                <button
                  type="button"
                  onClick={handleNewChat}
                  disabled={isLoading}
                  className="
                    flex w-full
                    items-center gap-2.5
                    rounded-xl
                    px-3 py-2.5
                    text-sm
                    transition
                    hover:bg-muted
                    disabled:opacity-40
                  "
                >
                  <Plus size={16} />
                  Cuộc trò chuyện mới
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={
                    conversations.length === 0 ||
                    isLoading
                  }
                  className="
                    flex w-full
                    items-center gap-2.5
                    rounded-xl
                    px-3 py-2.5
                    text-sm
                    transition
                    hover:bg-muted
                    disabled:opacity-40
                  "
                >
                  <Trash2 size={16} />
                  Xóa lịch sử
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        {/* =================================================
            MESSAGE AREA
        ================================================= */}

        <div
          ref={messagesContainerRef}
          className="
            min-h-0 flex-1
            overflow-x-hidden overflow-y-auto
            overscroll-contain
            touch-pan-y
            [-webkit-overflow-scrolling:touch]
            ngau-ai-scrollbar
          "
          onScroll={handleMessagesScroll}
          onClick={() => {
            if (menuOpen) {
              setMenuOpen(false)
            }
            if (modelMenuOpen) {
              setModelMenuOpen(false)
            }
          }}
        >
          {/* EMPTY */}

          {(!activeConversation ||
            activeConversation.messages.length ===
              0) && (
            <div
              className="
                flex min-h-full
                items-center justify-center
                px-4 py-10
              "
            >
              <div className="w-full max-w-3xl">
                <div className="text-center">
                  <div
                    className="
                      relative mx-auto mb-5
                      flex h-16 w-16
                      items-center justify-center
                      sm:h-20 sm:w-20
                      rounded-3xl
                      bg-primary/10
                      shadow-sm
                    "
                  >
                    <Sparkles
                      size={28}
                      className="relative text-primary sm:h-[34px] sm:w-[34px]"
                    />
                  </div>

                  <div
                    className="
                      mb-2 inline-flex
                      items-center gap-1.5
                      rounded-full
                      border
                      bg-card
                      px-3 py-1
                      text-[10px]
                      font-semibold
                      text-muted-foreground
                      backdrop-blur
                    "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Ngâu AI đang sẵn sàng
                  </div>

                  <h1
                    className="
                      text-2xl
                      font-bold
                      tracking-tight
                      sm:text-3xl
                      md:text-4xl
                    "
                  >
                    Bạn muốn hỏi gì?
                  </h1>

                  <p
                    className="
                      mx-auto mt-3
                      max-w-lg
                      text-sm
                      leading-6
                      text-muted-foreground
                    "
                  >
                    Trò chuyện tự do với Ngâu AI.
                    Hỏi bài, lập kế hoạch,
                    brainstorm, viết nội dung
                    hoặc đơn giản là trò chuyện.
                  </p>
                </div>


                {premium && selectedServer === 'gpt' && (
                  <div className="ngau-premium-card mx-auto mb-5 flex max-w-xl items-center gap-3 rounded-2xl px-3.5 py-3 text-left sm:px-4 sm:py-3.5">
                    <div className="ngau-premium-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <BrainCircuit size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold">
                          Ngâu Hub Premium
                        </span>
                        <span className="ngau-premium-pill rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                          GPT
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                        Premium đang hoạt động · bạn đang dùng máy chủ GPT
                      </p>
                    </div>

                    <div className="hidden shrink-0 items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-[9px] font-semibold text-green-600 dark:text-green-400 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      ACTIVE
                    </div>
                  </div>
                )}

                {/* Suggestions */}

                <div
                  className="
                    mt-6
                    grid grid-cols-1 gap-2
                    sm:grid-cols-2 sm:gap-3
                  "
                >
                  {suggestions.map(
                    suggestion => (
                      <button
                        type="button"
                        key={suggestion.title}
                        onClick={() =>
                          useSuggestion(
                            suggestion.title,
                          )
                        }
                        disabled={isLoading}
                        className="
                          group
                          rounded-2xl
                          border
                          bg-card
                          p-3.5
                          text-left
                          shadow-sm
                          transition
                          hover:shadow-md
                          active:translate-y-0
                          disabled:pointer-events-none
                          disabled:opacity-50
                        "
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="
                              flex h-9 w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-muted
                              text-base
                              transition
                            "
                          >
                            {suggestion.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold">
                              {suggestion.title}
                            </div>

                            <div
                              className="
                                mt-1
                                text-xs
                                leading-5
                                text-muted-foreground
                              "
                            >
                              {suggestion.description}
                            </div>
                          </div>

                          <ChevronDown
                            size={15}
                            className="
                              mt-1
                              shrink-0
                              -rotate-90
                              text-muted-foreground
                              hidden md:block
                              opacity-0 transition
                              group-hover:translate-x-0.5
                              group-hover:opacity-100
                            "
                          />
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES */}

          {activeConversation &&
            activeConversation.messages.length >
              0 && (
              <div
                className="
                  mx-auto w-full
                  max-w-3xl
                  px-3 pb-32 pt-5
                  sm:px-4 sm:pb-10 sm:pt-6
                  md:px-6 md:pb-12 md:py-9
                "
              >
                {activeConversation.messages.map(
                  (message, index) => {
                    const isUser =
                      message.role ===
                      'user'

                    const isLast =
                      index ===
                      activeConversation
                        .messages.length -
                        1

                    return (
                      <div
                        key={message.id}
                        className={`
                          group mb-8 flex min-w-0 gap-2.5
                          sm:gap-3 md:mb-9 md:gap-4
                          ${isUser ? 'justify-end md:justify-start' : ''}
                        `}
                      >
                        {/* Avatar */}

                        <div
                          className={`
                            mt-0.5 flex h-8 w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl shadow-sm max-md:hidden
                            ${
                              isUser
                                ? 'bg-muted'
                                : 'bg-primary text-primary-foreground'
                            }
                          `}
                        >
                          {isUser ? (
                            <User size={16} />
                          ) : (
                            <Bot size={17} />
                          )}
                        </div>

                        {/* Content */}

                        <div
                          className={`
                            min-w-0 max-w-full overflow-hidden
                            ${isUser ? 'flex max-w-[88%] flex-col items-end md:block md:max-w-full md:flex-1' : 'flex-1'}
                          `}
                        >
                          <div
                            className={`
                              mb-2 flex items-center gap-2
                              ${isUser ? 'md:justify-start' : ''}
                            `}
                          >
                            <span className="text-sm font-bold">
                              {isUser
                                ? 'Bạn'
                                : 'Ngâu AI'}
                            </span>

                            {!isUser && (
                              <span
                                className={` 
                                  inline-flex items-center gap-1
                                  rounded-full border bg-card
                                  px-1.5 py-0.5
                                  text-[9px] font-semibold
                                  text-muted-foreground
                                  ${!isUser && (message.server || selectedServer) === 'gpt' && premium ? 'ngau-premium-badge' : ''}
                                `}
                              >
                                {React.createElement(
                                  AI_SERVERS[
                                    message.server ||
                                      selectedServer
                                  ].icon,
                                  { size: 10 },
                                )}
                                {
                                  AI_SERVERS[
                                    message.server ||
                                      selectedServer
                                  ].shortName
                                }
                              </span>
                            )}

                            <span
                              className="
                                text-[10px]
                                text-muted-foreground
                              "
                            >
                              {formatTime(
                                message.createdAt,
                              )}
                            </span>
                          </div>

                          {message.imageDataUrl && (
                            <div className="mb-3">
                              <img
                                src={message.imageDataUrl}
                                alt="Ảnh đã gửi"
                                loading="lazy"
                                className="
                                  max-h-80 max-w-full
                                  rounded-2xl border
                                  object-contain
                                "
                              />
                            </div>
                          )}

                          {(message.content || !message.imageDataUrl) && (
                            <div
                              className={`
                                break-words whitespace-pre-wrap
                                text-[15px] leading-7
                                max-w-full
                                ${
                                  isUser
                                    ? 'rounded-[22px] bg-muted px-4 py-2.5 shadow-sm md:rounded-none md:bg-transparent md:px-0 md:py-0 md:shadow-none'
                                    : ''
                                }
                              `}
                            >
                              {isUser
                                ? message.content
                                : renderMessageContent(
                                    message.content,
                                  )}
                            </div>
                          )}

                          {/* Actions */}

                          <div
                            className="
                              mt-2 flex items-center gap-1
                              opacity-100 md:opacity-0 md:transition-opacity
                              md:group-hover:opacity-100
                            "
                          >
                            <button
                              type="button"
                              onClick={() =>
                                void copyMessage(
                                  message,
                                )
                              }
                              className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-lg
                                px-2 py-1
                                text-[10px]
                                text-muted-foreground
                                transition
                                hover:bg-muted
                                hover:text-foreground
                              "
                            >
                              {copiedMessageId ===
                              message.id ? (
                                <>
                                  <Check
                                    size={12}
                                  />
                                  Đã sao chép
                                </>
                              ) : (
                                <>
                                  <Copy
                                    size={12}
                                  />
                                  Sao chép
                                </>
                              )}
                            </button>

                            {!isUser &&
                              isLast && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void regenerateLastResponse()
                                  }
                                  disabled={
                                    isLoading
                                  }
                                  className="
                                    inline-flex
                                    items-center
                                    gap-1.5
                                    rounded-lg
                                    px-2 py-1
                                    text-[10px]
                                    text-muted-foreground
                                    transition
                                    hover:bg-muted
                                    hover:text-foreground
                                    disabled:opacity-40
                                  "
                                >
                                  <RefreshCw
                                    size={12}
                                  />
                                  Tạo lại
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    )
                  },
                )}

                {/* Loading */}

                {isLoading && (
                  <div
                    className="
                      mb-7 flex gap-3
                      md:gap-4
                    "
                  >
                    <div
                      className="
                        flex h-8 w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-primary
                        text-primary-foreground
                        shadow-sm
                      "
                    >
                      <Bot size={17} />
                    </div>

                    <div className="pt-1">
                      <div
                        className="
                          mb-2 text-xs
                          font-semibold
                          text-muted-foreground
                        "
                      >
                        Ngâu AI đang suy nghĩ
                      </div>

                      <div
                        className="
                          flex h-8
                          items-center
                          gap-1.5
                        "
                      >
                        <span
                          className="
                            h-2 w-2
                            animate-bounce
                            rounded-full
                            bg-current
                            opacity-50
                            [animation-delay:-0.3s]
                          "
                        />

                        <span
                          className="
                            h-2 w-2
                            animate-bounce
                            rounded-full
                            bg-current
                            opacity-50
                            [animation-delay:-0.15s]
                          "
                        />

                        <span
                          className="
                            h-2 w-2
                            animate-bounce
                            rounded-full
                            bg-current
                            opacity-50
                          "
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
        </div>

        {showScrollToBottom && (
          <button
            type="button"
            onClick={() => {
              stickToBottomRef.current = true
              setShowScrollToBottom(false)
              scrollToBottom('smooth')
            }}
            aria-label="Xuống tin nhắn mới nhất"
            className="absolute bottom-24 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border bg-background/95 text-foreground shadow-lg backdrop-blur-sm transition active:scale-95"
          >
            <ChevronDown size={18} />
          </button>
        )}

        {/* =================================================
            INPUT AREA
        ================================================= */}

        <div
          className="
            relative z-20
            shrink-0
            border-t
            bg-background
            px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2
            sm:px-3 sm:pb-3
            md:px-5 md:pb-5
          "
        >
          <div className="mx-auto w-full max-w-3xl">
            {pendingImage && (
              <div
                className="
                  mb-2 flex items-center gap-2
                  rounded-2xl border bg-card p-2 shadow-sm
                "
              >
                <img
                  src={pendingImage}
                  alt="Ảnh sắp gửi"
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">
                    Ảnh đính kèm
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Ngâu AI sẽ xem ảnh cùng tin nhắn.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="rounded-xl p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Bỏ ảnh"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            <div
              ref={inputWrapperRef}
              className={`
                relative
                rounded-2xl
                border
                bg-card
                p-2
                shadow-sm
                focus-within:border-primary/40
                ${premium && selectedServer === 'gpt' ? 'ngau-premium-input' : ''}
              `}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
              />

              <div className="flex items-end gap-1">
                <div className="flex shrink-0 items-center gap-0.5 pb-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isLoading}
                    className="
                      flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-xl text-muted-foreground
                      hover:bg-muted hover:text-foreground
                      disabled:opacity-40
                    "
                    aria-label="Tải ảnh lên"
                    title="Tải ảnh lên"
                  >
                    <Paperclip size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isLoading}
                    className="
                      flex h-9 w-9 shrink-0 items-center justify-center
                      rounded-xl text-muted-foreground
                      hover:bg-muted hover:text-foreground
                      disabled:opacity-40
                    "
                    aria-label="Chụp ảnh"
                    title="Chụp ảnh"
                  >
                    <Camera size={19} />
                  </button>
                </div>

                <textarea
                  ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Nhắn tin với Ngâu AI..."
                rows={1}
                disabled={isLoading}
                className="
                  max-h-[180px]
                  min-h-[44px]
                  w-full
                  resize-none
                  overflow-y-auto
                  bg-transparent
                  min-w-0
                  px-2
                  py-2.5
                  pr-12
                  sm:px-3 sm:pr-14
                  text-sm
                  leading-6
                  outline-none
                  placeholder:text-muted-foreground
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
                />

              </div>

              <button
                type="button"
                onClick={() =>
                  void sendMessage()
                }
                disabled={
                  (!input.trim() && !pendingImage) ||
                  isLoading
                }
                className="
                  absolute
                  bottom-2.5
                  right-2.5
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary
                  text-primary-foreground
                  shadow-sm
                  transition-opacity
                  hover:opacity-90
                  active:opacity-80
                  disabled:cursor-not-allowed
                  disabled:opacity-30
                  sm:h-10 sm:w-10
                "
                aria-label="Gửi tin nhắn"
              >
                {isLoading ? (
                  <span
                    className="
                      h-4 w-4
                      animate-spin
                      rounded-full
                      border-2
                      border-current
                      border-t-transparent
                    "
                  />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </div>

            <div
              className="
                mt-2 flex
                items-center
                justify-center
                flex-wrap gap-x-1.5 gap-y-0.5
                text-center text-[10px]
                text-muted-foreground
              "
            >
              <span className="hidden sm:inline">Enter để gửi • Shift + Enter để xuống dòng</span>
              <span>Ngâu AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.</span>

              {premium && (
                <>
                  <span>•</span>
                  <span
                    className="
                      inline-flex items-center
                      gap-1 font-medium
                      text-primary
                    "
                  >
                    <Zap size={9} />
                    Premium
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </main>


      <style>{`
        .ngau-ai-scrollbar {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          touch-action: pan-y;
          scrollbar-width: none;
        }

        .ngau-ai-scrollbar::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        @media (max-width: 767px) {
          .ngau-ai-scrollbar {
            scroll-padding-bottom: 120px;
          }
        }

        /* =================================================
           PREMIUM UI
           Tĩnh + nhẹ: không particle, không animation nền,
           không filter/backdrop blur nặng.
        ================================================= */

        /* =====================================================
           NGÂU HUB PREMIUM — ULTIMATE / ADAPTIVE
           Sáng: pearl + royal violet + cyan
           Tối: deep indigo + violet + electric cyan
           Chỉ CSS tĩnh để giữ FPS ổn định.
           ===================================================== */
        .ngau-ai-premium {
          position: relative;
          isolation: isolate;
          color: #172033;
          background:
            radial-gradient(900px 520px at 0% -8%, rgba(124,58,237,.20), transparent 66%),
            radial-gradient(760px 440px at 100% 0%, rgba(6,182,212,.16), transparent 64%),
            radial-gradient(820px 460px at 52% 108%, rgba(99,102,241,.14), transparent 68%),
            linear-gradient(135deg, #f8f4ff 0%, #f3f6ff 44%, #effcff 100%);
          transition: background-color .2s ease, color .2s ease;
        }

        .ngau-ai-premium::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          z-index: 60;
          height: 3px;
          pointer-events: none;
          background: linear-gradient(90deg, #4c1d95 0%, #7c3aed 24%, #4f46e5 48%, #06b6d4 73%, #8b5cf6 100%);
        }

        .ngau-ai-premium::after {
          content: "";
          position: absolute;
          inset: 3px 0 auto;
          height: 180px;
          z-index: -1;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,.24), transparent);
        }

        .ngau-ai-premium header {
          background: rgba(250,249,255,.86) !important;
          border-color: rgba(109,40,217,.14) !important;
          box-shadow: 0 6px 28px rgba(76,29,149,.07);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .ngau-ai-premium aside {
          background:
            linear-gradient(180deg, rgba(250,248,255,.97), rgba(244,248,255,.97)) !important;
          border-color: rgba(109,40,217,.14) !important;
        }

        .ngau-ai-premium .ngau-premium-selector {
          border-color: rgba(124,58,237,.34) !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,.98), rgba(246,241,255,.96) 55%, rgba(240,251,255,.94)) !important;
          color: #4c1d95;
          box-shadow:
            0 8px 26px rgba(76,29,149,.13),
            inset 0 1px 0 rgba(255,255,255,.98);
        }

        .ngau-ai-premium .ngau-premium-selector:hover {
          border-color: rgba(124,58,237,.58) !important;
          transform: translateY(-1px);
          box-shadow:
            0 12px 34px rgba(76,29,149,.18),
            inset 0 1px 0 rgba(255,255,255,1);
        }

        .ngau-premium-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(124,58,237,.22) !important;
          background:
            linear-gradient(135deg,
              rgba(255,255,255,.98) 0%,
              rgba(248,243,255,.97) 42%,
              rgba(239,248,255,.96) 100%) !important;
          box-shadow:
            0 20px 55px rgba(76,29,149,.15),
            0 4px 15px rgba(15,23,42,.05),
            inset 0 1px 0 rgba(255,255,255,1);
        }

        .ngau-premium-card::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #7c3aed, #4f46e5, #06b6d4);
          pointer-events: none;
        }

        .ngau-premium-card::after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          right: -110px;
          top: -125px;
          border-radius: 999px;
          pointer-events: none;
          background:
            radial-gradient(circle, rgba(6,182,212,.22), rgba(139,92,246,.08) 38%, transparent 70%);
        }

        .ngau-premium-orb {
          color: #fff !important;
          background:
            radial-gradient(circle at 30% 20%, #ede9fe 0%, #c4b5fd 18%, #8b5cf6 43%, #6d28d9 68%, #312e81 100%) !important;
          box-shadow:
            0 13px 34px rgba(109,40,217,.34),
            0 0 0 6px rgba(124,58,237,.07),
            inset 0 2px 5px rgba(255,255,255,.62);
        }

        .ngau-premium-pill,
        .ngau-premium-badge {
          color: #6d28d9 !important;
          border: 1px solid rgba(124,58,237,.25) !important;
          background:
            linear-gradient(135deg, rgba(124,58,237,.15), rgba(79,70,229,.09) 55%, rgba(6,182,212,.13)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.88),
            0 3px 10px rgba(76,29,149,.07);
        }

        .ngau-premium-icon {
          color: #7c3aed !important;
          filter: drop-shadow(0 4px 9px rgba(124,58,237,.28));
        }

        .ngau-premium-input {
          border-color: rgba(124,58,237,.29) !important;
          background:
            linear-gradient(135deg, rgba(255,255,255,.99), rgba(249,246,255,.98) 55%, rgba(243,251,255,.97)) !important;
          box-shadow:
            0 10px 32px rgba(76,29,149,.10),
            inset 0 1px 0 rgba(255,255,255,1);
        }

        .ngau-premium-input:focus-within {
          border-color: rgba(124,58,237,.58) !important;
          box-shadow:
            0 0 0 3px rgba(124,58,237,.10),
            0 14px 34px rgba(76,29,149,.14),
            inset 0 1px 0 rgba(255,255,255,1);
        }

        .ngau-ai-premium .text-primary {
          color: #6d28d9 !important;
        }

        .ngau-ai-premium .bg-primary {
          background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 55%, #0891b2 100%) !important;
          box-shadow: 0 8px 23px rgba(79,70,229,.27);
        }

        .ngau-ai-premium .border-primary {
          border-color: rgba(124,58,237,.40) !important;
        }

        /* Dark theme — tự thích ứng với Appearance = Dark trong Settings. */
        .dark .ngau-ai-premium,
        [data-theme="dark"] .ngau-ai-premium {
          color: #eef2ff;
          background:
            radial-gradient(900px 520px at 0% -8%, rgba(124,58,237,.30), transparent 65%),
            radial-gradient(760px 440px at 100% 0%, rgba(6,182,212,.22), transparent 63%),
            radial-gradient(820px 460px at 52% 108%, rgba(99,102,241,.20), transparent 68%),
            linear-gradient(135deg, #09071a 0%, #0d1026 48%, #071923 100%);
        }

        .dark .ngau-ai-premium::after,
        [data-theme="dark"] .ngau-ai-premium::after {
          background: linear-gradient(180deg, rgba(139,92,246,.08), transparent);
        }

        .dark .ngau-ai-premium header,
        [data-theme="dark"] .ngau-ai-premium header {
          background: rgba(10,9,27,.78) !important;
          border-color: rgba(139,92,246,.20) !important;
          box-shadow: 0 7px 30px rgba(0,0,0,.24);
        }

        .dark .ngau-ai-premium aside,
        [data-theme="dark"] .ngau-ai-premium aside {
          background: linear-gradient(180deg, rgba(12,10,30,.98), rgba(8,16,30,.98)) !important;
          border-color: rgba(139,92,246,.18) !important;
        }

        .dark .ngau-ai-premium .ngau-premium-selector,
        [data-theme="dark"] .ngau-ai-premium .ngau-premium-selector {
          color: #ddd6fe;
          border-color: rgba(139,92,246,.40) !important;
          background: linear-gradient(135deg, rgba(31,22,65,.92), rgba(18,29,62,.94), rgba(8,42,53,.90)) !important;
          box-shadow: 0 9px 28px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.05);
        }

        .dark .ngau-premium-card,
        [data-theme="dark"] .ngau-premium-card {
          border-color: rgba(139,92,246,.30) !important;
          background:
            linear-gradient(135deg, rgba(29,20,59,.96), rgba(18,22,55,.96) 48%, rgba(7,35,49,.96)) !important;
          box-shadow:
            0 22px 58px rgba(0,0,0,.30),
            inset 0 1px 0 rgba(255,255,255,.06);
        }

        .dark .ngau-premium-pill,
        .dark .ngau-premium-badge,
        [data-theme="dark"] .ngau-premium-pill,
        [data-theme="dark"] .ngau-premium-badge {
          color: #c4b5fd !important;
          border-color: rgba(139,92,246,.30) !important;
          background: linear-gradient(135deg, rgba(124,58,237,.24), rgba(79,70,229,.15), rgba(6,182,212,.16)) !important;
        }

        .dark .ngau-premium-input,
        [data-theme="dark"] .ngau-premium-input {
          border-color: rgba(139,92,246,.32) !important;
          background: linear-gradient(135deg, rgba(18,15,38,.98), rgba(24,25,55,.98), rgba(8,31,43,.98)) !important;
          box-shadow: 0 11px 34px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.05);
        }

        .dark .ngau-premium-input:focus-within,
        [data-theme="dark"] .ngau-premium-input:focus-within {
          border-color: rgba(167,139,250,.66) !important;
          box-shadow:
            0 0 0 3px rgba(139,92,246,.14),
            0 15px 38px rgba(0,0,0,.30);
        }

        .dark .ngau-ai-premium .text-primary,
        [data-theme="dark"] .ngau-ai-premium .text-primary {
          color: #c4b5fd !important;
        }

        .dark .ngau-ai-premium .bg-primary,
        [data-theme="dark"] .ngau-ai-premium .bg-primary {
          background: linear-gradient(135deg, #7c3aed, #4f46e5 58%, #0891b2) !important;
          box-shadow: 0 9px 25px rgba(79,70,229,.34);
        }

        /* Mobile: giữ chiều sâu màu nhưng giảm vùng gradient để nhẹ máy. */
        @media (max-width: 767px) {
          .ngau-ai-premium {
            background:
              radial-gradient(470px 250px at 100% -5%, rgba(6,182,212,.12), transparent 70%),
              radial-gradient(500px 270px at 0% 0%, rgba(124,58,237,.14), transparent 70%),
              linear-gradient(145deg, #faf8ff 0%, #f5f8ff 100%);
          }

          .dark .ngau-ai-premium,
          [data-theme="dark"] .ngau-ai-premium {
            background:
              radial-gradient(470px 250px at 100% -5%, rgba(6,182,212,.17), transparent 70%),
              radial-gradient(500px 270px at 0% 0%, rgba(124,58,237,.23), transparent 70%),
              linear-gradient(145deg, #09071a 0%, #091427 100%);
          }

          .ngau-ai-premium header {
            background: rgba(250,249,255,.94) !important;
          }

          .dark .ngau-ai-premium header,
          [data-theme="dark"] .ngau-ai-premium header {
            background: rgba(10,9,27,.90) !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ngau-ai-premium *,
          .ngau-ai-premium *::before,
          .ngau-ai-premium *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

    </div>
  )
}

export default NgauAI