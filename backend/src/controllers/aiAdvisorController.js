const aiAdvisorService = require('../services/aiAdvisorService');
const calendarService = require('../services/calendarService');
const { pool } = require('../config/db');

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

    // 1. Xác định các ngày cần lấy context
    const datesToFetch = [];
    
    if (date_range && date_range.from && date_range.to) {
      // Lấy danh sách ngày trong khoảng
      const start = new Date(date_range.from);
      const end = new Date(date_range.to);
      
      // Giới hạn khoảng ngày tối đa để tránh quá tải (ví dụ: tối đa 15 ngày cho MVP)
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > 15) {
        return res.status(400).json({
          success: false,
          message: 'Khoảng thời gian tư vấn tối đa là 15 ngày.'
        });
      }

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToFetch.push(d.toISOString().split('T')[0]);
      }
    } else if (selected_date) {
      datesToFetch.push(selected_date);
    } else {
      // Mặc định là ngày hôm nay
      datesToFetch.push(new Date().toISOString().split('T')[0]);
    }

    // 2. Gom context lịch của các ngày này
    const calendarContext = [];
    for (const dateStr of datesToFetch) {
      try {
        const detail = await calendarService.getDayDetail(dateStr, userId);
        calendarContext.push({
          date: detail.solar_date,
          weekday: detail.weekday,
          lunar_date: detail.lunar_date,
          can_chi: detail.can_chi_day,
          holidays: detail.holidays,
          user_events: detail.events,
          day_rating: detail.day_advice.day_rating,
          day_summary: detail.day_advice.summary
        });
      } catch (err) {
        console.error(`[AIAdvisorController] Lỗi gom context ngày ${dateStr}:`, err);
      }
    }

    // 3. Gọi AI Advisor Service
    const aiResponse = await aiAdvisorService.askAdvisor(message, calendarContext, aiResponse => aiResponse.intent);

    // 4. Lưu hội thoại vào Database (Transaction)
    conn = await pool.getConnection();
    await conn.beginTransaction();

    let activeConversationId = conversation_id;

    // Nếu chưa có conversation_id, tạo mới cuộc hội thoại
    if (!activeConversationId) {
      const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      const [newConv] = await conn.execute(
        'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)',
        [userId, title]
      );
      activeConversationId = newConv.insertId;
    } else {
      // Kiểm tra cuộc hội thoại có thuộc về user hiện tại không
      const [convCheck] = await conn.execute(
        'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ? LIMIT 1',
        [activeConversationId, userId]
      );
      if (convCheck.length === 0) {
        conn.release();
        return res.status(403).json({
          success: false,
          message: 'Không có quyền truy cập cuộc hội thoại này.'
        });
      }
    }

    // Lưu tin nhắn của User
    await conn.execute(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [activeConversationId, 'user', message]
    );

    // Lưu tin nhắn của AI Assistant kèm metadata
    const metadataStr = JSON.stringify({
      intent: aiResponse.intent,
      rating: aiResponse.rating,
      suggested_dates: aiResponse.suggested_dates || []
    });

    await conn.execute(
      'INSERT INTO chat_messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)',
      [activeConversationId, 'assistant', aiResponse.answer, metadataStr]
    );

    await conn.commit();
    conn.release();

    // 5. Trả kết quả về client
    res.json({
      success: true,
      data: {
        conversation_id: Number(activeConversationId),
        ...aiResponse
      }
    });

  } catch (error) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(error);
  }
}

/**
 * Lấy danh sách các cuộc hội thoại của user
 * GET /api/advisor/conversations
 */
async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      'SELECT id, title, created_at FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lấy lịch sử tin nhắn của một cuộc hội thoại
 * GET /api/advisor/conversations/:id/messages
 */
async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    // 1. Kiểm tra tính hợp lệ của cuộc hội thoại
    const [conv] = await pool.execute(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ? LIMIT 1',
      [conversationId, userId]
    );

    if (conv.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc hội thoại hoặc bạn không có quyền truy cập.'
      });
    }

    // 2. Lấy tin nhắn
    const [messages] = await pool.execute(
      'SELECT id, role, content, metadata, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );

    // Parse metadata JSON
    const formattedMessages = messages.map(msg => {
      let meta = null;
      if (msg.metadata) {
        try {
          meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
        } catch (e) {
          console.error(e);
        }
      }
      return {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: meta,
        created_at: msg.created_at
      };
    });

    res.json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  chat,
  getConversations,
  getMessages
};
