# Lịch Vạn Niên AI — Tài liệu Phân tích & Thiết kế MVP

> Phiên bản: MVP 1.0  
> Mục tiêu: Có thể bắt đầu triển khai ngay với phạm vi gọn, đủ để demo một ứng dụng lịch có tài khoản, lịch cá nhân và chatbot tư vấn theo ngữ cảnh ngày.

---

## 1. Tổng quan sản phẩm

### 1.1. Tên sản phẩm gợi ý

```text
Lịch Vạn Niên AI
```

### 1.2. Mô tả ngắn

**Lịch Vạn Niên AI** là ứng dụng dành cho người dùng Việt Nam, cho phép xem lịch dương, lịch âm, ngày lễ, quản lý sự kiện cá nhân và nhận gợi ý tham khảo từ chatbot về công việc nên ưu tiên, ngày phù hợp cho một hoạt động hoặc mức độ phù hợp của một ngày cụ thể.

### 1.3. Vấn đề ứng dụng giải quyết

Ứng dụng lịch thông thường chỉ trả lời:

```text
Hôm nay là ngày bao nhiêu?
```

MVP này hướng tới trả lời thêm các câu hỏi có giá trị thực tế hơn:

```text
Ngày mai tôi nên ưu tiên làm gì?
Ngày nào trong 2 tuần tới phù hợp để khai trương?
Ngày 15/07/2026 có phù hợp để ký hợp đồng không?
Ngày mai tôi có việc gì và cần chuẩn bị gì?
```

### 1.4. Điểm khác biệt chính

```text
Lịch không chỉ hiển thị ngày.
Lịch có thể sử dụng dữ liệu ngày và lịch cá nhân để đưa ra gợi ý hành động tiếp theo.
```

---

## 2. Mục tiêu MVP

### 2.1. Mục tiêu bắt buộc

- Người dùng đăng ký, đăng nhập và đăng xuất được.
- Người dùng xem được lịch theo tháng.
- Người dùng xem được thông tin cơ bản của một ngày.
- Người dùng tạo, sửa, xóa sự kiện cá nhân.
- Người dùng xem được ngày lễ cơ bản.
- Người dùng nhận được đánh giá ngày tốt/xấu mang tính tham khảo.
- Người dùng có thể chat để hỏi về ngày, kế hoạch và sự kiện cá nhân.

### 2.2. Mục tiêu không thuộc MVP

Không triển khai trong phiên bản đầu:

```text
- Tử vi đầy đủ
- Lá số tử vi
- An sao, sao hạn, đại vận, tiểu vận
- Phong thủy chuyên sâu
- Push notification
- Đồng bộ Google Calendar
- Đồng bộ nhiều thiết bị chuyên sâu
- Thanh toán
- Quản trị viên và phân quyền admin
- Dự đoán chắc chắn về tài lộc, sức khỏe, vận mệnh hoặc thành công
```

---

## 3. Đánh giá phạm vi: Có hợp lý cho MVP không?

### Kết luận

Phạm vi sau là hợp lý cho MVP:

```text
Authentication
+ Lịch tháng
+ Lịch âm/dương
+ Ngày lễ
+ Sự kiện cá nhân
+ Ngày tốt/xấu tham khảo
+ Chatbot tư vấn theo lịch và sự kiện cá nhân
```

Tuy nhiên, chatbot phải được giới hạn ở một số ý định rõ ràng. Không nên làm chatbot trả lời tự do mọi lĩnh vực ngay từ đầu.

### Ba nhóm câu hỏi chatbot ưu tiên

1. **Tư vấn ngày tiếp theo**

```text
Ngày mai tôi nên ưu tiên làm gì?
```

2. **Tìm ngày phù hợp trong một khoảng thời gian**

```text
Trong 14 ngày tới, ngày nào phù hợp để khai trương?
```

3. **Đánh giá một ngày cụ thể cho một hoạt động**

```text
Ngày 15/07/2026 có phù hợp để ký hợp đồng không?
```

### Nguyên tắc sản phẩm

Chatbot là một lớp **diễn giải và gợi ý tham khảo dựa trên dữ liệu lịch**, không phải hệ thống tử vi hay công cụ dự đoán chắc chắn.

---

## 4. Phạm vi tính năng và độ ưu tiên

| Mã | Nhóm | Tính năng | Ưu tiên | Ghi chú |
|---|---|---|---|---|
| F01 | Tài khoản | Đăng ký | P0 | Bắt buộc |
| F02 | Tài khoản | Đăng nhập / đăng xuất | P0 | Bắt buộc |
| F03 | Lịch | Xem lịch tháng | P0 | Bắt buộc |
| F04 | Lịch | Chuyển tháng trước/sau | P0 | Bắt buộc |
| F05 | Lịch | Chọn ngày để xem chi tiết | P0 | Bắt buộc |
| F06 | Ngày | Hiển thị ngày dương, âm, thứ, can chi | P0 | Dùng thư viện chuyển đổi âm/dương |
| F07 | Ngày | Hiển thị ngày lễ | P0 | Seed dữ liệu cơ bản |
| F08 | Sự kiện | Thêm sự kiện | P0 | Bắt buộc |
| F09 | Sự kiện | Sửa / xóa sự kiện | P0 | Bắt buộc |
| F10 | Sự kiện | Đánh dấu ngày có sự kiện trên lịch | P0 | Bắt buộc |
| F11 | Ngày tốt/xấu | Hiển thị đánh giá tham khảo | P0 | Cache theo ngày |
| F12 | Chatbot | Hỏi ngày mai nên làm gì | P0 | Intent 1 |
| F13 | Chatbot | Tìm ngày phù hợp cho một việc | P0 | Intent 2 |
| F14 | Chatbot | Đánh giá ngày cụ thể cho một việc | P0 | Intent 3 |
| F15 | Chatbot | Tư vấn dựa trên lịch cá nhân | P0 | Có thể dùng events |
| F16 | Chatbot | Lưu lịch sử hội thoại | P1 | Làm tối thiểu nếu còn thời gian |
| F17 | Giao diện | Dark mode | P2 | Có thể bỏ |
| F18 | Giao diện | Bộ lọc sự kiện | P2 | Có thể bỏ |
| F19 | Ngày | Giờ hoàng đạo | P2 | Làm bằng dữ liệu tĩnh nếu còn thời gian |
| F20 | Thông báo | Nhắc lịch | Không làm MVP | Để bản sau |

---

## 5. Vai trò người dùng

### 5.1. Khách chưa đăng nhập

Có thể:

- Xem màn hình đăng ký.
- Xem màn hình đăng nhập.

Không thể:

- Tạo hoặc xem sự kiện cá nhân.
- Sử dụng chatbot theo lịch cá nhân.

### 5.2. Người dùng đã đăng nhập

Có thể:

- Xem lịch tháng.
- Xem chi tiết ngày.
- Thêm, sửa, xóa sự kiện của chính mình.
- Hỏi chatbot.
- Xem lịch sử chat của chính mình nếu đã triển khai chức năng này.

---

## 6. Luồng sử dụng tổng quát

```text
Đăng ký / Đăng nhập
        ↓
Mở màn hình lịch tháng
        ↓
Chọn một ngày
        ↓
Xem ngày âm, dương, ngày lễ, sự kiện, ngày tốt/xấu
        ↓
Thêm/sửa/xóa sự kiện nếu cần
        ↓
Đặt câu hỏi cho chatbot
        ↓
Chatbot dùng dữ liệu ngày + lịch cá nhân để trả lời
```

---

## 7. Use Case chi tiết

### UC-01 — Đăng ký tài khoản

**Actor:** Khách chưa có tài khoản

**Mục tiêu:** Tạo tài khoản để sử dụng lịch cá nhân và chatbot.

**Tiền điều kiện:** Email chưa tồn tại trong hệ thống.

**Luồng chính:**

```text
1. Người dùng mở trang Đăng ký.
2. Người dùng nhập họ tên, email và mật khẩu.
3. Hệ thống kiểm tra dữ liệu hợp lệ.
4. Hệ thống kiểm tra email chưa được sử dụng.
5. Hệ thống mã hóa mật khẩu.
6. Hệ thống lưu tài khoản.
7. Hệ thống trả token đăng nhập hoặc chuyển người dùng sang màn hình đăng nhập.
```

**Kết quả:** Người dùng có tài khoản hợp lệ.

---

### UC-02 — Đăng nhập

**Actor:** Người dùng đã có tài khoản

**Luồng chính:**

```text
1. Người dùng nhập email và mật khẩu.
2. Hệ thống xác thực thông tin.
3. Hệ thống trả JWT/token.
4. Frontend lưu token an toàn.
5. Người dùng được chuyển vào màn hình lịch.
```

**Kết quả:** Người dùng truy cập được dữ liệu cá nhân.

---

### UC-03 — Xem lịch tháng

**Actor:** Người dùng đã đăng nhập

**Luồng chính:**

```text
1. Người dùng mở màn hình lịch.
2. Hệ thống hiển thị tháng hiện tại.
3. Hệ thống đánh dấu ngày hôm nay.
4. Hệ thống hiển thị dấu hiệu cho các ngày có sự kiện.
5. Hệ thống hiển thị dấu hiệu cho các ngày lễ.
6. Người dùng bấm tháng trước hoặc tháng sau.
7. Người dùng chọn một ngày để xem chi tiết.
```

**Kết quả:** Người dùng xem được tổng quan lịch theo tháng.

---

### UC-04 — Xem chi tiết ngày

**Actor:** Người dùng đã đăng nhập

**Câu chuyện sử dụng:** Người dùng chọn ngày `15/07/2026`.

**Luồng chính:**

```text
1. Frontend gửi ngày được chọn đến backend.
2. Backend lấy ngày dương và thứ trong tuần.
3. Backend chuyển ngày dương sang âm lịch.
4. Backend kiểm tra ngày lễ.
5. Backend lấy sự kiện cá nhân trong ngày của người dùng hiện tại.
6. Backend lấy đánh giá ngày tốt/xấu từ cache.
7. Nếu chưa có cache, backend tạo dữ liệu đánh giá và lưu cache.
8. Backend trả dữ liệu ngày về frontend.
```

**Thông tin hiển thị:**

```text
- Ngày dương
- Ngày âm
- Thứ trong tuần
- Can chi ngày
- Ngày lễ, nếu có
- Danh sách sự kiện cá nhân
- Đánh giá ngày: thuận lợi / trung tính / cần thận trọng
- Việc nên ưu tiên
- Việc cần thận trọng
```

---

### UC-05 — Thêm sự kiện cá nhân

**Actor:** Người dùng đã đăng nhập

**Luồng chính:**

```text
1. Người dùng chọn một ngày trên lịch.
2. Người dùng bấm nút Thêm sự kiện.
3. Người dùng nhập tiêu đề, mô tả và thời gian bắt đầu/kết thúc.
4. Hệ thống kiểm tra dữ liệu.
5. Hệ thống lưu sự kiện gắn với user_id hiện tại.
6. Lịch tháng hiển thị dấu hiệu cho ngày có sự kiện.
```

**Ví dụ:**

```text
Tiêu đề: Họp khách hàng
Bắt đầu: 29/06/2026 09:00
Kết thúc: 29/06/2026 10:30
Mô tả: Chuẩn bị demo dự án và báo giá.
```

---

### UC-06 — Sửa hoặc xóa sự kiện

**Actor:** Người dùng đã đăng nhập

**Luồng chính:**

```text
1. Người dùng mở danh sách sự kiện của một ngày.
2. Người dùng chọn một sự kiện thuộc tài khoản của mình.
3. Người dùng bấm Sửa hoặc Xóa.
4. Backend kiểm tra event.user_id có khớp user hiện tại hay không.
5. Backend thực hiện cập nhật hoặc xóa dữ liệu.
```

**Quy tắc bảo mật:** Một người dùng không thể sửa/xóa sự kiện của người dùng khác.

---

### UC-07 — Hỏi chatbot: “Ngày mai tôi nên ưu tiên làm gì?”

**Actor:** Người dùng đã đăng nhập

**Ví dụ câu hỏi:**

```text
Ngày mai tôi nên ưu tiên làm gì?
```

**Dữ liệu backend cần chuẩn bị:**

```json
{
  "date": "2026-06-28",
  "lunar_date": "13/05 âm lịch",
  "can_chi_day": "...",
  "day_rating": "neutral",
  "holidays": [],
  "user_events": [
    {
      "title": "Họp với khách hàng",
      "description": "Chốt yêu cầu giao diện"
    }
  ]
}
```

**Kết quả mong muốn:**

```text
Ngày mai bạn có lịch họp với khách hàng. Nên ưu tiên chuẩn bị tài liệu,
liệt kê các điểm cần chốt, xác nhận mục tiêu cuộc họp và gửi lại tóm tắt
sau khi trao đổi.

Theo thông tin lịch tham khảo, ngày này phù hợp để xử lý các công việc đang có,
trao đổi kế hoạch và hoàn thiện các việc cần sự cẩn thận.
```

---

### UC-08 — Hỏi chatbot: “Ngày nào phù hợp để làm việc này?”

**Actor:** Người dùng đã đăng nhập

**Ví dụ câu hỏi:**

```text
Trong 14 ngày tới, ngày nào phù hợp để khai trương?
```

**Luồng chính:**

```text
1. Hệ thống nhận diện hoạt động: khai trương.
2. Hệ thống nhận diện khoảng thời gian: 14 ngày tới.
3. Backend lấy dữ liệu lịch cho từng ngày trong khoảng yêu cầu.
4. Backend lấy các đánh giá ngày từ cache hoặc tạo mới.
5. Backend gửi danh sách ngày và ngữ cảnh cho AI.
6. AI xếp hạng, diễn giải và trả về các ngày được gợi ý.
```

**Kết quả mong muốn:**

```text
Các ngày nên cân nhắc trong 14 ngày tới:

1. 03/07/2026
   - Phù hợp để bắt đầu hoạt động và công bố kế hoạch.

2. 07/07/2026
   - Phù hợp cho việc gặp gỡ đối tác hoặc giới thiệu sản phẩm.

3. 10/07/2026
   - Phù hợp để triển khai công việc đã chuẩn bị kỹ.

Thông tin mang tính tham khảo. Bạn vẫn nên ưu tiên nguồn lực, nhân sự,
kế hoạch kinh doanh và lịch của đối tác.
```

---

### UC-09 — Hỏi chatbot: “Ngày này làm việc kia có phù hợp không?”

**Actor:** Người dùng đã đăng nhập

**Ví dụ câu hỏi:**

```text
Ngày 15/07/2026 có phù hợp để ký hợp đồng không?
```

**Luồng chính:**

```text
1. Hệ thống nhận diện ngày: 15/07/2026.
2. Hệ thống nhận diện hoạt động: ký hợp đồng.
3. Backend lấy thông tin ngày, ngày lễ và sự kiện cá nhân.
4. Backend gửi ngữ cảnh cho AI.
5. AI trả lời bằng gợi ý thực tế và mức đánh giá tham khảo.
```

**Kết quả mong muốn:**

```text
Ngày 15/07/2026 có thể phù hợp ở mức tham khảo cho việc ký hợp đồng nếu
các điều khoản, chi phí, trách nhiệm và thời hạn đã được kiểm tra đầy đủ.

Nên ưu tiên xác nhận bằng văn bản, kiểm tra điều khoản thanh toán và tránh
ra quyết định vội vàng.
```

---

### UC-10 — Hỏi chatbot theo lịch cá nhân

**Actor:** Người dùng đã đăng nhập

**Ví dụ câu hỏi:**

```text
Tôi có lịch phỏng vấn vào ngày mai, nên chuẩn bị gì?
```

**Kết quả mong muốn:**

```text
Ngày mai bạn có sự kiện "Phỏng vấn khách hàng".

Nên chuẩn bị:
- Tóm tắt mục tiêu buổi phỏng vấn.
- Danh sách câu hỏi cần khai thác.
- Tài liệu giới thiệu hoặc demo liên quan.
- Báo giá hoặc phương án sơ bộ nếu cần.
- Kiểm tra lại thời gian, địa điểm hoặc đường dẫn họp.
```

---

## 8. Quy tắc và giới hạn chatbot

### 8.1. Chatbot chỉ diễn giải dữ liệu do backend cung cấp

```text
Frontend
  ↓
Backend nhận câu hỏi
  ↓
Backend lấy lịch, ngày lễ, sự kiện cá nhân và đánh giá ngày
  ↓
Backend tạo calendar_context
  ↓
AI diễn giải dựa trên calendar_context
  ↓
Backend trả kết quả cho frontend
```

AI không được tự bịa ngày âm, ngày lễ, can chi hoặc sự kiện cá nhân.

### 8.2. Dữ liệu chatbot được phép sử dụng

```text
- Ngày dương
- Ngày âm
- Thứ trong tuần
- Can chi
- Ngày lễ
- Đánh giá ngày tốt/xấu tham khảo
- Sự kiện của chính người dùng hiện tại
- Khoảng ngày người dùng yêu cầu
- Nội dung câu hỏi của người dùng
```

### 8.3. Dữ liệu chatbot không được phép gửi

```text
- Mật khẩu
- JWT/token
- Thông tin của người dùng khác
- Sự kiện của người dùng khác
- Dữ liệu nhạy cảm không cần thiết cho câu trả lời
```

### 8.4. Quy tắc trả lời

```text
- Luôn nói theo hướng tham khảo.
- Không khẳng định kết quả chắc chắn.
- Không cam kết may mắn, tài lộc, sức khỏe hay thành công.
- Không thay thế tư vấn tài chính, pháp lý hoặc y tế chuyên môn.
- Ưu tiên lời khuyên thực tế: chuẩn bị, kiểm tra rủi ro, quản lý thời gian,
  xác nhận thông tin và trao đổi rõ ràng.
```

### 8.5. Ví dụ trả lời đúng hướng

```text
Ngày này phù hợp để cân nhắc và chuẩn bị kế hoạch.
Bạn nên kiểm tra kỹ hợp đồng trước khi ký.
```

### 8.6. Ví dụ cần tránh

```text
Ngày này chắc chắn mang lại tài lộc.
Bạn ký hợp đồng hôm nay sẽ thành công.
```

---

## 9. Prompt hệ thống mẫu cho chatbot

```text
Bạn là trợ lý lịch vạn niên Việt Nam.

Nhiệm vụ của bạn là hỗ trợ người dùng:
- Gợi ý công việc nên ưu tiên theo ngày.
- Đánh giá tham khảo một ngày có phù hợp với một hoạt động hay không.
- Gợi ý một số ngày phù hợp trong khoảng thời gian người dùng yêu cầu.
- Đưa ra lời khuyên chuẩn bị dựa trên lịch cá nhân của người dùng.

Bạn chỉ được sử dụng dữ liệu calendar_context do hệ thống cung cấp.
Không tự tạo ngày âm, ngày lễ, can chi hoặc sự kiện không có trong dữ liệu.

Nguyên tắc trả lời:
- Đây là thông tin tham khảo, không phải dự đoán chắc chắn.
- Không khẳng định về tài lộc, sức khỏe, vận mệnh hoặc kết quả tương lai.
- Ưu tiên lời khuyên thực tế: chuẩn bị tài liệu, kiểm tra kế hoạch,
  quản lý thời gian, trao đổi rõ ràng và kiểm tra rủi ro.
- Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.
- Khi gợi ý ngày, phải giải thích lý do ngày đó được đề xuất.
- Nếu người dùng hỏi ngoài phạm vi lịch và kế hoạch cá nhân, hãy nói rõ
  ứng dụng chỉ hỗ trợ gợi ý lịch mang tính tham khảo.
```

---

## 10. Định dạng JSON AI nên trả về

Nên yêu cầu AI trả JSON có cấu trúc để frontend hiển thị ổn định.

```json
{
  "intent": "date_suitability",
  "answer": "Ngày này phù hợp ở mức tham khảo cho việc ký hợp đồng nếu bạn đã chuẩn bị kỹ nội dung.",
  "rating": "neutral",
  "recommended_actions": [
    "Kiểm tra điều khoản",
    "Xác nhận trách nhiệm các bên",
    "Chuẩn bị tài liệu liên quan"
  ],
  "cautions": [
    "Không quyết định vội vàng",
    "Đọc kỹ điều khoản thanh toán"
  ],
  "suggested_dates": [
    {
      "date": "2026-07-03",
      "reason": "Phù hợp hơn cho hoạt động gặp gỡ và triển khai kế hoạch."
    }
  ],
  "disclaimer": "Thông tin chỉ mang tính tham khảo."
}
```

### Ý nghĩa trường dữ liệu

| Field | Mô tả |
|---|---|
| `intent` | Loại câu hỏi chatbot đã xử lý |
| `answer` | Câu trả lời chính cho người dùng |
| `rating` | `favorable`, `neutral`, hoặc `caution` |
| `recommended_actions` | Việc nên làm hoặc nên ưu tiên |
| `cautions` | Các điểm cần lưu ý |
| `suggested_dates` | Ngày đề xuất khi người dùng hỏi theo khoảng thời gian |
| `disclaimer` | Cảnh báo thông tin chỉ mang tính tham khảo |

---

## 11. Kiến trúc MVP đề xuất

```text
Frontend
- React / React Native / Flutter
- Calendar UI
- Authentication UI
- Event UI
- Chat UI

Backend
- Laravel hoặc NodeJS Express
- JWT Authentication
- Calendar Service
- Lunar Date Service
- Holiday Service
- Event Service
- Day Advice Service
- AI Advisor Service

Database
- MySQL

External Service
- OpenAI API gọi từ backend
```

### 11.1. Các service backend

```text
AuthService
CalendarService
LunarCalendarService
HolidayService
EventService
DayAdviceService
AIAdvisorService
```

### 11.2. Trách nhiệm từng service

| Service | Trách nhiệm |
|---|---|
| `AuthService` | Đăng ký, đăng nhập, hash mật khẩu, JWT |
| `CalendarService` | Tạo dữ liệu lịch tháng, ngày dương, thứ |
| `LunarCalendarService` | Chuyển ngày dương sang ngày âm |
| `HolidayService` | Kiểm tra ngày lễ dương/lunar |
| `EventService` | CRUD sự kiện theo người dùng |
| `DayAdviceService` | Lấy/tạo cache ngày tốt xấu |
| `AIAdvisorService` | Chuẩn hóa context, gọi AI, parse JSON trả về |

### 11.3. Bảo mật API key

```text
OpenAI API key chỉ đặt trong biến môi trường của backend.
Không đặt API key trong frontend, mobile app hoặc source public.
```

---

## 12. Thiết kế dữ liệu MVP

### 12.1. Quyết định thiết kế

- Không lưu toàn bộ lịch âm trong database: ngày âm nên được tính bằng thư viện hoặc service chuyển đổi ngày.
- Không tạo bảng `notes`: ghi chú có thể được lưu bằng `description` trong bảng sự kiện.
- Sự kiện cá nhân dùng `DATETIME` thay vì chỉ `DATE` để hỗ trợ gợi ý theo giờ và tránh xung đột thời gian trong cùng một ngày.
- Không tạo bảng `user_settings` trong MVP: dùng tiếng Việt, múi giờ `Asia/Ho_Chi_Minh`, giao diện mặc định.
- Dùng cache ngày tốt/xấu theo ngày để hạn chế gọi AI lặp lại.
- Dữ liệu tư vấn chung theo ngày có thể dùng chung; tư vấn liên quan sự kiện cá nhân chỉ dùng trong context của người dùng đó.

### 12.2. Số lượng bảng

MVP sử dụng **6 bảng**:

```text
users
calendar_events
holidays
day_advice_cache
chat_conversations
chat_messages
```

### 12.3. Quan hệ dữ liệu

```text
users
 ├── calendar_events
 └── chat_conversations
       └── chat_messages

holidays
 └── dữ liệu dùng chung

day_advice_cache
 └── cache đánh giá dùng chung theo ngày
```

---

## 13. SQL Database

### 13.1. Tạo database

```sql
CREATE DATABASE lunar_calendar_mvp
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE lunar_calendar_mvp;
```

### 13.2. Bảng `users`

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
```

### 13.3. Bảng `calendar_events`

```sql
CREATE TABLE calendar_events (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_calendar_events_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_calendar_events_user_start (user_id, start_at)
);
```

### 13.4. Bảng `holidays`

```sql
CREATE TABLE holidays (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    day TINYINT UNSIGNED NOT NULL,
    month TINYINT UNSIGNED NOT NULL,
    calendar_type ENUM('solar', 'lunar') NOT NULL DEFAULT 'solar',
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_holiday_name_date (
        name,
        day,
        month,
        calendar_type
    )
);
```

### 13.5. Bảng `day_advice_cache`

Mỗi ngày có một đánh giá chung. Có thể tạo lại khi thay đổi quy tắc hoặc prompt bằng `rule_version`.

```sql
CREATE TABLE day_advice_cache (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    solar_date DATE NOT NULL,
    lunar_date VARCHAR(50) NULL,
    can_chi_day VARCHAR(100) NULL,

    day_rating ENUM('favorable', 'neutral', 'caution')
        NOT NULL DEFAULT 'neutral',

    good_for JSON NULL,
    avoid_for JSON NULL,
    summary TEXT NULL,

    rule_version VARCHAR(30) NOT NULL DEFAULT 'v1',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_day_advice_date_version (
        solar_date,
        rule_version
    )
);
```

Ví dụ `good_for`:

```json
[
  "Lập kế hoạch",
  "Hoàn thành công việc đang dang dở",
  "Gặp gỡ và trao đổi công việc"
]
```

Ví dụ `avoid_for`:

```json
[
  "Ra quyết định vội vàng",
  "Cam kết tài chính khi chưa kiểm tra kỹ"
]
```

### 13.6. Bảng `chat_conversations`

```sql
CREATE TABLE chat_conversations (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_conversations_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_chat_conversations_user (user_id)
);
```

### 13.7. Bảng `chat_messages`

```sql
CREATE TABLE chat_messages (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT UNSIGNED NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES chat_conversations(id)
        ON DELETE CASCADE,

    INDEX idx_chat_messages_conversation_time (
        conversation_id,
        created_at
    )
);
```

Ví dụ `metadata`:

```json
{
  "selected_date": "2026-07-15",
  "intent": "date_suitability",
  "used_event_ids": [12, 15],
  "day_rating": "neutral"
}
```

---

## 14. Seed dữ liệu ngày lễ

```sql
INSERT INTO holidays (
    name,
    description,
    day,
    month,
    calendar_type,
    is_official
) VALUES
(
    'Tết Dương lịch',
    'Ngày đầu năm dương lịch',
    1,
    1,
    'solar',
    TRUE
),
(
    'Ngày Giải phóng miền Nam',
    'Ngày 30 tháng 4',
    30,
    4,
    'solar',
    TRUE
),
(
    'Ngày Quốc tế Lao động',
    'Ngày 1 tháng 5',
    1,
    5,
    'solar',
    TRUE
),
(
    'Ngày Quốc khánh Việt Nam',
    'Ngày 2 tháng 9',
    2,
    9,
    'solar',
    TRUE
),
(
    'Tết Nguyên Đán',
    'Mùng 1 tháng Giêng âm lịch',
    1,
    1,
    'lunar',
    TRUE
),
(
    'Giỗ Tổ Hùng Vương',
    'Mùng 10 tháng 3 âm lịch',
    10,
    3,
    'lunar',
    TRUE
),
(
    'Tết Trung Thu',
    'Rằm tháng 8 âm lịch',
    15,
    8,
    'lunar',
    FALSE
);
```

---

## 15. API MVP đề xuất

### 15.1. Authentication

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

#### Request đăng ký

```json
{
  "name": "Nguyễn Văn A",
  "email": "vana@example.com",
  "password": "12345678"
}
```

---

### 15.2. Calendar

```text
GET    /api/calendar/month?year=2026&month=7
GET    /api/calendar/day?date=2026-07-15
```

#### Response `GET /api/calendar/day`

```json
{
  "solar_date": "2026-07-15",
  "weekday": "Thứ Tư",
  "lunar_date": "02/06 âm lịch",
  "can_chi_day": "Ví dụ Can Chi",
  "holidays": [],
  "events": [
    {
      "id": 12,
      "title": "Họp khách hàng",
      "description": "Chốt yêu cầu giao diện",
      "start_at": "2026-07-15 09:00:00",
      "end_at": "2026-07-15 10:30:00",
      "is_all_day": false
    }
  ],
  "day_advice": {
    "day_rating": "neutral",
    "summary": "Ngày phù hợp để hoàn thành công việc đang thực hiện.",
    "good_for": [
      "Lập kế hoạch",
      "Trao đổi công việc"
    ],
    "avoid_for": [
      "Quyết định vội vàng"
    ]
  }
}
```

---

### 15.3. Calendar events

```text
GET    /api/events?month=2026-07
POST   /api/events
PUT    /api/events/{id}
DELETE /api/events/{id}
```

#### Request tạo sự kiện

```json
{
  "title": "Họp khách hàng",
  "description": "Chuẩn bị demo và báo giá",
  "start_at": "2026-07-15 09:00:00",
  "end_at": "2026-07-15 10:30:00",
  "is_all_day": false
}
```

---

### 15.4. Chatbot advisor

```text
POST   /api/advisor/chat
GET    /api/advisor/conversations
GET    /api/advisor/conversations/{id}/messages
```

#### Request chatbot

```json
{
  "conversation_id": null,
  "message": "Trong 14 ngày tới, ngày nào phù hợp để khai trương?",
  "selected_date": null,
  "date_range": {
    "from": "2026-06-28",
    "to": "2026-07-11"
  }
}
```

#### Response chatbot

```json
{
  "conversation_id": 4,
  "intent": "find_suitable_date",
  "answer": "Bạn có thể cân nhắc các ngày sau trong khoảng thời gian đã chọn.",
  "suggested_dates": [
    {
      "date": "2026-07-03",
      "rating": "favorable",
      "reason": "Phù hợp để triển khai kế hoạch và trao đổi công việc."
    },
    {
      "date": "2026-07-07",
      "rating": "favorable",
      "reason": "Phù hợp để công bố kế hoạch hoặc gặp gỡ đối tác."
    }
  ],
  "disclaimer": "Thông tin chỉ mang tính tham khảo."
}
```

---

## 16. Luồng xử lý `POST /api/advisor/chat`

```text
1. Kiểm tra JWT/token của người dùng.
2. Kiểm tra nội dung câu hỏi.
3. Nhận diện intent:
   - tomorrow_advice
   - find_suitable_date
   - date_suitability
   - personal_schedule_advice
4. Xác định ngày hoặc khoảng ngày cần xử lý.
5. Lấy dữ liệu lịch của ngày/khoảng ngày.
6. Lấy ngày lễ.
7. Lấy sự kiện của đúng người dùng hiện tại.
8. Lấy day_advice_cache.
9. Nếu cache chưa tồn tại:
   - Tạo dữ liệu lịch cơ bản.
   - Gọi AI để tạo diễn giải ngày.
   - Lưu kết quả vào day_advice_cache.
10. Tạo calendar_context tối thiểu cần thiết.
11. Gửi calendar_context + câu hỏi đến AI.
12. Validate JSON AI trả về.
13. Lưu message của user và assistant.
14. Trả kết quả về frontend.
```

### 16.1. Pseudocode

```pseudo
function chat(user, message, selectedDate, dateRange):
    intent = detectIntent(message, selectedDate, dateRange)
    dates = resolveDates(intent, selectedDate, dateRange)

    calendarContext = []

    for each date in dates:
        lunarInfo = lunarCalendarService.convert(date)
        holidays = holidayService.findBySolarOrLunarDate(date, lunarInfo)
        userEvents = eventService.getByUserAndDate(user.id, date)
        dayAdvice = dayAdviceService.getOrCreate(date, lunarInfo)

        calendarContext.push({
            date,
            lunarInfo,
            holidays,
            userEvents,
            dayAdvice
        })

    aiResponse = aiAdvisorService.ask(message, calendarContext)
    saveChatHistory(user.id, message, aiResponse)

    return aiResponse
```

---

## 17. Cơ chế cache ngày tốt/xấu

### 17.1. Mục tiêu

Hạn chế gọi AI nhiều lần cho cùng một ngày.

### 17.2. Luồng cache

```text
Người dùng chọn ngày
        ↓
Tìm day_advice_cache theo solar_date + rule_version
        ↓
Có cache? ── Có ──> Trả dữ liệu cache
        │
        Không
        ↓
Tạo dữ liệu ngày cơ bản
        ↓
Gọi AI tạo summary, good_for, avoid_for
        ↓
Lưu day_advice_cache
        ↓
Trả kết quả
```

### 17.3. Lưu ý quan trọng

- Cache ngày tốt/xấu chỉ là dữ liệu chung theo ngày.
- Không cache chung phần tư vấn có chứa sự kiện riêng của người dùng.
- Khi người dùng hỏi theo lịch cá nhân, chatbot phải nhận context sự kiện của chính người dùng đó.

---

## 18. Fallback khi AI lỗi

Lịch và event CRUD phải hoạt động ngay cả khi AI bị lỗi hoặc hết quota.

### Response fallback gợi ý

```json
{
  "answer": "Hiện chưa thể tạo gợi ý AI. Bạn vẫn có thể xem thông tin ngày, ngày lễ và sự kiện cá nhân.",
  "day_advice": {
    "day_rating": "neutral",
    "summary": "Thông tin tham khảo chưa sẵn sàng.",
    "good_for": [],
    "avoid_for": []
  }
}
```

---

## 19. Xử lý câu hỏi ngoài phạm vi

### Ví dụ câu hỏi ngoài phạm vi

```text
Ngày mai mua cổ phiếu nào chắc chắn thắng?
```

### Hướng phản hồi

```text
Ứng dụng chỉ hỗ trợ gợi ý lịch và kế hoạch cá nhân mang tính tham khảo.
Bạn nên tìm kiếm tư vấn tài chính chuyên môn trước khi đưa ra quyết định đầu tư.
```

---

## 20. Màn hình MVP đề xuất

```text
1. Login Screen
2. Register Screen
3. Calendar Month Screen
4. Day Detail Screen / Bottom Sheet
5. Add/Edit Event Screen
6. Chatbot Screen
7. Chat History Screen (P1)
```

### 20.1. Màn hình lịch tháng

Nên có:

```text
- Header: tháng/năm + nút chuyển tháng
- Lưới 7 cột theo thứ
- Ngày dương hiển thị lớn
- Ngày âm hiển thị nhỏ
- Chấm hoặc badge cho ngày có event
- Badge cho ngày lễ
- Highlight hôm nay
- Highlight ngày đang chọn
```

### 20.2. Màn hình chi tiết ngày

Nên có:

```text
- Ngày dương
- Ngày âm
- Thứ
- Can chi
- Ngày lễ
- Danh sách event
- Card ngày tốt/xấu
- Nút Thêm sự kiện
- Nút Hỏi trợ lý về ngày này
```

### 20.3. Màn hình chatbot

Nên có quick prompts:

```text
- Ngày mai tôi nên ưu tiên làm gì?
- Ngày này có phù hợp để ký hợp đồng không?
- Trong 7 ngày tới, ngày nào phù hợp để khai trương?
- Tôi có lịch gì vào ngày mai?
```

---

## 21. Tiêu chí hoàn thành MVP

```text
[ ] Người dùng đăng ký được tài khoản.
[ ] Người dùng đăng nhập được.
[ ] Mật khẩu được hash trước khi lưu database.
[ ] Người dùng chỉ xem được sự kiện của chính mình.
[ ] Người dùng chỉ sửa/xóa được sự kiện của chính mình.
[ ] Lịch tháng hiển thị đúng và chuyển tháng được.
[ ] Người dùng chọn được một ngày để xem chi tiết.
[ ] Có hiển thị ngày dương, ngày âm, thứ và can chi.
[ ] Có hiển thị ngày lễ cơ bản.
[ ] Người dùng thêm/sửa/xóa sự kiện được.
[ ] Lịch có dấu hiệu nhận biết ngày chứa sự kiện.
[ ] Có đánh giá ngày tốt/xấu dạng tham khảo.
[ ] Có cache dữ liệu đánh giá theo ngày.
[ ] Chatbot trả lời được ba nhóm câu hỏi chính.
[ ] Chatbot biết dùng sự kiện cá nhân khi tư vấn.
[ ] API key không xuất hiện ở frontend.
[ ] AI lỗi không làm hỏng màn hình lịch hoặc sự kiện.
[ ] Mọi phản hồi AI có lưu ý: thông tin mang tính tham khảo.
```

---

## 22. Kế hoạch triển khai nhanh trong 5 giờ

> Lưu ý: 5 giờ là thời gian rất ngắn. Để kịp demo, cần ưu tiên happy path và UI tối giản.

### Giờ 1 — Setup + Authentication

```text
- Khởi tạo backend và frontend.
- Tạo database, chạy SQL.
- Register API.
- Login API.
- JWT middleware.
- Tạo màn hình Login/Register tối giản.
```

### Giờ 2 — Calendar + Event CRUD

```text
- Làm lịch tháng.
- API lấy event theo tháng.
- Tạo event.
- Sửa event.
- Xóa event.
- Hiển thị badge sự kiện trên lịch.
```

### Giờ 3 — Chi tiết ngày

```text
- API calendar/day.
- Chuyển ngày dương sang âm bằng thư viện.
- Hiển thị ngày lễ.
- Hiển thị event của ngày.
- Làm Day Detail UI.
```

### Giờ 4 — Ngày tốt/xấu + Cache

```text
- Tạo day_advice_cache.
- Làm DayAdviceService.
- Gọi AI khi chưa có cache.
- Lưu/đọc cache.
- Hiển thị card ngày tốt/xấu.
```

### Giờ 5 — Chatbot

```text
- Làm giao diện chat tối giản.
- Tạo endpoint /api/advisor/chat.
- Hỗ trợ 3 intent chính.
- Dùng event cá nhân trong context.
- Lưu chat history tối thiểu nếu còn thời gian.
- Test happy path và fallback khi AI lỗi.
```

---

## 23. Rủi ro và cách giảm rủi ro

| Rủi ro | Tác động | Cách giảm rủi ro |
|---|---|---|
| Mất nhiều thời gian làm lịch âm | Chậm tiến độ | Dùng thư viện chuyển đổi đã có thay vì tự viết thuật toán |
| AI trả JSON lỗi | Frontend lỗi hiển thị | Validate JSON, có fallback |
| AI gọi quá nhiều gây chậm/tốn chi phí | Trải nghiệm kém | Cache `day_advice_cache` theo ngày |
| AI tự bịa dữ liệu lịch | Tư vấn sai ngữ cảnh | Backend truyền `calendar_context`, prompt cấm bịa dữ liệu |
| User xem/sửa data của người khác | Lỗi bảo mật | Luôn filter theo `user_id` từ JWT |
| Cố làm quá nhiều tính năng | Không kịp MVP | Bỏ notification, settings, admin, tử vi, dark mode |

---

## 24. Kết luận phạm vi chốt triển khai

```text
Ứng dụng Lịch Vạn Niên AI cho người dùng Việt Nam,
cho phép xem lịch âm dương, ngày lễ, quản lý sự kiện cá nhân
và nhận gợi ý tham khảo từ chatbot về công việc, ngày phù hợp
và kế hoạch theo lịch cá nhân.
```

### Scope chốt MVP

```text
Authentication
+ Calendar month
+ Day detail
+ Lunar date
+ Holidays
+ Personal events
+ Day advice cache
+ AI chatbot for 3 core intents
```

### Nguyên tắc chốt

```text
Lịch là nền tảng.
Sự kiện cá nhân tạo ngữ cảnh.
Chatbot là lớp tư vấn thực tế dựa trên dữ liệu lịch.
Không triển khai tử vi hoặc dự đoán chắc chắn trong MVP.
```
