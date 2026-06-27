const { OpenAI } = require('openai');
const env = require('../config/env');

const openai = env.openai.apiKey
  ? new OpenAI({ apiKey: env.openai.apiKey })
  : null;

/**
 * Gọi OpenAI tư vấn dựa trên ngữ cảnh lịch và câu hỏi của user
 * @param {string} message - Câu hỏi của người dùng
 * @param {Object} calendarContext - Ngữ cảnh lịch bao gồm ngày dương, âm, can chi, ngày lễ, sự kiện của user
 * @returns {Promise<Object>} JSON phản hồi chuẩn hóa
 */
async function askAdvisor(message, calendarContext) {
  if (!openai) {
    return getFallbackResponse('Cấu hình OpenAI API Key (OPENAI_API_KEY) chưa sẵn sàng.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: env.openai.model,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: `Context: ${JSON.stringify(calendarContext)}\nQuestion: ${message}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('[AIAdvisorService] OpenAI API Error:', error);
    return getFallbackResponse(error.message);
  }
}

/**
 * Gọi OpenAI sinh đánh giá ngày tốt/xấu chung (dành cho cơ chế Cache)
 * @param {string} solarDate - Ngày dương lịch dạng YYYY-MM-DD
 * @param {string} lunarDate - Ngày âm lịch dạng DD/MM
 * @param {string} canChiDay - Tên Can Chi của ngày
 * @returns {Promise<Object>} Đánh giá ngày
 */
async function generateDayAdvice(solarDate, lunarDate, canChiDay) {
  if (!openai) {
    return getFallbackDayAdvice();
  }

  try {
    const prompt = `Hãy phân tích ngày tốt/xấu mang tính chất tham khảo cho ngày dương lịch ${solarDate}, ngày âm lịch ${lunarDate}, Can Chi "${canChiDay}".
    Trả về định dạng JSON chứa các thông tin sau:
    {
      "day_rating": "favorable" | "neutral" | "caution",
      "summary": "Mô tả ngắn gọn, súc tích (1-2 câu) về ngày này dưới góc nhìn tham khảo, khuyên người dùng chuẩn bị hoặc chú ý điều gì.",
      "good_for": ["Hoạt động nên làm 1", "Hoạt động nên làm 2"],
      "avoid_for": ["Hoạt động cần thận trọng 1", "Hoạt động cần thận trọng 2"]
    }`;

    const response = await openai.chat.completions.create({
      model: env.openai.model,
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia tư vấn lịch vạn niên Việt Nam. Hãy đưa ra các gợi ý hành động thực tế, mang tính tham khảo và trả lời bằng tiếng Việt ở định dạng JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('[AIAdvisorService] Generate Day Advice Error:', error);
    return getFallbackDayAdvice();
  }
}

/**
 * Trích xuất system prompt định hướng câu trả lời của AI
 */
function getSystemPrompt() {
  return `Bạn là trợ lý lịch vạn niên Việt Nam thông minh.
Nhiệm vụ của bạn là hỗ trợ người dùng:
- Gợi ý công việc nên ưu tiên theo ngày.
- Đánh giá tham khảo một ngày có phù hợp với một hoạt động hay không.
- Gợi ý một số ngày phù hợp trong khoảng thời gian người dùng yêu cầu.
- Đưa ra lời khuyên chuẩn bị dựa trên lịch cá nhân của người dùng.

Bạn chỉ được sử dụng dữ liệu calendar_context do hệ thống cung cấp. Tuyệt đối không tự tạo ra ngày âm, ngày lễ, can chi hoặc sự kiện cá nhân không có trong dữ liệu context.

Nguyên tắc trả lời (BẮT BUỘC):
1. Mọi ý kiến đánh giá đều mang tính chất tham khảo, không khẳng định kết quả chắc chắn trong tương lai.
2. Không cam kết tài lộc, sức khỏe, vận mệnh hay thành công tuyệt đối.
3. Không thay thế tư vấn tài chính, pháp lý hoặc y tế chuyên nghiệp.
4. Ưu tiên đưa ra các lời khuyên thực tế: chuẩn bị kỹ, lập kế hoạch, kiểm tra tài liệu, quản lý thời gian, xác nhận thông tin rõ ràng.
5. Câu trả lời phải ngắn gọn, dễ hiểu và viết bằng tiếng Việt.
6. Trả về đúng định dạng JSON có cấu trúc sau:
{
  "intent": "tomorrow_advice" | "find_suitable_date" | "date_suitability" | "personal_schedule_advice",
  "answer": "Câu trả lời trực tiếp và đầy đủ cho người dùng",
  "rating": "favorable" | "neutral" | "caution",
  "recommended_actions": ["Việc nên làm 1", "Việc nên làm 2"],
  "cautions": ["Lưu ý/Cảnh báo 1", "Lưu ý/Cảnh báo 2"],
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

/**
 * Phản hồi dự phòng khi OpenAI gặp lỗi
 */
function getFallbackResponse(errorMessage) {
  return {
    intent: 'fallback',
    answer: 'Dịch vụ tư vấn AI hiện tại đang tạm thời gián đoạn. Bạn vẫn có thể xem thông tin ngày, lịch âm dương và quản lý các sự kiện cá nhân bình thường.',
    rating: 'neutral',
    recommended_actions: [],
    cautions: [],
    suggested_dates: [],
    disclaimer: `Thông tin chỉ mang tính tham khảo. (Lỗi hệ thống: ${errorMessage || 'Unknown Error'})`
  };
}

/**
 * Đánh giá ngày dự phòng khi OpenAI gặp lỗi
 */
function getFallbackDayAdvice() {
  return {
    day_rating: 'neutral',
    summary: 'Thông tin đánh giá ngày đang được cập nhật.',
    good_for: [],
    avoid_for: []
  };
}

module.exports = {
  askAdvisor,
  generateDayAdvice
};
