const { OpenAI } = require('openai');
const env = require('../config/env');

const openai = env.openai.apiKey
  ? new OpenAI({ apiKey: env.openai.apiKey })
  : null;

const VALID_INTENTS = new Set([
  'tomorrow_advice',
  'find_suitable_date',
  'date_suitability',
  'personal_schedule_advice',
  'fallback',
]);

const VALID_RATINGS = new Set(['favorable', 'neutral', 'caution']);

function parseJsonObject(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('AI response is empty');
  }

  try {
    return JSON.parse(content);
  } catch {
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error('AI response is not valid JSON');
    }

    return JSON.parse(objectMatch[0]);
  }
}

function toStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
}

function normalizeSuggestedDates(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      date: typeof item.date === 'string' ? item.date : '',
      rating: VALID_RATINGS.has(item.rating) ? item.rating : 'neutral',
      reason: typeof item.reason === 'string' ? item.reason : '',
    }))
    .filter((item) => item.date);
}

function normalizeAdvisorResponse(raw, fallbackAnswer) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const answer = typeof source.answer === 'string' && source.answer.trim()
    ? source.answer.trim()
    : fallbackAnswer;

  return {
    intent: VALID_INTENTS.has(source.intent) ? source.intent : 'personal_schedule_advice',
    answer,
    rating: VALID_RATINGS.has(source.rating) ? source.rating : 'neutral',
    recommended_actions: toStringArray(source.recommended_actions),
    cautions: toStringArray(source.cautions),
    suggested_dates: normalizeSuggestedDates(source.suggested_dates),
    disclaimer: typeof source.disclaimer === 'string' && source.disclaimer.trim()
      ? source.disclaimer.trim()
      : 'Thông tin chỉ mang tính tham khảo.',
  };
}

function normalizeDayAdvice(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  return {
    day_rating: VALID_RATINGS.has(source.day_rating) ? source.day_rating : 'neutral',
    summary: typeof source.summary === 'string' && source.summary.trim()
      ? source.summary.trim()
      : 'Thông tin đánh giá ngày đang được cập nhật.',
    good_for: toStringArray(source.good_for),
    avoid_for: toStringArray(source.avoid_for),
  };
}

function formatHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((message) => (
      message &&
      ['user', 'assistant'].includes(message.role) &&
      typeof message.content === 'string' &&
      message.content.trim()
    ))
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

async function askAdvisor(message, calendarContext, conversationHistory = []) {
  if (!openai) {
    return getFallbackResponse('Cấu hình OpenAI API Key (OPENAI_API_KEY) chưa sẵn sàng.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openai.model,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...formatHistory(conversationHistory),
        {
          role: 'user',
          content: JSON.stringify({
            calendar_context: calendarContext,
            question: message,
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices?.[0]?.message?.content;
    const parsed = parseJsonObject(content);
    return normalizeAdvisorResponse(parsed, 'Mình chưa thể tạo câu trả lời đầy đủ từ dữ liệu hiện có.');
  } catch (error) {
    console.error('[AIAdvisorService] OpenAI API Error:', error);
    return getFallbackResponse(error.message);
  }
}

async function generateDayAdvice(solarDate, lunarDate, canChiDay) {
  if (!openai) {
    return getFallbackDayAdvice();
  }

  try {
    const prompt = `Hãy phân tích ngày tốt/xấu mang tính chất tham khảo cho ngày dương lịch ${solarDate}, ngày âm lịch ${lunarDate}, Can Chi "${canChiDay}".
Trả về JSON có cấu trúc:
{
  "day_rating": "favorable" | "neutral" | "caution",
  "summary": "Mô tả ngắn 1-2 câu, thực tế và mang tính tham khảo.",
  "good_for": ["Hoạt động nên làm 1", "Hoạt động nên làm 2"],
  "avoid_for": ["Hoạt động cần thận trọng 1", "Hoạt động cần thận trọng 2"]
}`;

    const response = await openai.chat.completions.create({
      model: env.openai.model,
      messages: [
        {
          role: 'system',
          content: 'Bạn là chuyên gia tư vấn lịch vạn niên Việt Nam. Hãy đưa ra gợi ý thực tế, mang tính tham khảo và trả lời bằng tiếng Việt ở định dạng JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const content = response.choices?.[0]?.message?.content;
    return normalizeDayAdvice(parseJsonObject(content));
  } catch (error) {
    console.error('[AIAdvisorService] Generate Day Advice Error:', error);
    return getFallbackDayAdvice();
  }
}

function getSystemPrompt() {
  return `Bạn là trợ lý lịch vạn niên Việt Nam thông minh.
Nhiệm vụ của bạn là hỗ trợ người dùng:
- Gợi ý công việc nên ưu tiên theo ngày.
- Đánh giá tham khảo một ngày có phù hợp với một hoạt động hay không.
- Gợi ý một số ngày phù hợp trong khoảng thời gian người dùng yêu cầu.
- Đưa ra lời khuyên chuẩn bị dựa trên lịch cá nhân của người dùng.

Bạn chỉ được sử dụng dữ liệu calendar_context do hệ thống cung cấp. Tuyệt đối không tự tạo ra ngày âm, ngày lễ, can chi hoặc sự kiện cá nhân không có trong dữ liệu context.

Nguyên tắc trả lời bắt buộc:
1. Mọi đánh giá đều mang tính tham khảo, không khẳng định kết quả chắc chắn trong tương lai.
2. Không cam kết tài lộc, sức khỏe, vận mệnh hay thành công tuyệt đối.
3. Không thay thế tư vấn tài chính, pháp lý hoặc y tế chuyên nghiệp.
4. Ưu tiên lời khuyên thực tế: chuẩn bị kỹ, lập kế hoạch, kiểm tra tài liệu, quản lý thời gian, xác nhận thông tin rõ ràng.
5. Câu trả lời phải ngắn gọn, dễ hiểu và viết bằng tiếng Việt.
6. Trả về đúng JSON:
{
  "intent": "tomorrow_advice" | "find_suitable_date" | "date_suitability" | "personal_schedule_advice",
  "answer": "Câu trả lời trực tiếp và đầy đủ cho người dùng",
  "rating": "favorable" | "neutral" | "caution",
  "recommended_actions": ["Việc nên làm 1", "Việc nên làm 2"],
  "cautions": ["Lưu ý 1", "Lưu ý 2"],
  "suggested_dates": [
    {
      "date": "YYYY-MM-DD",
      "rating": "favorable" | "neutral" | "caution",
      "reason": "Lý do ngày này được đề xuất"
    }
  ],
  "disclaimer": "Thông tin chỉ mang tính tham khảo."
}`;
}

function getFallbackResponse(errorMessage) {
  return {
    intent: 'fallback',
    answer: 'Dịch vụ tư vấn AI hiện đang tạm thời gián đoạn. Bạn vẫn có thể xem thông tin ngày, lịch âm dương và quản lý các sự kiện cá nhân bình thường.',
    rating: 'neutral',
    recommended_actions: [],
    cautions: [],
    suggested_dates: [],
    disclaimer: `Thông tin chỉ mang tính tham khảo. (Lỗi hệ thống: ${errorMessage || 'Unknown Error'})`,
  };
}

function getFallbackDayAdvice() {
  return {
    day_rating: 'neutral',
    summary: 'Thông tin đánh giá ngày đang được cập nhật.',
    good_for: [],
    avoid_for: [],
  };
}

module.exports = {
  askAdvisor,
  generateDayAdvice,
};
