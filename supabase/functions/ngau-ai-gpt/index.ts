import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")

const MODEL =
  Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna"

const OPENAI_URL =
  "https://api.openai.com/v1/responses"

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

type OpenAIInputContent =
  | {
      type: "input_text"
      text: string
    }
  | {
      /*
       * output_text là nội dung của assistant đã được
       * model trả về trong lượt trước.
       *
       * Không được gửi assistant history bằng input_text.
       */
      type: "output_text"
      text: string
    }
  | {
      type: "input_image"
      image_url: string
    }

type OpenAIInputMessage = {
  role: "user" | "assistant"
  content: OpenAIInputContent[]
}

const json = (
  body: unknown,
  status = 200,
) =>
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

function extractOpenAIText(data: any): string {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim()
  }

  let result = ""

  const output = Array.isArray(data?.output)
    ? data.output
    : []

  for (const item of output) {
    if (!item) continue

    const content = Array.isArray(item?.content)
      ? item.content
      : []

    for (const part of content) {
      if (
        (
          part?.type === "output_text" ||
          typeof part?.text === "string"
        ) &&
        typeof part?.text === "string"
      ) {
        result += part.text
      }
    }
  }

  return result.trim()
}

function getOpenAIErrorMessage(
  status: number,
  responseText: string,
) {
  let fallback =
    `GPT API lỗi (${status}).`

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
      fallback =
        responseText.slice(0, 1000)
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

  if (!OPENAI_API_KEY) {
    return json(
      {
        error:
          "OPENAI_API_KEY chưa được cấu hình trên Supabase.",
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

    const input: OpenAIInputMessage[] = []

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

      const content: OpenAIInputContent[] = []

      const text =
        typeof message.content === "string"
          ? message.content.trim()
          : ""

      if (text) {
        if (message.role === "user") {
          content.push({
            type: "input_text",
            text,
          })
        } else {
          /*
           * FIX QUAN TRỌNG:
           *
           * Lỗi:
           * Invalid value: 'input_text'.
           * Supported values are: 'output_text' and 'refusal'.
           *
           * Xảy ra vì assistant history đang bị gửi bằng
           * input_text. Với assistant output, dùng output_text.
           */
          content.push({
            type: "output_text",
            text,
          })
        }
      }

      const hasImage =
        message.role === "user" &&
        typeof message.image === "string" &&
        message.image.startsWith("data:image/")

      if (hasImage) {
        content.push({
          type: "input_image",
          image_url: message.image!,
        })
      }

      if (
        message.role === "user" &&
        !text &&
        hasImage
      ) {
        content.push({
          type: "input_text",
          text:
            "Hãy xem hình ảnh đính kèm và mô tả, phân tích hoặc giải bài trong ảnh.",
        })
      }

      if (content.length > 0) {
        input.push({
          role: message.role,
          content,
        })
      }
    }

    if (input.length === 0) {
      return json(
        {
          error:
            "Không có nội dung hợp lệ để gửi tới GPT.",
        },
        400,
      )
    }

    const openAIResponse = await fetch(
      OPENAI_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          instructions: SYSTEM_PROMPT,
          input,
          max_output_tokens: 8192,
          store: false,
        }),
      },
    )

    const responseText =
      await openAIResponse.text()

    if (!openAIResponse.ok) {
      const errorMessage =
        getOpenAIErrorMessage(
          openAIResponse.status,
          responseText,
        )

      console.error(
        "[ngau-ai-gpt] OpenAI API error:",
        {
          status:
            openAIResponse.status,
          body: responseText,
        },
      )

      return json(
        { error: errorMessage },
        openAIResponse.status >= 400 &&
        openAIResponse.status < 500
          ? 400
          : 500,
      )
    }

    let data: any

    try {
      data = JSON.parse(responseText)
    } catch {
      console.error(
        "[ngau-ai-gpt] OpenAI returned invalid JSON:",
        responseText,
      )

      return json(
        {
          error:
            "GPT trả về dữ liệu không hợp lệ.",
        },
        500,
      )
    }

    const message = extractOpenAIText(data)

    if (!message) {
      console.error(
        "[ngau-ai-gpt] Empty OpenAI response:",
        JSON.stringify(data),
      )

      return json(
        {
          error:
            "Ngâu AI không nhận được nội dung trả lời từ GPT.",
        },
        500,
      )
    }

    return json({ message })
  } catch (error) {
    console.error(
      "[ngau-ai-gpt] Unexpected error:",
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
