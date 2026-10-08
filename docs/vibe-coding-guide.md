# Hướng dẫn vibe coding với base project

Tài liệu này dành cho học sinh dùng **Google Antigravity** (hoặc công cụ AI khác) để làm dự án trên base này.

## 1. Chạy project lần đầu

Cần cài sẵn Node.js 22+ và Docker Desktop (hoặc có sẵn một MongoDB, ví dụ MongoDB Atlas).

```bash
npm run setup          # cài thư viện cho cả BE và FE, tạo file .env
docker compose up -d   # bật MongoDB ở cổng 27017
npm run seed           # tạo tài khoản mẫu
npm run dev            # chạy BE (cổng 5003) và FE (cổng 5173) cùng lúc
```

Mở http://localhost:5173 và đăng nhập bằng `demo@example.com` / `demo1234`, hoặc `admin@example.com` / `admin1234` (tài khoản admin).

- **Không cần cấu hình email.** Khi đăng ký, mã OTP được in ra terminal của backend, trong khung `DEV EMAIL`.
- **Không cần Cloudinary** nếu chưa dùng ảnh. Thiếu cấu hình thì chỉ chức năng upload ảnh báo lỗi, phần còn lại vẫn chạy.
- Mặc định đăng nhập **không** hỏi mã OTP. Muốn bật thì vào trang **Profile → Security → Email code at login**.

Dùng MongoDB Atlas thay cho Docker: sửa `MONGO_URI` trong `BE/.env`.

## 2. AI đọc quy ước ở đâu?

Antigravity tự đọc file `AGENTS.md` ở thư mục gốc. File này mô tả cấu trúc, các hàm có sẵn và cách thêm tính năng, nên bạn **không cần** giải thích lại cho AI mỗi lần.

Có sẵn hai workflow, gõ trong khung chat của Antigravity:

| Lệnh | Tác dụng |
|---|---|
| `/new-module` | Tạo một tính năng mới (API + trang + test) từ module mẫu `notes`, rồi đổi field theo yêu cầu |
| `/check` | Chạy test, lint, build và giải thích lỗi nếu có |

## 3. Module mẫu `notes`

Trang **Notes** (http://localhost:5173/notes) là ví dụ đầy đủ một tính năng: danh sách có phân trang, tìm kiếm, lọc theo tag, tạo/sửa/xoá, mỗi người chỉ thấy ghi chú của mình, admin xem được tất cả. Mọi tính năng mới nên làm giống nó.

Tự tạo module bằng lệnh:

```bash
npm run gen:module -- product          # tạo /api/products và trang /products
npm run gen:module -- lesson-plan      # tên nhiều từ dùng dấu "-"
npm run gen:module -- product --remove # lỡ tạo sai thì xoá đi
```

Sau khi tạo, module có sẵn field `title`, `content`, `tags`. Bạn (hoặc AI) đổi chúng thành field thật của mình.

Lệnh sẽ từ chối những tên trùng với code có sẵn, ví dụ `class`, `page`, `query`, `math`, hay tên chứa chữ `note`. Khi đó chỉ cần chọn tên khác, như `classroom` hoặc `math-lesson`. Lệnh `--remove` chỉ xoá những file do chính lệnh tạo ra, và giữ lại file bạn tự thêm vào.

## 4. Prompt mẫu

Copy rồi sửa phần trong ngoặc cho đúng dự án của bạn.

1. **Tạo tính năng mới**
   > /new-module Tạo module `product` với các field: `name` (chuỗi, bắt buộc, tối đa 100 ký tự), `price` (số, bắt buộc, ≥ 0), `inStock` (true/false, mặc định true). Bỏ field `content` và `tags`.

2. **Thêm field cho tính năng đã có**
   > Thêm field `dueDate` (ngày, không bắt buộc) cho module `notes`: model, validator, type, form và hiển thị trên card. Cập nhật test.

3. **Thêm ảnh cho một tính năng**
   > Cho phép upload một ảnh bìa cho `product`, làm giống cách upload avatar trong `profile` (dùng `imageUpload` và `uploadImage`). Hiển thị ảnh trên card.

4. **Trang chỉ dành cho admin**
   > Tạo trang `/admin/users` chỉ admin xem được, liệt kê người dùng có phân trang. Dùng `requireRole('admin')` ở backend và `roles: ['admin']` trong module frontend.

5. **Lọc và sắp xếp**
   > Thêm bộ lọc `inStock` và sắp xếp theo giá (tăng/giảm) cho trang danh sách `product`, làm giống cách `notes` lọc theo tag.

6. **Sửa lỗi**
   > Khi tôi bấm "Create" trên trang `product` thì hiện lỗi "[dán nguyên văn lỗi]". Tìm nguyên nhân trước rồi mới sửa, sau đó chạy /check.

7. **Viết test**
   > Viết thêm test cho trường hợp tạo `product` với giá âm phải trả về lỗi 400.

8. **Giải thích code**
   > Giải thích cho tôi luồng từ lúc bấm "New note" tới lúc dữ liệu được lưu vào MongoDB, đi qua những file nào.

## 5. Mẹo khi vibe coding

- **Mỗi lần chỉ nhờ một việc nhỏ.** Ví dụ "thêm field price", đừng gộp kiểu "làm cả trang bán hàng".
- **Luôn kết thúc bằng `/check`.** Đừng tin AI nói "xong rồi" khi test chưa chạy.
- **Đưa lỗi nguyên văn** cho AI, gồm thông báo lỗi và tên file, thay vì tự tóm tắt.
- **Commit thường xuyên** (`git add -A && git commit -m "..."`) để lỡ AI làm hỏng thì quay lại được.
- **Kiểm tra dữ liệu trả về**: API không bao giờ được trả mật khẩu hay mã OTP. Nếu thấy thì báo lỗi ngay.
- Khi AI định viết lại `App.tsx`, tự gọi API bằng `useEffect`, hoặc tự viết `try/catch` trả lỗi, nhắc nó: *"Làm theo AGENTS.md"*.

## 6. Tự kiểm tra trước khi nộp

- [ ] `npm test` chạy xanh
- [ ] `npm run lint` không còn lỗi
- [ ] `npm run build` thành công
- [ ] Đăng nhập bằng hai tài khoản khác nhau: người này không thấy dữ liệu của người kia
- [ ] Không có file `.env` nào trong commit (`git status` không hiện `.env`)
