# Triển khai tuvihongan.com bằng Docker và Nginx

Docker Compose chạy frontend/Flask, Node Customer API và MySQL. Nginx đã cài trên host nhận traffic của domain và proxy vào các cổng loopback của Docker. MySQL và các API không được mở trực tiếp ra Internet.

## Chuẩn bị

1. Cài Docker Engine và Docker Compose plugin.
2. Trỏ DNS `A` cho `tuvihongan.com` và `www.tuvihongan.com` về IP server. Nếu có bản ghi `AAAA`, nó cũng phải trỏ đúng server.
3. Mở TCP `80` và `443` trên firewall/security group.
4. Tạo `.env` từ `.env.server.example` và điền `SECRET_KEY`, mật khẩu MySQL, Google OAuth và SMTP. Giữ `.env` riêng tư.

## Khởi chạy ứng dụng

Tại thư mục dự án:

```sh
docker compose up -d --build
docker compose ps
```

Compose chỉ bind Flask vào `127.0.0.1:2026` và Node Customer API vào `127.0.0.1:3002`. Nginx chuyển các API bài viết/chat/log/tài khoản tới Node; các request còn lại tới Flask.

## Cấu hình Nginx

Sao chép `deployment/nginx/nginx.conf` vào cấu hình site của Nginx (ví dụ `/etc/nginx/sites-available/tuvihongan.com`), bật site nếu cần, rồi kiểm tra và reload:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Nếu dùng Certbot, sau khi DNS trỏ đúng và HTTP hoạt động, cấp HTTPS bằng:

```sh
sudo certbot --nginx -d tuvihongan.com -d www.tuvihongan.com
```

Thêm `https://tuvihongan.com` và `https://www.tuvihongan.com` vào Authorized JavaScript origins của Google OAuth.

## Dữ liệu và cập nhật

Các volume `tuvi_mysql_data`, `tuvi_app_data` và `tuvi_chart_images` giữ dữ liệu qua lần rebuild. Sao lưu định kỳ; không dùng `docker compose down -v` nếu muốn giữ dữ liệu. Firebase service account, nếu dùng, cần được mount read-only vào `web` tại đường dẫn khớp `FIREBASE_CREDENTIALS_PATH`.

Để cập nhật, lấy source mới rồi chạy lại `docker compose up -d --build`. Container cũ có thể hiện là orphan nếu thuộc stack trước; chỉ xóa sau khi xác nhận không còn cần dùng.
