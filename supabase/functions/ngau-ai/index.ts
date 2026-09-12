import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")

const MODEL =
  Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash"

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions"

const SYSTEM_PROMPT = `
Bạn là Ngâu AI, trợ lý AI của Ngâu Hub.

QUY TẮC TRẢ LỜI:

- Trả lời bằng tiếng Việt nếu người dùng dùng tiếng Việt.
- Có thể giải toán, giải thích bài học, viết nội dung, lập kế hoạch và trò chuyện tự do.
- Khi giải toán, trình bày từng bước rõ ràng và kiểm tra kết quả.
- Dùng Markdown khi phù hợp.
- Dùng LaTeX khi cần hiển thị công thức toán.
- Với công thức toán, ưu tiên delimiter LaTeX chuẩn:
  inline: \\(...)
  block: \\[...\\]
- Không tự thêm các delimiter bị escape thành nhiều dấu gạch chéo.
- Khi người dùng gửi ảnh, phải quan sát và phân tích nội dung ảnh.
- Nếu ảnh là bài toán/bài tập, hãy đọc đề trong ảnh và giải rõ ràng từng bước.
- Nếu ảnh có chữ, hãy cố gắng đọc chính xác nội dung chữ trong ảnh.
- Nếu ảnh không rõ hoặc không đủ thông tin, nói chính xác phần nào không đọc được.
- Không nói rằng bạn không thể xem ảnh nếu ảnh đã được gửi thành công.
- Không bịa thông tin không nhìn thấy trong ảnh.
- Trả lời tự nhiên, hữu ích và trực tiếp.
`

type IncomingMessage = {
  role: "user" | "assistant"
  content: string
  image?: string
}

type GeminiContent =
  | {
      type: "text"
      text: string
    }
  | {
      type: "image"
      data: string
      mime_type: string
    }

type GeminiStep = {
  type: "user_input" | "model_output"
  content: GeminiContent[]
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods":
        "POST, OPTIONS",
    },
  })

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(
    /^data:([^;,]+);base64,(.+)$/s,
  )

  if (!match) {
    return null
  }

  return {
    mimeType: match[1],
    data: match[2],
  }
}

function extractGeminiText(data: any): string {
  let result = ""

  const steps = Array.isArray(data?.steps)
    ? data.steps
    : []

  for (const step of steps) {
    if (step?.type !== "model_output") {
      continue
    }

    const content = Array.isArray(step?.content)
      ? step.content
      : []

    for (const item of content) {
      if (
        item?.type === "text" &&
        typeof item?.text === "string"
      ) {
        result += item.text
      }
    }
  }

  if (
    !result.trim() &&
    typeof data?.output_text === "string"
  ) {
    result = data.output_text
  }

  return result.trim()
}

function getGeminiErrorMessage(
  status: number,
  responseText: string,
) {
  let fallback =
    `Gemini API lỗi (${status}).`

  try {
    const errorBody = JSON.parse(responseText)

    const message =
      errorBody?.error?.message ||
      errorBody?.message ||
      errorBody?.details?.[0]?.message

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      fallback = message
    }
  } catch {
    if (responseText.trim()) {
      fallback = responseText.slice(0, 1000)
    }
  }

  return fallback
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true })
  }

  if (req.method !== "POST") {
    return json(
      { error: "Method not allowed." },
      405,
    )
  }

  if (!GEMINI_API_KEY) {
    return json(
      {
        error:
          "GEMINI_API_KEY chưa được cấu hình trên Supabase.",
      },
      500,
    )
  }

  try {
    const body = await req.json()

    const messages = Array.isArray(body?.messages)
      ? (body.messages as IncomingMessage[])
      : []

    if (messages.length === 0) {
      return json(
        { error: "Thiếu messages." },
        400,
      )
    }

    /*
     * QUAN TRỌNG:
     *
     * Gemini Interactions API không nên biến câu trả lời
     * của assistant thành một user prompt giả.
     *
     * Khi dùng store:false, lịch sử phải được gửi lại
     * dưới dạng các step đúng vai trò:
     *
     *   user      -> user_input
     *   assistant -> model_output
     *
     * Đây là nguyên nhân chính khiến lượt chat sau bị lỗi.
     */
    const input: GeminiStep[] = []

    for (const message of messages) {
      if (
        !message ||
        (
          message.role !== "user" &&
          message.role !== "assistant"
        )
      ) {
        continue
      }

      const text =
        typeof message.content === "string"
          ? message.content.trim()
          : ""

      const content: GeminiContent[] = []

      if (text) {
        content.push({
          type: "text",
          text,
        })
      }

      const hasImage =
        message.role === "user" &&
        typeof message.image === "string" &&
        message.image.startsWith("data:image/")

      if (hasImage) {
        const image = parseDataUrl(message.image!)

        if (image) {
          content.push({
            type: "image",
            data: image.data,
            mime_type: image.mimeType,
          })
        }
      }

      if (
        message.role === "user" &&
        !text &&
        hasImage
      ) {
        content.push({
          type: "text",
          text:
            "Hãy xem hình ảnh đính kèm và mô tả, phân tích hoặc giải bài trong ảnh.",
        })
      }

      if (content.length === 0) {
        continue
      }

      input.push({
        type:
          message.role === "user"
            ? "user_input"
            : "model_output",
        content,
      })
    }

    if (input.length === 0) {
      return json(
        {
          error:
            "Không có nội dung hợp lệ để gửi tới Gemini.",
        },
        400,
      )
    }

    const geminiResponse = await fetch(
      GEMINI_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          model: MODEL,
          system_instruction: SYSTEM_PROMPT,

          /*
           * Stateless mode:
           * frontend gửi toàn bộ lịch sử,
           * server không lưu interaction.
           */
          input,
          store: false,

          generation_config: {
            max_output_tokens: 8192,
          },
        }),
      },
    )

    const responseText =
      await geminiResponse.text()

    if (!geminiResponse.ok) {
      const errorMessage =
        getGeminiErrorMessage(
          geminiResponse.status,
          responseText,
        )

      console.error(
        "[ngau-ai] Gemini API error:",
        {
          status: geminiResponse.status,
          body: responseText,
        },
      )

      return json(
        { error: errorMessage },
        geminiResponse.status >= 400 &&
        geminiResponse.status < 500
          ? 400
          : 500,
      )
    }

    let data: any

    try {
      data = JSON.parse(responseText)
    } catch {
      console.error(
        "[ngau-ai] Gemini returned invalid JSON:",
        responseText,
      )

      return json(
        {
          error:
            "Gemini trả về dữ liệu không hợp lệ.",
        },
        500,
      )
    }

    const status = data?.status

    if (
      status === "failed" ||
      status === "cancelled"
    ) {
      const errorMessage =
        data?.error?.message ||
        data?.error ||
        "Gemini không hoàn thành yêu cầu."

      console.error(
        "[ngau-ai] Interaction failed:",
        JSON.stringify(data),
      )

      return json(
        {
          error:
            typeof errorMessage === "string"
              ? errorMessage
              : "Gemini không hoàn thành yêu cầu.",
        },
        500,
      )
    }

    const message = extractGeminiText(data)

    if (!message) {
      console.error(
        "[ngau-ai] Empty Gemini response:",
        JSON.stringify(data),
      )

      return json(
        {
          error:
            "Ngâu AI không nhận được nội dung trả lời từ Gemini.",
        },
        500,
      )
    }

    return json({ message })
  } catch (error) {
    console.error(
      "[ngau-ai] Unexpected error:",
      error,
    )

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi xử lý yêu cầu.",
      },
      500,
    )
  }
})
