# Chiến lược dữ liệu cho màn “Lịch Vạn Niên” và mockup chi tiết ngày

## 1. Kết luận ngắn

Với các trường như:

- giờ hoàng đạo
- tuổi xung
- mệnh ngày
- can chi
- ngày âm

thì **không nên nghĩ theo hướng “phải seed sẵn vào database”**.

Đa số các trường này là:

- **tính được bằng công thức/quy tắc**
- hoặc **suy ra từ rule mapping tĩnh**
- chỉ một số phần nên **cache**
- và chỉ dữ liệu dùng chung kiểu **ngày lễ** mới thật sự phù hợp để **seed**

Nói ngắn gọn:

> Thiếu ở đây chủ yếu là **domain logic/service tính toán**, không phải thiếu bảng SQL.

---

## 2. Phân loại đúng: Compute / Seed / Cache / User Data

Để tránh thiết kế sai, nên chia dữ liệu thành 4 nhóm:

### 2.1. Compute — tính trực tiếp từ ngày đang chọn

Đây là nhóm nên tính trong backend mỗi khi người dùng chọn ngày:

- ngày dương
- thứ trong tuần
- ngày âm
- can chi ngày / tháng / năm
- nạp âm / mệnh ngày
- giờ hoàng đạo / hắc đạo
- tuổi xung
- các chỉ số truyền thống như thiên thần, trực, sao, nghi/kiêng nếu muốn mở rộng

### 2.2. Seed — dữ liệu tĩnh dùng chung

Đây là nhóm hợp lý để lưu DB và seed sẵn:

- ngày lễ dương lịch
- ngày lễ âm lịch
- mô tả ngày lễ
- cờ `is_official`

### 2.3. Cache — dữ liệu suy luận hoặc tốn chi phí

Đây là nhóm không cần seed, nhưng nên cache:

- đánh giá ngày tốt/xấu dạng diễn giải
- summary “nên ưu tiên gì”
- gợi ý “cần thận trọng gì”
- kết quả AI hoặc rule-engine tốn thời gian

### 2.4. User Data — dữ liệu riêng theo người dùng

Đây là nhóm chắc chắn phải lưu DB:

- sự kiện cá nhân
- hội thoại AI
- lịch sử câu hỏi

---

## 3. Phân tích từng block trong mockup

| Block / Field | Bản chất | Nên lấy từ đâu | Có cần DB không? | Ghi chú |
|---|---|---|---|---|
| Ngày dương | Compute | từ `selectedDate` | Không | Cơ bản nhất |
| Thứ trong tuần | Compute | từ ngày dương | Không | Backend hoặc frontend đều tính được |
| Ngày âm | Compute | thư viện âm lịch | Không | Nên thống nhất tính ở backend |
| Can chi ngày | Compute | thư viện / công thức | Không | Đã làm rồi |
| Can chi tháng | Compute | thư viện / công thức | Không | Đã làm rồi |
| Can chi năm | Compute | thư viện / công thức | Không | Đã làm rồi |
| Ngày lễ | Seed + lookup | bảng `holidays` | Có | Dùng chung toàn hệ thống |
| Marker ngày có event | User Data | bảng `calendar_events` | Có | Phục vụ month view |
| Danh sách event trong ngày | User Data | bảng `calendar_events` | Có | Phục vụ day detail |
| Đánh giá ngày | Cache | `day_advice_cache` | Có | Không phải dữ liệu gốc, là dữ liệu suy ra |
| Việc nên làm / tránh | Cache | `day_advice_cache` hoặc rule engine | Có thể cache | Không nên hardcode hết vào DB ngay |
| Giờ hoàng đạo | Compute | thư viện + rule giờ | Không bắt buộc | Có thể chỉ cache nếu muốn tối ưu |
| Tuổi xung | Compute | quy tắc địa chi / can chi | Không bắt buộc | Có thể cần thêm bước format đẹp |
| Mệnh ngày / nạp âm | Compute + mapping | thư viện + mapping | Không bắt buộc | Không nhất thiết lưu DB |

---

## 4. Vì sao không nên seed các trường như “giờ hoàng đạo / tuổi xung / mệnh ngày”

## 4.1. Vì đây là dữ liệu suy ra, không phải dữ liệu gốc

Ví dụ:

- ngày `2026-06-27`
- âm lịch `13/5`
- can chi `Nhâm Thân`

Từ đó mới suy ra:

- tuổi xung
- nạp âm / mệnh ngày
- giờ tốt / giờ xấu

Tức là:

> ngày dương là input gốc, còn các trường kia là output của rule.

Nếu seed sẵn toàn bộ output vào DB:

- bị trùng logic
- khó kiểm tra đúng sai
- khó sửa khi đổi rule
- dễ lệch nếu công thức backend đổi

## 4.2. Seed toàn bộ sẽ làm DB phình to vô ích

Nếu lưu sẵn cho mọi ngày:

- mỗi ngày có nhiều field phụ
- mỗi ngày lại có thêm danh sách giờ hoàng đạo
- sau vài chục năm dữ liệu sẽ phình mà giá trị thấp

Trong khi:

- chỉ cần 1 input ngày
- backend có thể tính ra tại chỗ

## 4.3. Tính tại runtime giúp nhất quán hơn

Khi dùng một thư viện hoặc một service rule chung:

- API tháng
- API chi tiết ngày
- AI advisor

đều dùng cùng một nguồn suy luận.

Như vậy:

- ít lệch logic hơn
- ít bug hơn
- dễ test hơn

---

## 5. Thực tế với project hiện tại

Hiện project đã có nền đúng hướng:

- `holidays` để seed ngày lễ
- `day_advice_cache` để cache đánh giá ngày
- `calendar_events` để lưu event

Đây là hướng thiết kế hợp lý.

Thứ còn thiếu chủ yếu là:

- mở rộng `CalendarService`
- format dữ liệu truyền thống đẹp hơn
- render UI ra đúng mockup

---

## 6. Thư viện hiện tại hỗ trợ được tới đâu

Project đang dùng `lunar-javascript`.

Qua kiểm tra thực tế, thư viện đã hỗ trợ sẵn nhiều thứ quan trọng:

- `getDayInGanZhi()`
- `getMonthInGanZhi()`
- `getYearInGanZhi()`
- `getDayNaYin()`
- `getMonthNaYin()`
- `getYearNaYin()`
- `getChong()`
- `getChongShengXiao()`
- `getChongDesc()`
- `getSha()`
- `getDayTianShen()`
- `getDayTianShenType()`
- `getDayTianShenLuck()`
- `getZhiXing()`
- `getXiu()`
- `getDayYi()`
- `getDayJi()`
- `getTimes()`

Với `getTimes()`, mỗi khung giờ còn có thêm:

- can chi giờ
- thần sát giờ
- loại giờ `Hoàng đạo / Hắc đạo`
- mức `Cát / Hung`
- việc nên làm / nên tránh

=> Nghĩa là **giờ hoàng đạo hoàn toàn có thể tính từ thư viện**, không cần seed DB.

---

## 7. Chiến lược đúng cho từng trường “mockup-like”

### 7.1. Giờ hoàng đạo

**Khuyến nghị:**

- không seed DB
- lấy từ `lunar.getTimes()`
- lọc các giờ có:
  - `tianShenType = Hoàng đạo`
  - hoặc `tianShenLuck = Cát`
- map sang tiếng Việt và format thành:
  - `Tý (23h-1h)`
  - `Sửu (1h-3h)`
  - ...

**Có nên cache không?**

- không bắt buộc
- chỉ cache nếu muốn tối ưu response cho một ngày được gọi lặp lại nhiều

### 7.2. Tuổi xung

**Khuyến nghị:**

- không seed DB
- tính từ:
  - `getChong()`
  - `getChongShengXiao()`
  - `getChongDesc()`
- sau đó thêm lớp format tiếng Việt

**Lưu ý:**

Mockup bạn đưa ra có dạng:

- `Bính dần`
- `Canh dần`
- `Bính thân`

Đây là format giàu hơn “xung con giáp nào”.

Nghĩa là:

- bản đơn giản: chỉ cần xung `Dần`, `Hổ`
- bản giống mockup: cần thêm **rule format hoặc mapping chi tiết hơn**

=> Chỗ này vẫn là **rule logic**, chưa cần DB.

### 7.3. Mệnh ngày

**Khuyến nghị:**

- không seed DB toàn bộ theo ngày
- lấy từ `getDayNaYin()` rồi map sang cách hiển thị thân thiện

Ví dụ:

- `剑锋金` → `Kiếm phong kim`

Từ đó hiển thị:

- `Mệnh ngày: Kiếm phong kim`

Nếu muốn hiển thị đẹp hơn:

- thêm bảng mapping nhỏ trong code/json
- không cần table SQL riêng ở MVP

### 7.4. Ngày hoàng đạo / hắc đạo

**Khuyến nghị:**

- không seed
- lấy từ:
  - `getDayTianShen()`
  - `getDayTianShenType()`
  - `getDayTianShenLuck()`

Sau đó format thành:

- `Ngày hoàng đạo`
- `Ngày hắc đạo`

### 7.5. Nên làm / kỵ làm

Có 2 hướng:

#### Hướng 1 — Rule-based

- dùng `getDayYi()`
- dùng `getDayJi()`

Ưu điểm:

- không cần OpenAI
- trả kết quả nhanh
- deterministic

Nhược điểm:

- output thô, còn nặng màu Hán/thuật ngữ truyền thống

#### Hướng 2 — AI/summary layer

- lấy `DayYi`, `DayJi`, event cá nhân, holiday
- cho AI tóm tắt thành tiếng Việt đời thường

Ưu điểm:

- UX tốt hơn

Nhược điểm:

- phụ thuộc model/API key

**Khuyến nghị cho MVP:**

- dùng rule-based làm nguồn gốc
- AI chỉ là lớp diễn giải
- cache kết quả summary vào `day_advice_cache`

---

## 8. Nên để gì ở đâu

## 8.1. Trong `CalendarService`

Nên tính trực tiếp:

- ngày âm
- can chi ngày / tháng / năm
- nạp âm ngày
- tuổi xung
- thần sát ngày
- giờ hoàng đạo

## 8.2. Trong bảng `holidays`

Chỉ nên để:

- ngày lễ dương
- ngày lễ âm
- mô tả ngày lễ

## 8.3. Trong `day_advice_cache`

Nên cache:

- `day_rating`
- `summary`
- `good_for`
- `avoid_for`

Không cần biến bảng này thành nơi lưu toàn bộ logic lịch truyền thống.

## 8.4. Trong code mapping / JSON tĩnh

Nên để:

- map Hán → Việt
- map nạp âm → tên hiển thị thân thiện
- map chi giờ → khoảng giờ
- map format tuổi xung đẹp hơn

Đây là “dữ liệu phụ trợ”, không nhất thiết cần SQL.

---

## 9. Quyết định thiết kế khuyến nghị

### Quyết định 1

**Không thêm bảng SQL mới chỉ để lưu `giờ hoàng đạo`, `tuổi xung`, `mệnh ngày`.**

### Quyết định 2

**Bổ sung service tính toán trong backend** để sinh các field đó theo ngày.

### Quyết định 3

**Dùng bảng/JSON mapping nhỏ trong code** cho phần:

- dịch thuật ngữ
- format hiển thị
- chuyển quy tắc thành text thân thiện

### Quyết định 4

**Chỉ cache phần diễn giải hoặc phần tốn chi phí**, không cache toàn bộ nếu không cần.

---

## 10. Tóm tắt theo ngôn ngữ rất ngắn

### Nên tính bằng code

- ngày âm
- can chi
- giờ hoàng đạo
- tuổi xung
- mệnh ngày / nạp âm

### Nên seed vào DB

- ngày lễ

### Nên cache

- đánh giá ngày
- summary AI / summary diễn giải

### Nên lưu DB riêng theo user

- sự kiện cá nhân
- hội thoại AI

---

## 11. Gợi ý bước tiếp theo cho team

### Partner 1 — Backend logic

Làm tiếp trong `CalendarService`:

- thêm `day_nayin`
- thêm `day_tian_shen`
- thêm `day_tian_shen_luck`
- thêm `chong_desc`
- thêm `sha_direction`
- thêm `auspicious_hours`

### Partner 2 — Frontend rendering

Render thêm ở day detail:

- mệnh ngày
- tuổi xung
- giờ hoàng đạo
- badge hoàng đạo / hắc đạo

### Sau đó

Nối lớp AI:

- dùng dữ liệu đã tính sẵn
- chỉ diễn giải lại
- không để AI tự bịa logic lịch

---

## 12. Kết luận cuối

Bạn hiểu đúng:

> Phần như `giờ hoàng đạo / tuổi xung / mệnh ngày` về bản chất là **có công thức hoặc rule để tính**.

Vì vậy:

- **không cần seed DB như holiday**
- **không cần tạo bảng riêng chỉ để chứa chúng**
- cái cần bổ sung là **service tính toán + mapping hiển thị + cache hợp lý nếu cần**

Đây là hướng đúng nhất cho MVP và cũng là hướng dễ bảo trì hơn về sau.
