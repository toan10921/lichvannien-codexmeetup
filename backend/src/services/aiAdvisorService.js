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
      display_date: typeof item.display_date === 'string' ? item.display_date : '',
      lunar_date: typeof item.lunar_date === 'string' ? item.lunar_date : '',
      lunar_display: typeof item.lunar_display === 'string' ? item.lunar_display : '',
      rating: VALID_RATINGS.has(item.rating) ? item.rating : 'neutral',
      reason: typeof item.reason === 'string' ? item.reason : '',
    }))
    .filter((item) => item.date);
}

function getDayAdvice(contextItem) {
  return contextItem?.day_advice && typeof contextItem.day_advice === 'object'
    ? contextItem.day_advice
    : {};
}

function getContextRating(contextItem) {
  const dayAdvice = getDayAdvice(contextItem);

  if (VALID_RATINGS.has(dayAdvice.rating)) {
    return dayAdvice.rating;
  }

  if (VALID_RATINGS.has(contextItem?.day_rating)) {
    return contextItem.day_rating;
  }

  return 'neutral';
}

function getRatingScore(rating) {
  if (rating === 'favorable') {
    return 3;
  }

  if (rating === 'neutral') {
    return 2;
  }

  return 1;
}

function formatDisplayDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');

  if (!match) {
    return dateStr || '';
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function buildReferencedDates(calendarContext) {
  if (!Array.isArray(calendarContext)) {
    return [];
  }

  return calendarContext
    .filter((item) => item && typeof item.date === 'string' && item.date.trim())
    .map((item) => {
      const dayAdvice = item.day_advice && typeof item.day_advice === 'object'
        ? item.day_advice
        : {};

      return {
        date: item.date,
        display_date: formatDisplayDate(item.date),
        date_intro: typeof item.date_intro === 'string' ? item.date_intro : '',
        lunar_date: typeof item.lunar_date === 'string' ? item.lunar_date : '',
        lunar_display: typeof item.lunar_display === 'string' ? item.lunar_display : '',
        weekday: typeof item.weekday === 'string' ? item.weekday : '',
        rating: getContextRating(item),
      };
    });
}

function answerMentionsAnyLunarDate(answer, referencedDates) {
  return referencedDates.some((item) => (
    (item.date_intro && answer.includes(item.date_intro)) ||
    (item.lunar_display && answer.includes(item.lunar_display)) ||
    (item.lunar_date && answer.includes(item.lunar_date))
  ));
}

function buildDateMappingSentence(referencedDates) {
  if (referencedDates.length === 0) {
    return '';
  }

  if (referencedDates.length === 1) {
    const [item] = referencedDates;
    if (item.date_intro) {
      return `${item.date_intro}.`;
    }

    if (!item.lunar_display && !item.lunar_date) {
      return `Ngày dương ${item.display_date || item.date} chưa có dữ liệu ngày âm đầy đủ.`;
    }

    return `Ngày ${item.date} tức ${item.lunar_display || item.lunar_date}.`;
  }

  const datesWithLunar = referencedDates.filter((item) => item.lunar_date);
  const visibleDates = datesWithLunar.slice(0, 3);
  const suffix = datesWithLunar.length > visibleDates.length
    ? ` và ${datesWithLunar.length - visibleDates.length} ngày khác`
    : '';
  const dateList = visibleDates
    .map((item) => `${item.date} (${item.lunar_display || item.lunar_date})`)
    .join(', ');

  return dateList
    ? `Các ngày trong dữ liệu gồm ${dateList}${suffix}.`
    : 'Một số ngày trong dữ liệu chưa có ngày âm đầy đủ.';
}

function buildSuggestedDateReason(contextItem) {
  const dayAdvice = getDayAdvice(contextItem);
  const rating = getContextRating(contextItem);
  const goodFor = toStringArray(dayAdvice.good_for || contextItem.good_for).slice(0, 3);
  const avoidFor = toStringArray(dayAdvice.avoid_for || contextItem.avoid_for).slice(0, 2);
  const parts = [];

  if (contextItem.date_intro) {
    parts.push(`${contextItem.date_intro}.`);
  }

  if (dayAdvice.summary || contextItem.day_summary) {
    parts.push(dayAdvice.summary || contextItem.day_summary);
  }

  if (rating === 'favorable') {
    parts.push('Mức đánh giá của ngày là thuận lợi hơn các ngày còn lại trong phạm vi đang xét.');
  } else if (rating === 'neutral') {
    parts.push('Mức đánh giá của ngày ở trạng thái trung hòa, phù hợp hơn nếu công việc đã được chuẩn bị kỹ.');
  } else {
    parts.push('Mức đánh giá của ngày là cần thận trọng, chỉ nên chọn nếu không có ngày thuận lợi hơn.');
  }

  if (goodFor.length > 0) {
    parts.push(`Dữ liệu lunarText/day_advice gợi ý phù hợp với: ${goodFor.join(', ')}.`);
  }

  if (avoidFor.length > 0) {
    parts.push(`Vẫn cần lưu ý tránh hoặc chuẩn bị kỹ với: ${avoidFor.join(', ')}.`);
  }

  return parts.join(' ');
}

function enrichSuggestedDate(suggestion, contextItem) {
  const generatedReason = buildSuggestedDateReason(contextItem);
  const reason = suggestion.reason && suggestion.reason.trim()
    ? suggestion.reason.trim()
    : generatedReason;
  const hasLunarReason = (
    (contextItem.date_intro && reason.includes(contextItem.date_intro)) ||
    (contextItem.lunar_display && reason.includes(contextItem.lunar_display)) ||
    (contextItem.lunar_date && reason.includes(contextItem.lunar_date))
  );

  return {
    ...suggestion,
    display_date: suggestion.display_date || formatDisplayDate(contextItem.date),
    lunar_date: suggestion.lunar_date || contextItem.lunar_date || '',
    lunar_display: suggestion.lunar_display || contextItem.lunar_display || '',
    rating: VALID_RATINGS.has(suggestion.rating) ? suggestion.rating : getContextRating(contextItem),
    reason: hasLunarReason
      ? reason
      : `${contextItem.date_intro ? `${contextItem.date_intro}.` : buildDateMappingSentence([{
        date: contextItem.date,
        display_date: formatDisplayDate(contextItem.date),
        lunar_date: contextItem.lunar_date,
        lunar_display: contextItem.lunar_display,
      }])} ${reason}`.trim(),
  };
}

function buildSuggestedDates(responseSuggestions, calendarContext, options = {}) {
  const contextItems = Array.isArray(calendarContext) ? calendarContext : [];
  const contextMap = new Map(contextItems.map((item) => [item.date, item]));
  const existingDates = new Set();
  const enrichedExisting = responseSuggestions
    .filter((item) => contextMap.has(item.date))
    .map((item) => {
      existingDates.add(item.date);
      return enrichSuggestedDate(item, contextMap.get(item.date));
    });

  if (options.contextMode !== 'date_suggestion') {
    return enrichedExisting;
  }

  const fillerDates = contextItems
    .filter((item) => !existingDates.has(item.date))
    .sort((left, right) => {
      const ratingDiff = getRatingScore(getContextRating(right)) - getRatingScore(getContextRating(left));

      if (ratingDiff !== 0) {
        return ratingDiff;
      }

      return left.date.localeCompare(right.date);
    })
    .slice(0, Math.max(0, 3 - enrichedExisting.length))
    .map((item) => enrichSuggestedDate({
      date: item.date,
      rating: getContextRating(item),
      reason: '',
    }, item));

  return [...enrichedExisting, ...fillerDates].slice(0, 3);
}

function attachCalendarContextToResponse(response, calendarContext, options = {}) {
  const referencedDates = buildReferencedDates(calendarContext);
  const suggestedDates = buildSuggestedDates(response.suggested_dates || [], calendarContext, options);
  const dateIntro = referencedDates.length === 1 ? referencedDates[0].date_intro : '';
  const normalized = {
    ...response,
    date_intro: response.date_intro || dateIntro,
    referenced_dates: referencedDates,
    suggested_dates: suggestedDates,
  };

  if (
    normalized.answer &&
    referencedDates.length > 0 &&
    !answerMentionsAnyLunarDate(normalized.answer, referencedDates)
  ) {
    normalized.answer = `${buildDateMappingSentence(referencedDates)} ${normalized.answer}`;
  }

  return normalized;
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
    referenced_dates: normalizeSuggestedDates(source.referenced_dates),
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

async function askAdvisor(message, calendarContext, conversationHistory = [], options = {}) {
  if (!openai) {
    return attachCalendarContextToResponse(
      getFallbackResponse('Cấu hình OpenAI API Key (OPENAI_API_KEY) chưa sẵn sàng.'),
      calendarContext,
      options,
    );
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
            request_context: {
              mode: options.contextMode || 'single_date',
            },
            question: message,
          }),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices?.[0]?.message?.content;
    const parsed = parseJsonObject(content);
    return attachCalendarContextToResponse(
      normalizeAdvisorResponse(parsed, 'Mình chưa thể tạo câu trả lời đầy đủ từ dữ liệu hiện có.'),
      calendarContext,
      options,
    );
  } catch (error) {
    console.error('[AIAdvisorService] OpenAI API Error:', error);
    return attachCalendarContextToResponse(getFallbackResponse(error.message), calendarContext, options);
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

Dữ liệu calendar_context được lấy từ calendarService.getDayDetail. Trường day_advice là nguồn đánh giá ngày chính thức của ứng dụng, được tạo từ rule-based dayAdviceService dựa trên dữ liệu âm lịch và bản dịch trong lunarText.js, gồm Hoàng/Hắc đạo, thần ngày, trực ngày, việc nên làm và việc nên tránh. Khi trả lời về ngày tốt/xấu hoặc mức độ phù hợp, phải ưu tiên các trường sau:
- day_advice.rating hoặc day_rating: đánh giá tổng quan của ngày.
- day_advice.summary hoặc day_summary: lý do chính đang hiển thị ở Homepage.
- day_advice.good_for hoặc good_for: các việc phù hợp theo dữ liệu lunarText.
- day_advice.avoid_for hoặc avoid_for: các việc nên thận trọng theo dữ liệu lunarText.
- holidays và user_events: ngày lễ và lịch cá nhân có thể ảnh hưởng đến lời khuyên thực tế.

Quy tắc ngày dương - ngày âm bắt buộc:
1. Mỗi khi trả lời về một ngày cụ thể, câu trả lời phải nêu rõ theo mẫu: "Ngày 2026-06-13 tức ngày 28-4 năm Bính Ngọ...". Lấy ngày dương từ date, ngày âm từ lunar.day/lunar.month và năm âm lịch từ can_chi_detail.year.
2. Không được tự tính hoặc tự sửa ngày âm. Chỉ dùng lunar_date, lunar_display, lunar.day, lunar.month, lunar.year và can_chi_detail.year đã được cung cấp.
3. Nếu calendar_context có nhiều ngày, khi đề xuất hoặc so sánh ngày phải gắn từng ngày dương với ngày âm tương ứng trong answer hoặc suggested_dates.reason.
4. Nếu thiếu lunar_date, phải nói rõ dữ liệu ngày âm chưa đầy đủ thay vì tự đoán.

Quy tắc hội thoại và follow-up:
1. Nếu request_context.mode là "date_suggestion" hoặc người dùng hỏi "ngày nào phù hợp", "vậy ngày nào phù hợp", "ngày nào tốt", hãy hiểu đây là yêu cầu tìm ngày phù hợp trong calendar_context nhiều ngày.
2. Khi tìm ngày phù hợp, không được lặp lại nguyên văn đánh giá của ngày trước đó. Phải so sánh các ngày trong calendar_context hiện tại và trả về suggested_dates.
3. Dùng conversation history để hiểu hoạt động người dùng đang hỏi trước đó, ví dụ mua nhà, ký hợp đồng, khai trương, chuyển nhà. Nếu hoạt động không rõ, nói rõ giả định trong answer.
4. Nếu có nhiều ngày, ưu tiên ngày có day_advice.rating = "favorable"; nếu không có, chọn ngày "neutral" có good_for phù hợp nhất và giải thích vì sao chỉ ở mức tham khảo.

Quy tắc dùng day_advice:
1. Không được đảo ngược đánh giá ngày. Nếu day_advice.rating là "caution", không được kết luận ngày rất tốt; nếu là "favorable", vẫn chỉ nói là tương đối thuận lợi và có điều kiện chuẩn bị kỹ.
2. Với câu hỏi về một hoạt động cụ thể, hãy so khớp ý nghĩa hoạt động đó với good_for và avoid_for:
   - Nếu hoạt động khớp avoid_for, rating phản hồi nên là "caution" hoặc ít nhất nêu rõ cần tránh/thận trọng.
   - Nếu hoạt động khớp good_for và ngày không phải "caution", có thể rating là "favorable".
   - Nếu không khớp rõ, giữ đánh giá gần với day_advice.rating và giải thích là dữ liệu không chỉ ra trực tiếp hoạt động đó.
3. Với câu hỏi "nên ưu tiên việc gì", recommended_actions phải dựa trên good_for, summary, user_events và các bước chuẩn bị thực tế.
4. Với cautions, phải ưu tiên avoid_for, các xung đột lịch cá nhân và các lưu ý trong summary.
5. Với suggested_dates, chỉ đề xuất các ngày có trong calendar_context. Lý do của từng ngày là bắt buộc, phải lấy từ day_advice.summary/good_for/avoid_for của chính ngày đó và nêu vì sao ngày đó phù hợp với hoạt động người dùng hỏi.
6. Nếu thiếu day_advice hoặc context không đủ, nói rõ là dữ liệu đánh giá ngày chưa đủ, không tự suy diễn thêm từ can chi.

Nguyên tắc trả lời bắt buộc:
1. Mọi đánh giá đều mang tính tham khảo, không khẳng định kết quả chắc chắn trong tương lai.
2. Không cam kết tài lộc, sức khỏe, vận mệnh hay thành công tuyệt đối.
3. Không thay thế tư vấn tài chính, pháp lý hoặc y tế chuyên nghiệp.
4. Ưu tiên lời khuyên thực tế: chuẩn bị kỹ, lập kế hoạch, kiểm tra tài liệu, quản lý thời gian, xác nhận thông tin rõ ràng.
5. Câu trả lời phải ngắn gọn, dễ hiểu và viết bằng tiếng Việt.
6. Trả về đúng JSON:
{
  "intent": "tomorrow_advice" | "find_suitable_date" | "date_suitability" | "personal_schedule_advice" | "fallback",
  "answer": "Câu trả lời trực tiếp và đầy đủ cho người dùng",
  "rating": "favorable" | "neutral" | "caution",
  "recommended_actions": ["Việc nên làm 1", "Việc nên làm 2"],
  "cautions": ["Lưu ý 1", "Lưu ý 2"],
  "suggested_dates": [
    {
      "date": "YYYY-MM-DD",
      "lunar_date": "Dữ liệu lunar_date tương ứng trong calendar_context",
      "rating": "favorable" | "neutral" | "caution",
      "reason": "Bắt buộc. Lý do cụ thể vì sao ngày này phù hợp, có nhắc ngày âm/can chi năm, summary, good_for liên quan và lưu ý avoid_for nếu có."
    }
  ],
  "referenced_dates": [
    {
      "date": "YYYY-MM-DD",
      "lunar_date": "Dữ liệu lunar_date tương ứng trong calendar_context",
      "rating": "favorable" | "neutral" | "caution"
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
