# Meeting Tracker — Full-stack

Quản lý cây thông tin cuộc họp hàng tuần (Nhóm → Thành viên → Task → Sub-task) với 5 trạng thái, deadlines, assignees, comments, lọc, thống kê, lịch sử, export, và light/dark mode.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: MySQL 8
- **Auth**: JWT + bcrypt (role-based: ADMIN / MEMBER)
- **Deploy free**: Railway / Render (backend + MySQL) + Vercel (frontend)

## Features

| Tính năng | Trạng thái |
|---|---|
| Cây 4 cấp Nhóm → Thành viên → Task → **Sub-task** (3 levels) | ✅ |
| 5 trạng thái (TODO / IN_PROGRESS / DONE / ISSUE / CANCELLED) | ✅ |
| Click status icon để cycle qua các trạng thái | ✅ |
| Inline edit task title | ✅ |
| Note cho task | ✅ |
| **Deadline** với chip màu (today / tomorrow / overdue) | ✅ |
| **Assignee** user + assignee note ("📌 Cần xong trước EOD") | ✅ |
| Color cho từng nhóm (6 màu preset: amber/rose/emerald/sky/violet/slate) | ✅ |
| Color riêng cho từng thành viên (6 màu preset) | ✅ |
| **Light / Dark theme toggle** (lưu vào server + localStorage) | ✅ |
| Comments / discussion trên task | ✅ |
| Tạo meeting mới với carry-over (giữ sub-task + deadline + assignee) | ✅ |
| Lịch sử các meetings | ✅ |
| Filter theo group / member / status | ✅ |
| Stats: % progress per group + overall ring (tính cả sub-task) | ✅ |
| Export Markdown / CSV (đầy đủ deadline, assignee, sub-task) | ✅ |
| Role-based access (admin / member) | ✅ |

---

## Chạy local

### 1. Khởi động MySQL

```bash
docker compose up -d
```

DB `meeting_tracker` ở `localhost:3306`, user `app` / pass `apppass`.

### 2. Backend

```bash
cd server
cp .env.example .env       # đổi JWT_SECRET thành chuỗi random
npm install
npx prisma migrate dev --name init
npm run seed               # tạo admin@example.com / admin123 + sample data
npm run dev                # http://localhost:4000
```

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

Login: `admin@example.com / admin123` (ADMIN) hoặc `member@example.com / member123` (MEMBER).

---

## API endpoints

Tất cả (trừ `/auth/register`, `/auth/login`) yêu cầu `Authorization: Bearer <token>`.

| Method | Path | Mô tả |
|---|---|---|
| POST | `/auth/register` | Đăng ký (account đầu = ADMIN) |
| POST | `/auth/login` | Đăng nhập → trả token |
| GET | `/auth/me` | Profile hiện tại |
| GET | `/users` | List users (cho assignee picker) |
| GET | `/meetings` | List meetings |
| POST | `/meetings` | Tạo (option `carryOverFromId`) |
| GET | `/meetings/:id` | Fetch full tree (groups → members → tasks → subtasks → comments) |
| PATCH | `/meetings/:id` | Update date/title |
| DELETE | `/meetings/:id` | Xoá |
| POST | `/groups` | Tạo group (body: `meetingId`, `name`, `color?`) |
| PATCH | `/groups/:id` | Update name / color / collapsed |
| DELETE | `/groups/:id` | Xoá |
| POST | `/members` | Tạo member (body: `groupId`, `name`, `userId?`) |
| PATCH | `/members/:id` | Update name / userId |
| DELETE | `/members/:id` | Xoá |
| POST | `/tasks` | Tạo task — body: `memberId`, `title`, `parentId?`, `deadline?`, `assigneeId?`, `assigneeNote?` |
| PATCH | `/tasks/:id` | Update title / note / status / deadline / assignee... |
| DELETE | `/tasks/:id` | Xoá (cascade sub-tasks) |
| POST | `/tasks/:id/comments` | Thêm comment |
| DELETE | `/tasks/comments/:id` | Xoá comment |

---

## Role-based permissions

- **ADMIN**: thấy & sửa toàn bộ meetings của mọi user
- **MEMBER**: chỉ thấy & sửa meetings do chính mình tạo. Có thể edit task được assign cho mình.

Account đầu tiên đăng ký tự thành ADMIN.

---

## Color presets

10 màu preset cho group (file `client/src/components/ColorPicker.tsx`):
amber gold (default), emerald, blue, violet, pink, red, amber, cyan, lime, slate.

---

## Theme

Sun/Moon button ở header. Auto-detect `prefers-color-scheme` lần đầu, sau đó lưu vào localStorage. CSS variables ở `client/src/index.css`:

- Dark: warm ink `#0a0a0b` + amber gold accent
- Light: warm cream `#fdfbf6` + brown accent

Mọi component dùng `text-text`, `bg-surface`, `text-accent` v.v. nên đổi theme là instant.

---

## Deploy free

### Backend + MySQL → Railway

1. Push repo lên GitHub.
2. Railway: New Project → "Deploy from GitHub". Chọn folder `server/`.
3. Add plugin **MySQL** → Railway tự cấp `DATABASE_URL`.
4. Service settings → env:
   - `DATABASE_URL` (link từ MySQL plugin)
   - `JWT_SECRET` (chuỗi random dài)
   - `CORS_ORIGIN` = URL Vercel của bạn (sau khi có)
   - `NODE_ENV=production`
5. Build: `npm install && npm run build && npx prisma migrate deploy`
6. Start: `npm start`

### Frontend → Vercel

1. Vercel: Import project, root = `client/`.
2. Framework preset: Vite.
3. Env: `VITE_API_URL = https://<railway-domain>`.
4. Deploy → URL `*.vercel.app`. Quay lại Railway set `CORS_ORIGIN`.

---

## Migration sau khi pull schema mới

Nếu bạn đã có DB cũ (từ version trước):

```bash
cd server
npx prisma migrate dev --name add_color_deadline_assignee_subtasks
```

Prisma sẽ generate migration SQL tự động và áp dụng. Old data giữ nguyên, fields mới mặc định `null` / `#d4a574`.

---

## Bảo trì

- Reset DB: `cd server && npx prisma migrate reset`
- GUI DB: `npx prisma studio`
- Migration mới: `npx prisma migrate dev --name <change>`
