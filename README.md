# Meeting Tracker — Full-stack

Quản lý cây thông tin cuộc họp hàng tuần (Nhóm → Thành viên → Task) với 5 trạng thái, comments, lọc, thống kê, lịch sử, và export. Multi-user với role admin/member.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: MySQL 8
- **Auth**: JWT + bcrypt (role-based: ADMIN / MEMBER)
- **Deploy free**: Railway / Render (backend + MySQL) + Vercel (frontend)

## Cấu trúc

```
meeting-tracker/
├── server/                 # Express API
│   ├── src/
│   │   ├── routes/         # auth, meetings, groups, members, tasks
│   │   ├── middleware/     # auth, error
│   │   ├── lib/            # prisma, auth helpers
│   │   └── index.ts        # entry
│   └── prisma/
│       ├── schema.prisma   # DB schema
│       └── seed.ts         # initial admin
├── client/                 # React app
│   └── src/
│       ├── pages/          # AuthPage, TrackerPage
│       ├── components/     # GroupBlock, TaskRow, Modal, ...
│       ├── lib/            # api, auth context, status
│       └── types/
├── docker-compose.yml      # MySQL local
└── README.md
```

---

## Chạy local

### 1. Khởi động MySQL (Docker)

```bash
docker compose up -d
```

Database `meeting_tracker` sẽ sẵn ở `localhost:3306` với user `app` / pass `apppass`.

> Nếu không dùng Docker: cài MySQL trực tiếp, tạo DB `meeting_tracker`, chỉnh `DATABASE_URL` trong `server/.env`.

### 2. Backend

```bash
cd server
cp .env.example .env
# Sửa DATABASE_URL trong .env nếu cần. Mặc định:
#   DATABASE_URL="mysql://app:apppass@localhost:3306/meeting_tracker"
# Đổi JWT_SECRET thành chuỗi ngẫu nhiên dài.

npm install
npx prisma migrate dev --name init   # tạo bảng
npm run seed                          # tạo admin@example.com / admin123
npm run dev                           # http://localhost:4000
```

### 3. Frontend

```bash
cd client
cp .env.example .env       # mặc định trỏ vào http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

Mở `http://localhost:5173`, login bằng `admin@example.com / admin123` hoặc register account mới (account đầu tiên tự thành ADMIN).

---

## API endpoints

Tất cả (trừ `/auth/register`, `/auth/login`) yêu cầu header `Authorization: Bearer <token>`.

| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký (account đầu = ADMIN) |
| POST | `/auth/login` | Đăng nhập → trả token |
| GET | `/auth/me` | Profile hiện tại |
| GET | `/meetings` | List meetings (admin = all, member = own) |
| POST | `/meetings` | Tạo (option `carryOverFromId`) |
| GET | `/meetings/:id` | Fetch full tree |
| PATCH | `/meetings/:id` | Update date/title |
| DELETE | `/meetings/:id` | Xoá meeting |
| POST | `/groups` | Tạo group |
| PATCH | `/groups/:id` | Rename / collapse |
| DELETE | `/groups/:id` | Xoá group |
| POST | `/members` | Tạo member |
| PATCH | `/members/:id` | Rename / assign user |
| DELETE | `/members/:id` | Xoá member |
| POST | `/tasks` | Tạo task |
| PATCH | `/tasks/:id` | Update title/note/status |
| DELETE | `/tasks/:id` | Xoá task |
| POST | `/tasks/:id/comments` | Comment vào task |
| DELETE | `/tasks/comments/:id` | Xoá comment |

---

## Role-based permissions

- **ADMIN**: thấy & sửa toàn bộ meetings của mọi user
- **MEMBER**: chỉ thấy & sửa meetings do chính mình tạo. Có thể edit task được assign cho mình (qua `member.userId`).

Account đầu tiên đăng ký tự thành ADMIN. Các account sau là MEMBER.

---

## Deploy free

### Backend + MySQL → Railway

1. Push repo lên GitHub.
2. Railway: New Project → "Deploy from GitHub". Chọn folder `server/`.
3. Add plugin **MySQL** → Railway tự cấp `DATABASE_URL`.
4. Vào service settings, set env:
   - `DATABASE_URL` (link từ plugin MySQL)
   - `JWT_SECRET` (chuỗi random dài)
   - `CORS_ORIGIN` = URL Vercel của bạn (sau khi có)
   - `NODE_ENV=production`
5. Build command: `npm install && npm run build && npx prisma migrate deploy`
6. Start command: `npm start`

Railway free credit ~$5/tháng đủ cho app nhỏ. Alternative: **Render.com** (free web service + free MySQL qua Aiven).

### Frontend → Vercel

1. Vercel: Import project, chọn folder `client/`.
2. Framework preset: Vite.
3. Env var: `VITE_API_URL = https://<railway-domain>`.
4. Deploy → có URL `*.vercel.app`. Quay lại Railway set `CORS_ORIGIN`.

---

## Production checklist

- [x] JWT auth + role-based access control
- [x] bcrypt password hashing (10 rounds)
- [x] Zod input validation trên mọi POST/PATCH
- [x] Helmet security headers
- [x] Rate limit trên `/auth/*` (30 req / 15 phút)
- [x] CORS whitelist
- [x] Prisma migrations cho schema versioning
- [x] Error handler không leak stack trace ở production
- [ ] Add logging (Pino) cho production
- [ ] Add Sentry / error tracking
- [ ] Add Playwright E2E tests

---

## Features

| Tính năng | Trạng thái |
|---|---|
| Cây 3 cấp Nhóm → Thành viên → Task | ✅ |
| 5 trạng thái (TODO / IN_PROGRESS / DONE / ISSUE / CANCELLED) | ✅ |
| Click status icon để cycle qua các trạng thái | ✅ |
| Inline edit task title | ✅ |
| Note cho từng task (issue details) | ✅ |
| Comments / discussion trên task | ✅ |
| Tạo meeting mới với carry-over unfinished tasks | ✅ |
| Lịch sử các meetings | ✅ |
| Filter theo group / member / status | ✅ |
| Stats: % progress per group + overall ring | ✅ |
| Export Markdown / CSV (single + all meetings) | ✅ |
| Role-based access (admin / member) | ✅ |

---

## Bảo trì

- Reset DB: `cd server && npx prisma migrate reset`
- Mở DB GUI: `npx prisma studio`
- Tạo migration mới: `npx prisma migrate dev --name <change_name>`
