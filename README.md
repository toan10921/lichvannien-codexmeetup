# Lịch Vạn Niên AI

Ứng dụng lịch âm dương có tài khoản, quản lý sự kiện cá nhân và chatbot tư vấn theo ngữ cảnh ngày.

## Yêu cầu

- [Docker](https://docs.docker.com/get-docker/) và Docker Compose v2
- Các port chưa bị chiếm: `3000` (backend), `3306` (MySQL), `5173` (frontend dev), `8080` (phpMyAdmin), `8081` (frontend prod)

## Thành phần

- **backend** — API Node.js (Express)
- **frontend** — React (Vite)
- **mysql** — cơ sở dữ liệu
- **phpmyadmin** — quản trị DB qua web

## Cấu trúc Docker

| File | Mục đích |
|------|----------|
| `docker-compose.yml` | Cấu hình production: MySQL + backend + frontend + phpMyAdmin |
| `docker-compose.dev.yml` | Override cho dev: hot reload, mount source code |
| `backend/Dockerfile` | Build image Node.js cho backend |
| `frontend/Dockerfile` | Build frontend (Vite) rồi serve bằng nginx (production) |
| `frontend/Dockerfile.dev` | Vite dev server có hot reload (development) |
| `backend/sql/init.sql` | Khởi tạo database và seed dữ liệu |

## Chạy Production

Production chạy backend bằng `node src/server.js` và frontend được build tĩnh rồi serve bằng nginx. Không mount source code, không hot reload.

```bash
docker compose up --build -d
```

Dừng stack:

```bash
docker compose down
```

Dừng và xóa luôn volume MySQL (mất dữ liệu):

```bash
docker compose down -v
```

### Kiểm tra

```bash
curl http://localhost:3000/api/health
```

Kết quả mong đợi:

```json
{"success":true,"message":"API is running"}
```

### Endpoint mặc định

| Dịch vụ | URL |
|---------|-----|
| Frontend (nginx) | http://localhost:8081 |
| Backend API | http://localhost:3000 |
| MySQL | localhost:3306 |
| phpMyAdmin | http://localhost:8080 |

### Đăng nhập phpMyAdmin

phpMyAdmin tự kết nối tới service `mysql`. Đăng nhập bằng:

- **Username:** `lunar_user` — **Password:** `lunar_password` (hoặc `root` / `root_password`)

### Biến môi trường production

Trước khi deploy thật, đổi các giá trị nhạy cảm trong `docker-compose.yml`:

- `JWT_SECRET` — secret dài, ngẫu nhiên
- `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `DB_PASSWORD` — mật khẩu mạnh

## Chạy Development

Dev dùng `docker-compose.dev.yml` override lên file production để:

- **Backend:** mount `./backend`, chạy `npm run dev` (`node --watch`) — tự restart khi sửa code
- **Frontend:** dùng `Dockerfile.dev`, chạy Vite dev server tại cổng `5173` với hot reload, mount `./frontend`
- Giữ `node_modules` trong container, tránh bị host ghi đè

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Chạy nền:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

Dừng:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

URL khi chạy dev:

| Dịch vụ | URL |
|---------|-----|
| Frontend (Vite, hot reload) | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| phpMyAdmin | http://localhost:8080 |

Sửa file trong `backend/src/` (Node `--watch`) hoặc `frontend/src/` (Vite HMR) sẽ tự động cập nhật.

## Chạy backend local (không Docker)

Nếu chỉ chạy backend trên máy, cần MySQL đang chạy (có thể chỉ bật service `mysql` từ Docker):

```bash
docker compose up mysql -d
```

Sau đó:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

## Chạy frontend local (không Docker)

```bash
cd frontend
npm install
npm run dev
```

Vite chạy tại http://localhost:5173. Đặt `VITE_API_URL` nếu backend không ở `http://localhost:3000`.

## Lệnh hữu ích

Xem log backend:

```bash
docker compose logs -f backend
```

Xem log MySQL:

```bash
docker compose logs -f mysql
```

Rebuild backend sau khi đổi dependency:

```bash
docker compose build backend
docker compose up -d backend
```

## API Auth (Bước 1)

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/health` | Không |
| POST | `/api/auth/register` | Không |
| POST | `/api/auth/login` | Không |
| POST | `/api/auth/logout` | Bearer token |
| GET | `/api/auth/me` | Bearer token |

Ví dụ đăng ký:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyen Van A","email":"vana@example.com","password":"12345678"}'
```
