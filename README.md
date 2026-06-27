# Lịch Vạn Niên AI

Ứng dụng lịch âm dương có tài khoản, quản lý sự kiện cá nhân và chatbot tư vấn theo ngữ cảnh ngày.

## Yêu cầu

- [Docker](https://docs.docker.com/get-docker/) và Docker Compose v2
- Port `3000` (backend) và `3306` (MySQL) chưa bị chiếm

## Cấu trúc Docker

| File | Mục đích |
|------|----------|
| `docker-compose.yml` | Cấu hình production: MySQL + backend |
| `docker-compose.dev.yml` | Override cho dev: hot reload, mount source code |
| `backend/Dockerfile` | Build image Node.js cho backend |
| `backend/sql/init.sql` | Khởi tạo database và seed dữ liệu |

## Chạy Production

Production chạy backend bằng `node src/server.js`, không mount source code, không hot reload.

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
| Backend API | http://localhost:3000 |
| MySQL | localhost:3306 |

### Biến môi trường production

Trước khi deploy thật, đổi các giá trị nhạy cảm trong `docker-compose.yml`:

- `JWT_SECRET` — secret dài, ngẫu nhiên
- `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `DB_PASSWORD` — mật khẩu mạnh

## Chạy Development

Dev dùng `docker-compose.dev.yml` override lên file production để:

- Mount `./backend` vào container
- Chạy `npm run dev` (`node --watch`) — tự restart khi sửa code
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

Sửa file trong `backend/src/` sẽ được Node `--watch` phát hiện và restart server tự động.

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
