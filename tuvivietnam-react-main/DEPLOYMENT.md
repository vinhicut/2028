# Triển khai tuvihongan.com bằng Docker

Docker Compose chạy frontend/Flask, Node Customer API và MySQL. Nginx hiện có trên host tiếp tục làm reverse proxy; Compose không chiếm cổng 80/443. Flask được map vào cổng host `2028`, cùng upstream mà cấu hình Nginx hiện tại đang sử dụng. Customer API và MySQL chỉ nằm trong mạng Docker.

## Chuẩn bị

1. Cài Docker Engine và Docker Compose plugin.
2. Đảm bảo DNS của domain đang dùng trỏ về server.
3. Tạo `.env` từ `.env.server.example`, rồi điền `SECRET_KEY`, mật khẩu MySQL, Google OAuth và SMTP. Giữ `.env` riêng tư.

## Cập nhật và khởi chạy

Tại thư mục Git gốc trên server:

```sh
git pull origin main
cd tuvivietnam-react-main
docker compose up -d --build
docker compose ps
```

Compose giữ tên service/container `tuvi-website` / `tuvi_hongan_app` và ánh xạ cổng host `2028` vào Flask `2026`, để Nginx tiếp tục dùng upstream hiện tại. Flask chuyển tiếp các API cần Node Customer API qua mạng nội bộ Docker.

Nếu Docker báo orphan container, không dùng `--remove-orphans` tùy tiện; container cũ có thể đang phục vụ ứng dụng khác.

## Dữ liệu

Các volume `tuvi_mysql_data`, `tuvi_app_data` và `tuvi_chart_images` giữ dữ liệu qua lần rebuild. SQLite của Flask được lưu tại `/app/backend/src/data/tuvi.db` và `tuvi_app_data` đã được mount đúng vào thư mục này. Sao lưu định kỳ; không dùng `docker compose down -v` nếu muốn giữ dữ liệu. Firebase service account, nếu dùng, cần được mount read-only vào container `tuvi-website` tại đường dẫn khớp `FIREBASE_CREDENTIALS_PATH`.

### Lưu ý khi sửa lỗi volume lần đầu

Bản cũ từng mount volume vào `/app/backend/data`, trong khi ứng dụng thực tế ghi vào `/app/backend/src/data`. Trước lần deploy đầu tiên sau khi sửa Compose, hãy sao lưu database đang nằm trong container cũ:

```sh
mkdir -p backup
docker cp tuvi_hongan_app:/app/backend/src/data/tuvi.db ./backup/tuvi.db
docker compose down
docker compose up -d --build
docker run --rm -v tuvi_app_data:/data -v "$(pwd)/backup:/backup:ro" alpine sh -c 'cp /backup/tuvi.db /data/tuvi.db'
docker compose restart tuvi-website
```

Nếu server đã có bản backup/database production khác, dùng bản đó thay cho `./backup/tuvi.db`. Không chạy `docker compose down -v`.
