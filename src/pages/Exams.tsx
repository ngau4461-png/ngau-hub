import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Image as ImageIcon,
  Upload,
  Save,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  RotateCcw,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Check,
  Trophy,
  BookOpen,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/utils/helpers'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type ExamMode = 'list' | 'editor' | 'taking' | 'result'

interface Answer {
  id: string
  text: string
  image: string
  isCorrect: boolean
}

interface Question {
  id: string
  text: string
  image: string
  answers: Answer[]
}

interface Exam {
  id: string
  title: string
  description: string
  timeLimit: number
  questions: Question[]
  createdAt: string
  updatedAt: string
  attempts: number
  bestScore: number | null
}

interface AttemptAnswer {
  questionId: string
  selectedAnswerId: string | null
  correctAnswerId: string
  isCorrect: boolean
}

interface ExamResult {
  examId: string
  score: number
  correct: number
  total: number
  answers: AttemptAnswer[]
}

interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

interface ExamForm {
  title: string
  description: string
  timeLimit: number
  questions: Question[]
}

const STORAGE_KEY = 'studyhub_exams_v1'

let toastId = 0

const createId = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const createAnswer = (index = 0): Answer => ({
  id: createId(`answer${index}`),
  text: '',
  image: '',
  isCorrect: index === 0,
})

const createQuestion = (): Question => ({
  id: createId('question'),
  text: '',
  image: '',
  answers: [
    createAnswer(0),
    createAnswer(1),
    createAnswer(2),
    createAnswer(3),
  ],
})

const createEmptyForm = (): ExamForm => ({
  title: '',
  description: '',
  timeLimit: 0,
  questions: [createQuestion()],
})

const shuffleArray = <T,>(array: T[]): T[] => {
  const result = [...array]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const secs = safe % 60

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const getAnswerLetter = (index: number) =>
  String.fromCharCode(65 + index)

const Exams: React.FC = () => {
  const [mode, setMode] = useState<ExamMode>('list')
  const [exams, setExams] = useState<Exam[]>([])
  const [search, setSearch] = useState('')

  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [form, setForm] = useState<ExamForm>(createEmptyForm())

  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)

  const [takingQuestions, setTakingQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({})
  const [examSecondsLeft, setExamSecondsLeft] = useState(0)
  const [shuffleEnabled, setShuffleEnabled] = useState(true)
  const [takeWrongOnly, setTakeWrongOnly] = useState(false)

  const [result, setResult] = useState<ExamResult | null>(null)

  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [processingImages, setProcessingImages] = useState(false)

  const questionImageRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({})

  const answerImageRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({})

  // =========================================================
  // LOAD / SAVE LOCAL STORAGE
  // =========================================================

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)

      if (!saved) return

      const parsed = JSON.parse(saved)

      if (Array.isArray(parsed)) {
        setExams(parsed)
      }
    } catch (error) {
      console.error('Không thể đọc dữ liệu đề thi:', error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exams))
    } catch (error) {
      console.error('Không thể lưu đề thi:', error)

      if (exams.length > 0) {
        showToast(
          'error',
          'Không thể lưu dữ liệu. Có thể ảnh đang quá lớn.'
        )
      }
    }
  }, [exams])

  // =========================================================
  // TOAST
  // =========================================================

  const showToast = (type: ToastType, message: string) => {
    const id = ++toastId

    setToasts(prev => [
      ...prev,
      {
        id,
        type,
        message,
      },
    ])

    window.setTimeout(() => {
      setToasts(prev => prev.filter(item => item.id !== id))
    }, 3000)
  }

  // =========================================================
  // FILTER
  // =========================================================

  const filteredExams = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return exams

    return exams.filter(exam => {
      return (
        exam.title.toLowerCase().includes(keyword) ||
        exam.description.toLowerCase().includes(keyword)
      )
    })
  }, [exams, search])

  // =========================================================
  // CREATE / EDIT
  // =========================================================

  const openCreate = () => {
    setEditingExamId(null)
    setForm(createEmptyForm())
    setMode('editor')
  }

  const openEdit = (exam: Exam) => {
    setEditingExamId(exam.id)

    setForm({
      title: exam.title,
      description: exam.description,
      timeLimit: exam.timeLimit,
      questions: JSON.parse(JSON.stringify(exam.questions)),
    })

    setMode('editor')
  }

  const closeEditor = () => {
    if (processingImages) return

    setEditingExamId(null)
    setForm(createEmptyForm())
    setMode('list')
  }

  // =========================================================
  // QUESTIONS
  // =========================================================

  const addQuestion = () => {
    setForm(prev => ({
      ...prev,
      questions: [...prev.questions, createQuestion()],
    }))
  }

  const removeQuestion = (questionId: string) => {
    if (form.questions.length <= 1) {
      showToast('warning', 'Đề thi phải có ít nhất 1 câu hỏi.')
      return
    }

    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter(
        question => question.id !== questionId
      ),
    }))
  }

  const updateQuestion = (
    questionId: string,
    changes: Partial<Question>
  ) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(question =>
        question.id === questionId
          ? {
              ...question,
              ...changes,
            }
          : question
      ),
    }))
  }

  // =========================================================
  // ANSWERS
  // =========================================================

  const updateAnswer = (
    questionId: string,
    answerId: string,
    changes: Partial<Answer>
  ) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(question => {
        if (question.id !== questionId) return question

        return {
          ...question,
          answers: question.answers.map(answer =>
            answer.id === answerId
              ? {
                  ...answer,
                  ...changes,
                }
              : answer
          ),
        }
      }),
    }))
  }

  const setCorrectAnswer = (
    questionId: string,
    answerId: string
  ) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.map(question => {
        if (question.id !== questionId) return question

        return {
          ...question,
          answers: question.answers.map(answer => ({
            ...answer,
            isCorrect: answer.id === answerId,
          })),
        }
      }),
    }))
  }

  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const readImageAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Không thể đọc ảnh'))
        }
      }

      reader.onerror = () => {
        reject(reader.error || new Error('Không thể đọc file'))
      }

      reader.readAsDataURL(file)
    })
  }

  const handleQuestionImage = async (
    questionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (processingImages) return

    const file = e.target.files?.[0]

    if (e.target) {
      e.target.value = ''
    }

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('warning', 'Vui lòng chọn file hình ảnh.')
      return
    }

    // 10MB / ảnh
    if (file.size > 10 * 1024 * 1024) {
      showToast(
        'warning',
        'Ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB.'
      )
      return
    }

    try {
      setProcessingImages(true)

      const base64 = await readImageAsBase64(file)

      updateQuestion(questionId, {
        image: base64,
      })

      showToast('success', 'Đã thêm ảnh vào câu hỏi.')
    } catch (error) {
      console.error(error)
      showToast('error', 'Không thể đọc ảnh.')
    } finally {
      setProcessingImages(false)
    }
  }

  const handleAnswerImage = async (
    questionId: string,
    answerId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (processingImages) return

    const file = e.target.files?.[0]

    if (e.target) {
      e.target.value = ''
    }

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('warning', 'Vui lòng chọn file hình ảnh.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast(
        'warning',
        'Ảnh quá lớn. Vui lòng chọn ảnh dưới 10MB.'
      )
      return
    }

    try {
      setProcessingImages(true)

      const base64 = await readImageAsBase64(file)

      updateAnswer(questionId, answerId, {
        image: base64,
      })

      showToast('success', 'Đã thêm ảnh vào đáp án.')
    } catch (error) {
      console.error(error)
      showToast('error', 'Không thể đọc ảnh.')
    } finally {
      setProcessingImages(false)
    }
  }

  const removeQuestionImage = (questionId: string) => {
    updateQuestion(questionId, {
      image: '',
    })
  }

  const removeAnswerImage = (
    questionId: string,
    answerId: string
  ) => {
    updateAnswer(questionId, answerId, {
      image: '',
    })
  }

  // =========================================================
  // SAVE EXAM
  // =========================================================

  const handleSaveExam = () => {
    if (processingImages) {
      showToast(
        'warning',
        'Đang xử lý ảnh, vui lòng chờ...'
      )
      return
    }

    if (!form.title.trim()) {
      showToast('warning', 'Vui lòng nhập tên đề thi.')
      return
    }

    if (form.questions.length === 0) {
      showToast('warning', 'Đề thi chưa có câu hỏi.')
      return
    }

    for (let i = 0; i < form.questions.length; i++) {
      const question = form.questions[i]

      if (
        !question.text.trim() &&
        !question.image
      ) {
        showToast(
          'warning',
          `Câu ${i + 1} chưa có nội dung hoặc ảnh.`
        )
        return
      }

      if (question.answers.length < 2) {
        showToast(
          'warning',
          `Câu ${i + 1} phải có ít nhất 2 đáp án.`
        )
        return
      }

      const hasCorrect = question.answers.some(
        answer => answer.isCorrect
      )

      if (!hasCorrect) {
        showToast(
          'warning',
          `Câu ${i + 1} chưa chọn đáp án đúng.`
        )
        return
      }

      const hasAnswerContent = question.answers.some(
        answer => answer.text.trim() || answer.image
      )

      if (!hasAnswerContent) {
        showToast(
          'warning',
          `Câu ${i + 1} chưa có đáp án.`
        )
        return
      }
    }

    try {
      const now = new Date().toISOString()

      if (editingExamId) {
        setExams(prev =>
          prev.map(exam =>
            exam.id === editingExamId
              ? {
                  ...exam,
                  title: form.title.trim(),
                  description: form.description.trim(),
                  timeLimit: Math.max(
                    0,
                    Number(form.timeLimit) || 0
                  ),
                  questions: form.questions,
                  updatedAt: now,
                }
              : exam
          )
        )

        showToast('success', 'Đã cập nhật đề thi.')
      } else {
        const newExam: Exam = {
          id: createId('exam'),
          title: form.title.trim(),
          description: form.description.trim(),
          timeLimit: Math.max(
            0,
            Number(form.timeLimit) || 0
          ),
          questions: form.questions,
          createdAt: now,
          updatedAt: now,
          attempts: 0,
          bestScore: null,
        }

        setExams(prev => [newExam, ...prev])

        showToast('success', 'Đã tạo đề thi.')
      }

      setEditingExamId(null)
      setForm(createEmptyForm())
      setMode('list')
    } catch (error) {
      console.error('Lỗi lưu đề:', error)

      showToast(
        'error',
        'Không thể lưu đề thi.'
      )
    }
  }

  // =========================================================
  // DELETE
  // =========================================================

  const deleteExam = (examId: string) => {
    const exam = exams.find(item => item.id === examId)

    if (!exam) return

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa đề "${exam.title}"?`
    )

    if (!confirmed) return

    setExams(prev =>
      prev.filter(item => item.id !== examId)
    )

    showToast('success', 'Đã xóa đề thi.')
  }

  // =========================================================
  // START EXAM
  // =========================================================

  const startExam = (
    exam: Exam,
    wrongOnly = false
  ) => {
    let questions = [...exam.questions]

    if (
      wrongOnly &&
      result &&
      result.examId === exam.id
    ) {
      const wrongIds = new Set(
        result.answers
          .filter(answer => !answer.isCorrect)
          .map(answer => answer.questionId)
      )

      questions = questions.filter(question =>
        wrongIds.has(question.id)
      )
    }

    if (questions.length === 0) {
      showToast(
        'info',
        'Không còn câu sai để làm lại.'
      )
      return
    }

    if (shuffleEnabled) {
      questions = shuffleArray(
        questions.map(question => ({
          ...question,
          answers: shuffleArray(question.answers),
        }))
      )
    }

    setSelectedExam(exam)
    setTakingQuestions(questions)
    setCurrentQuestion(0)
    setSelectedAnswers({})
    setTakeWrongOnly(wrongOnly)
    setResult(null)

    if (exam.timeLimit > 0) {
      setExamSecondsLeft(exam.timeLimit * 60)
    } else {
      setExamSecondsLeft(0)
    }

    setMode('taking')
  }

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    if (mode !== 'taking') return
    if (!selectedExam) return
    if (selectedExam.timeLimit <= 0) return
    if (examSecondsLeft <= 0) return

    const timer = window.setInterval(() => {
      setExamSecondsLeft(prev => {
        if (prev <= 1) {
          window.clearInterval(timer)

          setTimeout(() => {
            submitExam()
          }, 0)

          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [
    mode,
    selectedExam,
    examSecondsLeft,
  ])

  // =========================================================
  // ANSWER QUESTION
  // =========================================================

  const chooseAnswer = (
    questionId: string,
    answerId: string
  ) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId,
    }))
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  const submitExam = () => {
    if (!selectedExam) return

    const attemptAnswers: AttemptAnswer[] =
      takingQuestions.map(question => {
        const selectedId =
          selectedAnswers[question.id] || null

        const correctAnswer =
          question.answers.find(
            answer => answer.isCorrect
          )

        const correctId =
          correctAnswer?.id || ''

        return {
          questionId: question.id,
          selectedAnswerId: selectedId,
          correctAnswerId: correctId,
          isCorrect:
            !!selectedId &&
            selectedId === correctId,
        }
      })

    const correct = attemptAnswers.filter(
      answer => answer.isCorrect
    ).length

    const total = attemptAnswers.length

    const score =
      total > 0
        ? Math.round((correct / total) * 100)
        : 0

    const newResult: ExamResult = {
      examId: selectedExam.id,
      score,
      correct,
      total,
      answers: attemptAnswers,
    }

    setResult(newResult)

    setExams(prev =>
      prev.map(exam =>
        exam.id === selectedExam.id
          ? {
              ...exam,
              attempts: exam.attempts + 1,
              bestScore:
                exam.bestScore === null
                  ? score
                  : Math.max(exam.bestScore, score),
              updatedAt: new Date().toISOString(),
            }
          : exam
      )
    )

    setMode('result')
  }

  // =========================================================
  // EXIT TAKING
  // =========================================================

  const exitTaking = () => {
    const confirmed = window.confirm(
      'Bạn chưa nộp bài. Thoát sẽ mất tiến trình hiện tại. Tiếp tục?'
    )

    if (!confirmed) return

    setSelectedExam(null)
    setTakingQuestions([])
    setSelectedAnswers({})
    setCurrentQuestion(0)
    setExamSecondsLeft(0)
    setMode('list')
  }

  // =========================================================
  // IMAGE VIEWER
  // =========================================================

  const openImage = (image: string) => {
    if (image) {
      setViewingImage(image)
    }
  }

  // =========================================================
  // RENDER ANSWER IMAGE
  // =========================================================

  const AnswerImage = ({
    answer,
  }: {
    answer: Answer
  }) => {
    if (!answer.image) return null

    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <img
          src={answer.image}
          alt="Ảnh đáp án"
          className="max-h-48 w-full cursor-pointer object-contain bg-gray-50 dark:bg-gray-900"
          onClick={e => {
            e.stopPropagation()
            openImage(answer.image)
          }}
          onError={e => {
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // =========================================================
  // TOAST UI
  // =========================================================

  const ToastContainer = () => (
    <div className="pointer-events-none fixed right-4 top-4 z-[500] flex w-full max-w-sm flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl',
            toast.type === 'success' &&
              'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200',
            toast.type === 'error' &&
              'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200',
            toast.type === 'warning' &&
              'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
            toast.type === 'info' &&
              'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
          )}
        >
          {toast.type === 'success' && (
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
          )}

          {toast.type === 'error' && (
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          )}

          {toast.type === 'warning' && (
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
          )}

          {toast.type === 'info' && (
            <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          )}

          <div className="flex-1 text-sm font-medium">
            {toast.message}
          </div>

          <button
            type="button"
            onClick={() =>
              setToasts(prev =>
                prev.filter(item => item.id !== toast.id)
              )
            }
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )

  // =========================================================
  // LIST PAGE
  // =========================================================

  const renderList = () => {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <ToastContainer />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-soft">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Đề thi trắc nghiệm
              </h1>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tự tạo đề và ôn tập đi ôn tập lại
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Tạo đề thi
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tổng đề
                </p>

                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {exams.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tổng câu hỏi
                </p>

                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {exams.reduce(
                    (sum, exam) =>
                      sum + exam.questions.length,
                    0
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Trophy className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Lần làm bài
                </p>

                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {exams.reduce(
                    (sum, exam) =>
                      sum + exam.attempts,
                    0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm đề thi..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filteredExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {search
                ? 'Không tìm thấy đề thi'
                : 'Chưa có đề thi'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
              {search
                ? 'Thử tìm kiếm bằng từ khóa khác.'
                : 'Tạo đề thi đầu tiên để bắt đầu ôn tập.'}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
                Tạo đề đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredExams.map(exam => (
              <div
                key={exam.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(exam)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteExam(exam.id)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h2 className="line-clamp-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                    {exam.title}
                  </h2>

                  <p className="mt-2 line-clamp-2 min-h-[40px] text-sm text-gray-500 dark:text-gray-400">
                    {exam.description ||
                      'Chưa có mô tả.'}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                      <p className="text-xs text-gray-400">
                        Câu hỏi
                      </p>

                      <p className="mt-1 font-bold text-gray-900 dark:text-white">
                        {exam.questions.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-900">
                      <p className="text-xs text-gray-400">
                        Thời gian
                      </p>

                      <p className="mt-1 font-bold text-gray-900 dark:text-white">
                        {exam.timeLimit > 0
                          ? `${exam.timeLimit} phút`
                          : 'Không giới hạn'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Đã làm: {exam.attempts}
                    </span>

                    {exam.bestScore !== null && (
                      <span className="rounded-lg bg-green-50 px-2.5 py-1.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        Cao nhất: {exam.bestScore}%
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShuffleEnabled(true)
                        startExam(exam)
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <Play className="h-4 w-4" />
                      Làm bài
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(exam)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // =========================================================
  // EDITOR PAGE
  // =========================================================

  const renderEditor = () => {
    return (
      <div className="min-h-full bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
        <ToastContainer />

        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingExamId
                    ? 'Chỉnh sửa đề thi'
                    : 'Tạo đề thi'}
                </h1>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nhập câu hỏi, đáp án và ảnh
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveExam}
              disabled={processingImages}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {processingImages
                ? 'Đang xử lý...'
                : 'Lưu đề thi'}
            </button>
          </div>

          <div className="space-y-5">
            {/* EXAM INFO */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Thông tin đề thi
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Đặt tên và thời gian làm bài
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tên đề thi *
                  </label>

                  <input
                    value={form.title}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Hóa học - Chương 1"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Thời gian
                  </label>

                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      type="number"
                      min={0}
                      value={form.timeLimit}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          timeLimit: Number(
                            e.target.value
                          ),
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    0 = không giới hạn
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mô tả
                </label>

                <textarea
                  value={form.description}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Ví dụ: Đề ôn tập phản ứng hóa học..."
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* QUESTIONS */}
            {form.questions.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700 md:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {questionIndex + 1}
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        Câu hỏi {questionIndex + 1}
                      </h3>

                      <p className="text-xs text-gray-400">
                        Chọn một đáp án đúng
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeQuestion(question.id)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-5 p-5 md:p-6">
                  {/* QUESTION TEXT */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nội dung câu hỏi
                    </label>

                    <textarea
                      value={question.text}
                      onChange={e =>
                        updateQuestion(
                          question.id,
                          {
                            text: e.target.value,
                          }
                        )
                      }
                      rows={4}
                      placeholder="Nhập câu hỏi..."
                      className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* QUESTION IMAGE */}
                  {question.image ? (
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                      <img
                        src={question.image}
                        alt="Ảnh câu hỏi"
                        className="max-h-80 w-full cursor-pointer object-contain"
                        onClick={() =>
                          openImage(question.image)
                        }
                      />

                      <div className="absolute right-3 top-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openImage(question.image)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeQuestionImage(
                              question.id
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={element => {
                          questionImageRefs.current[
                            question.id
                          ] = element
                        }}
                        onChange={e =>
                          handleQuestionImage(
                            question.id,
                            e
                          )
                        }
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          questionImageRefs.current[
                            question.id
                          ]?.click()
                        }
                        disabled={processingImages}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm font-medium text-gray-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                      >
                        <Upload className="h-5 w-5" />
                        Thêm ảnh cho câu hỏi
                      </button>
                    </div>
                  )}

                  {/* ANSWERS */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Các đáp án
                      </label>

                      <span className="text-xs text-gray-400">
                        Nhấn vào ✓ để chọn đáp án đúng
                      </span>
                    </div>

                    <div className="space-y-3">
                      {question.answers.map(
                        (answer, answerIndex) => (
                          <div
                            key={answer.id}
                            className={cn(
                              'rounded-2xl border p-3 transition',
                              answer.isCorrect
                                ? 'border-green-300 bg-green-50/70 dark:border-green-800 dark:bg-green-900/10'
                                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setCorrectAnswer(
                                    question.id,
                                    answer.id
                                  )
                                }
                                className={cn(
                                  'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition',
                                  answer.isCorrect
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-300 bg-white text-gray-500 hover:border-green-400 hover:text-green-600 dark:border-gray-600 dark:bg-gray-800'
                                )}
                                title={
                                  answer.isCorrect
                                    ? 'Đáp án đúng'
                                    : 'Chọn làm đáp án đúng'
                                }
                              >
                                {answer.isCorrect ? (
                                  <Check className="h-5 w-5" />
                                ) : (
                                  getAnswerLetter(
                                    answerIndex
                                  )
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <input
                                  value={answer.text}
                                  onChange={e =>
                                    updateAnswer(
                                      question.id,
                                      answer.id,
                                      {
                                        text: e.target
                                          .value,
                                      }
                                    )
                                  }
                                  placeholder={`Đáp án ${getAnswerLetter(
                                    answerIndex
                                  )}`}
                                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                />

                                {answer.image ? (
                                  <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                                    <img
                                      src={answer.image}
                                      alt={`Ảnh đáp án ${getAnswerLetter(
                                        answerIndex
                                      )}`}
                                      className="max-h-48 w-full cursor-pointer object-contain"
                                      onClick={() =>
                                        openImage(
                                          answer.image
                                        )
                                      }
                                    />

                                    <div className="absolute right-2 top-2 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openImage(
                                            answer.image
                                          )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeAnswerImage(
                                            question.id,
                                            answer.id
                                          )
                                        }
                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      ref={element => {
                                        answerImageRefs.current[
                                          answer.id
                                        ] = element
                                      }}
                                      onChange={e =>
                                        handleAnswerImage(
                                          question.id,
                                          answer.id,
                                          e
                                        )
                                      }
                                      className="hidden"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        answerImageRefs.current[
                                          answer.id
                                        ]?.click()
                                      }
                                      disabled={
                                        processingImages
                                      }
                                      className="mt-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 hover:text-blue-600 dark:hover:bg-gray-700"
                                    >
                                      <ImageIcon className="h-4 w-4" />
                                      Thêm ảnh đáp án
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ADD QUESTION */}
            <button
              type="button"
              onClick={addQuestion}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white py-5 text-sm font-semibold text-gray-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
            >
              <Plus className="h-5 w-5" />
              Thêm câu hỏi
            </button>

            {/* BOTTOM SAVE */}
            <div className="flex justify-end gap-3 pb-6">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveExam}
                disabled={processingImages}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                Lưu đề thi
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================
  // TAKING EXAM
  // =========================================================

  const renderTaking = () => {
    if (!selectedExam || takingQuestions.length === 0) {
      return null
    }

    const question =
      takingQuestions[currentQuestion]

    const selected =
      selectedAnswers[question.id]

    const answeredCount = Object.keys(
      selectedAnswers
    ).filter(questionId =>
      takingQuestions.some(
        item => item.id === questionId
      )
    ).length

    const progress =
      ((currentQuestion + 1) /
        takingQuestions.length) *
      100

    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-950">
        <ToastContainer />

        {/* TOP BAR */}
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto max-w-5xl px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                  {selectedExam.title}
                </p>

                <p className="text-xs text-gray-400">
                  {answeredCount}/
                  {takingQuestions.length} câu đã chọn
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedExam.timeLimit > 0 && (
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold',
                      examSecondsLeft <= 60
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    {formatTime(
                      examSecondsLeft
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={exitTaking}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Thoát
                </button>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
            {/* QUESTION */}
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-7">
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-xl bg-blue-100 px-3 py-1.5 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Câu {currentQuestion + 1}/
                  {takingQuestions.length}
                </span>

                {takeWrongOnly && (
                  <span className="rounded-xl bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    Ôn câu sai
                  </span>
                )}
              </div>

              {question.text && (
                <div className="whitespace-pre-wrap text-lg font-semibold leading-8 text-gray-900 dark:text-white">
                  {question.text}
                </div>
              )}

              {question.image && (
                <div
                  className={cn(
                    'overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950',
                    question.text
                      ? 'mt-5'
                      : ''
                  )}
                >
                  <img
                    src={question.image}
                    alt="Ảnh câu hỏi"
                    className="max-h-[500px] w-full cursor-pointer object-contain"
                    onClick={() =>
                      openImage(question.image)
                    }
                  />
                </div>
              )}

              <div className="mt-6 space-y-3">
                {question.answers.map(
                  (answer, answerIndex) => {
                    const isSelected =
                      selected === answer.id

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() =>
                          chooseAnswer(
                            question.id,
                            answer.id
                          )
                        }
                        className={cn(
                          'w-full rounded-2xl border p-4 text-left transition',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-900/20'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-bold',
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 text-gray-500 dark:border-gray-600'
                            )}
                          >
                            {getAnswerLetter(
                              answerIndex
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {answer.text && (
                              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800 dark:text-gray-200">
                                {answer.text}
                              </p>
                            )}

                            <AnswerImage
                              answer={answer}
                            />
                          </div>

                          {isSelected && (
                            <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                          )}
                        </div>
                      </button>
                    )
                  }
                )}
              </div>

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
                <button
                  type="button"
                  disabled={currentQuestion === 0}
                  onClick={() =>
                    setCurrentQuestion(
                      prev => prev - 1
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Câu trước
                </button>

                {currentQuestion ===
                takingQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={submitExam}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Nộp bài
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestion(
                        prev => prev + 1
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Câu tiếp
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* QUESTION NAVIGATION */}
            <div className="h-fit rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-24">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Danh sách câu
                </h3>

                <Shuffle className="h-4 w-4 text-gray-400" />
              </div>

              <div className="grid grid-cols-5 gap-2">
                {takingQuestions.map(
                  (item, index) => {
                    const answered =
                      !!selectedAnswers[item.id]

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setCurrentQuestion(index)
                        }
                        className={cn(
                          'flex h-10 items-center justify-center rounded-xl text-xs font-bold transition',
                          index ===
                            currentQuestion
                            ? 'bg-blue-600 text-white'
                            : answered
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        )}
                      >
                        {index + 1}
                      </button>
                    )
                  }
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-blue-600" />
                  Câu hiện tại
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-green-500" />
                  Đã trả lời
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-gray-200 dark:bg-gray-700" />
                  Chưa trả lời
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IMAGE VIEWER */}
        {viewingImage && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 p-4"
            onClick={() =>
              setViewingImage(null)
            }
          >
            <button
              type="button"
              onClick={() =>
                setViewingImage(null)
              }
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={viewingImage}
              alt="Xem ảnh"
              className="max-h-full max-w-full rounded-xl object-contain"
              onClick={e =>
                e.stopPropagation()
              }
            />
          </div>
        )}
      </div>
    )
  }

  // =========================================================
  // RESULT PAGE
  // =========================================================

  const renderResult = () => {
    if (!selectedExam || !result) return null

    const passed =
      result.score >= 50

    return (
      <div className="min-h-full bg-gray-50 p-4 dark:bg-gray-950 md:p-6">
        <ToastContainer />

        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('list')
                setSelectedExam(null)
                setResult(null)
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kết quả bài thi
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedExam.title}
              </p>
            </div>
          </div>

          {/* SCORE */}
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="p-6 text-center md:p-10">
              <div
                className={cn(
                  'mx-auto flex h-28 w-28 items-center justify-center rounded-full border-8',
                  passed
                    ? 'border-green-200 bg-green-50 text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-400'
                )}
              >
                <div>
                  <p className="text-3xl font-black">
                    {result.score}%
                  </p>
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
                {result.score === 100
                  ? 'Xuất sắc! 🎉'
                  : passed
                    ? 'Làm tốt lắm! 👏'
                    : 'Cố gắng thêm nhé! 💪'}
              </h2>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Bạn đúng {result.correct}/
                {result.total} câu
              </p>

              <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
                <div className="rounded-2xl bg-green-50 p-4 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Đúng
                  </p>

                  <p className="mt-1 text-xl font-bold text-green-700 dark:text-green-300">
                    {result.correct}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-900/20">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Sai
                  </p>

                  <p className="mt-1 text-xl font-bold text-red-700 dark:text-red-300">
                    {result.total -
                      result.correct}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Điểm
                  </p>

                  <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                    {result.score}%
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    startExam(
                      selectedExam,
                      false
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Làm lại
                </button>

                {result.total -
                  result.correct >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      startExam(
                        selectedExam,
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Ôn câu sai
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    openEdit(selectedExam)
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                  Sửa đề
                </button>
              </div>
            </div>
          </div>

          {/* REVIEW */}
          <div className="mt-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Xem lại đáp án
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Kiểm tra những câu bạn đã làm
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {takingQuestions.map(
                (question, index) => {
                  const attempt =
                    result.answers.find(
                      answer =>
                        answer.questionId ===
                        question.id
                    )

                  if (!attempt) return null

                  const selectedAnswer =
                    question.answers.find(
                      answer =>
                        answer.id ===
                        attempt.selectedAnswerId
                    )

                  const correctAnswer =
                    question.answers.find(
                      answer =>
                        answer.id ===
                        attempt.correctAnswerId
                    )

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        'rounded-2xl border p-4',
                        attempt.isCorrect
                          ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10'
                          : 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-900/10'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl',
                            attempt.isCorrect
                              ? 'bg-green-500 text-white'
                              : 'bg-red-500 text-white'
                          )}
                        >
                          {attempt.isCorrect ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <X className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            Câu {index + 1}
                          </p>

                          {question.text && (
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                              {question.text}
                            </p>
                          )}

                          {question.image && (
                            <img
                              src={question.image}
                              alt="Ảnh câu hỏi"
                              className="mt-3 max-h-48 w-full cursor-pointer rounded-xl object-contain"
                              onClick={() =>
                                openImage(
                                  question.image
                                )
                              }
                            />
                          )}

                          <div className="mt-3 space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-500 dark:text-gray-400">
                                Bạn chọn:
                              </span>{' '}
                              <span
                                className={cn(
                                  'font-bold',
                                  attempt.isCorrect
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                )}
                              >
                                {selectedAnswer
                                  ? `${
                                      getAnswerLetter(
                                        question.answers.indexOf(
                                          selectedAnswer
                                        )
                                      )
                                    }. ${
                                      selectedAnswer.text ||
                                      'Ảnh'
                                    }`
                                  : 'Chưa chọn'}
                              </span>
                            </div>

                            {!attempt.isCorrect && (
                              <div>
                                <span className="font-medium text-gray-500 dark:text-gray-400">
                                  Đáp án đúng:
                                </span>{' '}
                                <span className="font-bold text-green-600">
                                  {correctAnswer
                                    ? `${
                                        getAnswerLetter(
                                          question.answers.indexOf(
                                            correctAnswer
                                          )
                                        )
                                      }. ${
                                        correctAnswer.text ||
                                        'Ảnh'
                                      }`
                                    : 'Không xác định'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        </div>

        {viewingImage && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 p-4"
            onClick={() =>
              setViewingImage(null)
            }
          >
            <button
              type="button"
              onClick={() =>
                setViewingImage(null)
              }
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={viewingImage}
              alt="Xem ảnh"
              className="max-h-full max-w-full rounded-xl object-contain"
              onClick={e =>
                e.stopPropagation()
              }
            />
          </div>
        )}
      </div>
    )
  }

  // =========================================================
  // MAIN
  // =========================================================

  if (mode === 'editor') {
    return renderEditor()
  }

  if (mode === 'taking') {
    return renderTaking()
  }

  if (mode === 'result') {
    return renderResult()
  }

  return renderList()
}

export default Exams