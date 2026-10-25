# Triển khai tuvihongan.com bằng Docker

Stack root chạy frontend, Flask API, Node Customer API, MySQL và Caddy. Caddy nhận traffic công khai, tự cấp/gia hạn HTTPS cho `tuvihongan.com` và `www.tuvihongan.com`, rồi chuyển tiếp API đến đúng backend. MySQL và Customer API chỉ ở mạng Docker nội bộ.

## Chuẩn bị server

1. Cài Docker Engine và Docker Compose plugin.
2. Trỏ bản ghi DNS `A` của `tuvihongan.com` và `www.tuvihongan.com` về IP server. Nếu có bản ghi `AAAA`, nó cũng phải trỏ đúng server.
3. Mở cổng TCP `80` và `443` trên firewall/security group. Caddy cần truy cập được các cổng này để cấp chứng chỉ HTTPS.
4. Tạo `.env` từ `.env.server.example`, rồi thay `SECRET_KEY`, mật khẩu MySQL, Google OAuth và SMTP bằng giá trị production. Giữ `.env` riêng tư.
5. Trong Google OAuth, thêm `https://tuvihongan.com` (và `https://www.tuvihongan.com` nếu dùng) vào Authorized JavaScript origins.

## Khởi chạy

Tại thư mục gốc dự án:

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f caddy web customer-api
```

Mở `https://tuvihongan.com`. Caddy sẽ tự xin chứng chỉ sau khi DNS đã trỏ đúng và cổng `80`/`443` truy cập được.

## Dữ liệu và cập nhật

Các volume `tuvi_mysql_data`, `tuvi_app_data` và `tuvi_chart_images` giữ dữ liệu qua lần rebuild. Sao lưu các volume này định kỳ; không dùng `docker compose down -v` khi muốn giữ dữ liệu. Firebase service account, nếu dùng, cần được mount read-only vào container `web` tại đường dẫn khớp `FIREBASE_CREDENTIALS_PATH`.

Để cập nhật phiên bản, lấy source mới rồi chạy lại `docker compose up -d --build`. Caddy lưu chứng chỉ trong volume `tuvi_caddy_data`.
