/**
 * Test script kiểm tra luồng Chatbot và lưu lịch sử hội thoại
 */
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'lunar_user';
process.env.DB_PASSWORD = 'lunar_password';
process.env.DB_NAME = 'lunar_calendar_mvp';
process.env.JWT_SECRET = 'dev-secret-change-in-production';

const aiAdvisorService = require('../services/aiAdvisorService');
const { pool } = require('../config/db');

async function run() {
  console.log('=== [Kịch bản 3] Bắt đầu kiểm tra Chatbot và Lưu Lịch sử ===');

  let conn;
  try {
    // 1. Tạo một User giả lập hoặc lấy User đầu tiên trong DB
    const [users] = await pool.execute('SELECT id, name FROM users LIMIT 1');
    let testUserId;
    if (users.length === 0) {
      console.log('Không tìm thấy người dùng trong DB. Đang tạo User test...');
      const [insertRes] = await pool.execute(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        ['Test User', `test_${Date.now()}@example.com`, 'hashedpassword']
      );
      testUserId = insertRes.insertId;
    } else {
      testUserId = users[0].id;
      console.log(`Sử dụng User test hiện tại: ID ${testUserId} (${users[0].name})`);
    }

    // 2. Định nghĩa câu hỏi kiểm thử và ngữ cảnh lịch
    const testMessage = 'Ngày mai tôi có việc gì quan trọng không và cần chuẩn bị gì?';
    const calendarContext = [
      {
        date: '2026-06-28',
        weekday: 'Chủ Nhật',
        lunar_date: '14/5 âm lịch',
        can_chi: 'Quý Dậu',
        holidays: [],
        user_events: [
          { id: 99, title: 'Họp kế hoạch dự án', description: 'Chuẩn bị slide thuyết trình và số liệu' }
        ],
        day_rating: 'neutral',
        day_summary: 'Ngày thích hợp để hoàn thiện kế hoạch cũ.'
      }
    ];

    // 3. Gọi AI Advisor Service
    console.log('\nĐang gọi OpenAI Advisor Service...');
    const aiResponse = await aiAdvisorService.askAdvisor(testMessage, calendarContext, 'personal_schedule_advice');
    console.log('Phản hồi từ AI:', JSON.stringify(aiResponse));

    // 4. Lưu hội thoại vào DB giống như Controller làm
    conn = await pool.getConnection();
    await conn.beginTransaction();

    console.log('\nĐang lưu cuộc hội thoại vào database...');
    // Tạo conversation mới
    const [newConv] = await conn.execute(
      'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)',
      [testUserId, 'Test Chat Conversation']
    );
    const activeConversationId = newConv.insertId;
    console.log(`  - Đã tạo Conversation mới (ID: ${activeConversationId})`);

    // Lưu tin nhắn User
    await conn.execute(
      'INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)',
      [activeConversationId, 'user', testMessage]
    );
    console.log('  - Đã lưu tin nhắn của User.');

    // Lưu tin nhắn Assistant
    const metadataStr = JSON.stringify({
      intent: aiResponse.intent,
      rating: aiResponse.rating,
      suggested_dates: aiResponse.suggested_dates || []
    });

    await conn.execute(
      'INSERT INTO chat_messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)',
      [activeConversationId, 'assistant', aiResponse.answer, metadataStr]
    );
    console.log('  - Đã lưu tin nhắn phản hồi của Assistant.');

    await conn.commit();
    console.log('Transaction COMMIT thành công!');

    // 5. Xác minh dữ liệu trong DB
    const [convRows] = await pool.execute(
      'SELECT id, title FROM chat_conversations WHERE id = ?',
      [activeConversationId]
    );
    const [msgRows] = await pool.execute(
      'SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [activeConversationId]
    );

    if (convRows.length > 0 && msgRows.length === 2) {
      console.log('\n[PASS] Kiểm tra Chatbot và Lưu Lịch sử THÀNH CÔNG!');
      console.log(`  - Tìm thấy Cuộc hội thoại: "${convRows[0].title}"`);
      console.log('  - Các tin nhắn đã lưu:');
      msgRows.forEach((m, idx) => {
        console.log(`    [${idx + 1}] ${m.role}: ${m.content.substring(0, 50)}...`);
      });
    } else {
      console.log('\n[FAIL] Dữ liệu lưu trong DB không khớp!');
    }

  } catch (error) {
    if (conn) {
      await conn.rollback();
    }
    console.error('\n[ERROR] Lỗi trong quá trình chạy test_chat:', error);
  } finally {
    if (conn) {
      conn.release();
    }
    await pool.end();
    console.log('\nĐã đóng kết nối database.');
  }
}

run();
