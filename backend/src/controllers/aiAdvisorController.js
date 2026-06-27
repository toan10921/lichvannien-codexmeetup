const aiAdvisorService = require('../services/aiAdvisorService');
const calendarService = require('../services/calendarService');
const { pool } = require('../config/db');
const AppError = require('../utils/AppError');
const {
  addDays,
  getDateStringsBetween,
  getTodayDateString,
  normalizeDateInput,
} = require('../utils/dateTime');

const MAX_ADVISOR_RANGE_DAYS = 15;

function normalizeVietnameseSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function isSuitableDateQuestion(message) {
  const normalized = normalizeVietnameseSearchText(message);

  return (
    normalized.includes('ngay nao phu hop') ||
    normalized.includes('ngay nao tot') ||
    normalized.includes('ngay nao nen') ||
    normalized.includes('hom nao phu hop') ||
    normalized.includes('hom nao tot') ||
    normalized.includes('khi nao phu hop') ||
    normalized.includes('luc nao phu hop') ||
    normalized.includes('chon ngay nao') ||
    normalized.includes('de xuat ngay')
  );
}

function buildLunarDisplay(detail) {
  const lunarMonth = detail.lunar.month < 0
    ? `${Math.abs(detail.lunar.month)} nhuận`
    : String(detail.lunar.month);

  return `ngày ${detail.lunar.day}-${lunarMonth} năm ${detail.can_chi_year}`;
}

function buildDateIntro(detail) {
  return `Ngày ${detail.solar_date} tức ${buildLunarDisplay(detail)}`;
}

async function loadConversationHistory(conversationId, userId) {
  if (!conversationId) {
    return [];
  }

  const [conversationRows] = await pool.execute(
    'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ? LIMIT 1',
    [conversationId, userId],
  );

  if (conversationRows.length === 0) {
    throw new AppError('Không có quyền truy cập cuộc hội thoại này.', 403);
  }

  const [messages] = await pool.execute(
    `SELECT role, content
       FROM chat_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, id ASC`,
    [conversationId],
  );

  return messages;
}

function resolveAdvisorDates({ dateRange, selectedDate, message }) {
  if (dateRange && dateRange.from && dateRange.to) {
    const startDate = normalizeDateInput(dateRange.from);
    const endDate = normalizeDateInput(dateRange.to);

    if (!startDate || !endDate || startDate > endDate) {
      return {
        error: 'Khoảng ngày tư vấn không hợp lệ.',
      };
    }

    const rangeDates = getDateStringsBetween(startDate, endDate);

    if (rangeDates.length > MAX_ADVISOR_RANGE_DAYS) {
      return {
        error: `Khoảng thời gian tư vấn tối đa là ${MAX_ADVISOR_RANGE_DAYS} ngày.`,
      };
    }

    return {
      contextMode: rangeDates.length > 1 ? 'date_suggestion' : 'single_date',
      datesToFetch: rangeDates,
    };
  }

  const normalizedSelectedDate = selectedDate
    ? normalizeDateInput(selectedDate)
    : getTodayDateString();

  if (!normalizedSelectedDate) {
    return {
      error: 'selected_date không hợp lệ. Vui lòng sử dụng YYYY-MM-DD.',
    };
  }

  if (isSuitableDateQuestion(message)) {
    const endDate = addDays(normalizedSelectedDate, MAX_ADVISOR_RANGE_DAYS - 1);

    return {
      contextMode: 'date_suggestion',
      datesToFetch: getDateStringsBetween(normalizedSelectedDate, endDate),
    };
  }

  return {
    contextMode: 'single_date',
    datesToFetch: [normalizedSelectedDate],
  };
}

/**
 * API gửi tin nhắn và nhận tư vấn từ AI
 * POST /api/advisor/chat
 */
async function chat(req, res, next) {
  let conn;
  try {
    const userId = req.user.id;
    const { conversation_id, message, selected_date, date_range } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung câu hỏi không được để trống.'
      });
    }

    const activeConversationIdFromRequest = conversation_id || null;
    const conversationHistory = await loadConversationHistory(activeConversationIdFromRequest, userId);
    const resolvedDates = resolveAdvisorDates({
      dateRange: date_range,
      selectedDate: selected_date,
      message,
    });

    if (resolvedDates.error) {
      return res.status(400).json({
        success: false,
        message: resolvedDates.error,
      });
    }

    const { contextMode, datesToFetch } = resolvedDates;

    // 2. Gom context lịch của các ngày này
    const calendarContext = [];
    for (const dateStr of datesToFetch) {
      try {
        const detail = await calendarService.getDayDetail(dateStr, userId);
        const dayAdvice = detail.day_advice || {};

        calendarContext.push({
          date: detail.solar_date,
          date_intro: buildDateIntro(detail),
          lunar_display: buildLunarDisplay(detail),
          weekday: detail.weekday,
          lunar_date: detail.lunar_date,
          lunar: {
            day: detail.lunar.day,
            month: detail.lunar.month,
            year: detail.lunar.year,
          },
          can_chi: detail.can_chi_day,
          can_chi_detail: {
            day: detail.can_chi_day,
            month: detail.can_chi_month,
            year: detail.can_chi_year,
          },
          holidays: detail.holidays,
          user_events: detail.events,
          day_quality: detail.day_quality,
          day_element: detail.day_element,
          conflict_age: detail.conflict_age,
          good_hours: detail.good_hours,
          day_advice: {
            source: 'calendarService.getDayDetail / dayAdviceService / lunarText',
            rating: dayAdvice.day_rating || 'neutral',
            summary: dayAdvice.summary || 'Thông tin đánh giá ngày chưa sẵn sàng.',
            good_for: dayAdvice.good_for || [],
            avoid_for: dayAdvice.avoid_for || [],
          },
          // Legacy fields kept so older prompts/tests still receive the same shape.
          day_rating: dayAdvice.day_rating || 'neutral',
          day_summary: dayAdvice.summary || 'Thông tin đánh giá ngày chưa sẵn sàng.',
          good_for: dayAdvice.good_for || [],
          avoid_for: dayAdvice.avoid_for || [],
        });
      } catch (err) {
        console.error(`[AIAdvisorController] Lỗi gom context ngày ${dateStr}:`, err);
      }
    }

    // 3. Gọi AI Advisor Service
    const aiResponse = await aiAdvisorService.askAdvisor(
      message,
      calendarContext,
      conversationHistory,
      { contextMode },
    );

    // 4. Lưu hội thoại vào Database (Transaction)
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let activeConversationId = activeConversationIdFromRequest;

    if (!activeConversationId) {
      const title = message.length > 50 ? `${message.slice(0, 47)}...` : message;
      const [newConversation] = await conn.execute(
        'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)',
        [userId, title]
      );
      activeConversationId = newConversation.insertId;
    }

    // Lưu tin nhắn của User
    await conn.execute(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [activeConversationId, 'user', message]
    );

    const metadata = JSON.stringify({
      intent: aiResponse.intent,
      rating: aiResponse.rating,
      recommended_actions: aiResponse.recommended_actions || [],
      cautions: aiResponse.cautions || [],
      suggested_dates: aiResponse.suggested_dates || [],
      referenced_dates: aiResponse.referenced_dates || [],
      date_intro: aiResponse.date_intro || '',
      context_mode: contextMode,
      disclaimer: aiResponse.disclaimer,
      context_dates: datesToFetch,
    });

    await conn.execute(
      'INSERT INTO chat_messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)',
      [activeConversationId, 'assistant', aiResponse.answer, metadata]
    );

    await conn.execute(
      'UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [activeConversationId]
    );

    await conn.commit();
    conn.release();
    conn = null;

    res.json({
      success: true,
      data: {
        conversation_id: Number(activeConversationId),
        ...aiResponse,
      },
    });
  } catch (error) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(error);
  }
}

async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      `SELECT id, title, created_at, updated_at
       FROM chat_conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC, id DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const [conversationRows] = await pool.execute(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ? LIMIT 1',
      [conversationId, userId]
    );

    if (conversationRows.length === 0) {
      throw new AppError('Không tìm thấy cuộc hội thoại hoặc bạn không có quyền truy cập.', 404);
    }

    const [messages] = await pool.execute(
      `SELECT id, role, content, metadata, created_at
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC, id ASC`,
      [conversationId]
    );

    const formattedMessages = messages.map((msg) => {
      let metadata = null;
      if (msg.metadata) {
        try {
          metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
        } catch (error) {
          console.error('[AIAdvisorController] Failed to parse message metadata:', error);
        }
      }

      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata,
        created_at: msg.created_at,
      };
    });

    res.json({
      success: true,
      data: formattedMessages,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  chat,
  getConversations,
  getMessages,
};
