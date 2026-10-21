# Node.js API + MySQL + phpMyAdmin

This is an additional backend for customer chart logs. The existing Flask API remains responsible for chart calculation and Google login. This Node API stores the selected chart and customer details in MySQL; phpMyAdmin provides a database browser.

## Start the services

For a server deployment, follow the project root deployment notes. Both Compose files share the external Docker network `tuvi_app_network`; create it once with `docker network create tuvi_app_network` before starting either stack. Start this stack with `docker compose up -d --build` from this directory, then start the website stack from the project root. The website reaches Node at `http://customer-api:3001`, and Node reaches Flask at `http://tuvi_hongan_app:2026` over that network.

Copy `.env.example` to `.env` for local-only use. On a server, use the root `.env.server.example` as the combined environment template and keep actual credentials out of Git. phpMyAdmin is bound to localhost port `8082`; access it through SSH tunneling or a VPN rather than exposing it publicly.

For local development without Docker networking, the API listens at `http://localhost:3001`; phpMyAdmin opens at `http://localhost:8082`.

The API listens on `http://localhost:3001`. phpMyAdmin opens at `http://localhost:8082`; choose the `tuvi_hongan` database and `customer_chart_logs` table. Sign in with `tuvi_app` and the `DB_PASSWORD` from `.env`, or use `root` and `MYSQL_ROOT_PASSWORD`.

The Node API checks manager sessions against the existing Flask `/api/auth/me` endpoint before returning customer logs. Only managers can read the logs through the admin page. MySQL data is kept in the Docker volume `tuvi_mysql_data`.

## API routes

- `POST /api/customer-logs/charts`: save a chart selected by a visitor.
- `POST /api/customer-accounts/sync`: verify the app session and save/update the signed-in Google account in MySQL.
- `GET /api/admin/customer-logs/charts`: return saved charts; requires a valid manager bearer token.
- `GET /api/admin/customer-accounts`: return Google-authenticated customer accounts; requires a valid manager bearer token.
- `GET /api/articles`: list published articles; add `?category=Phật pháp` to filter or `?slug=<slug>` to load one.
- `GET/POST /api/admin/articles` and `PUT/DELETE /api/admin/articles/:id`: manage articles; requires a valid manager bearer token.
- `GET /api/health`: check the service.

The `customer_chart_logs` and `articles` tables are created automatically when the API starts. Admins can create drafts and publish articles from `/quan-ly/bai-viet`; published Phật pháp articles appear at `/phat-phap` without rebuilding the frontend. Chart images are stored privately in `backend-node/storage/chart-images` (or the path set by `CHART_IMAGE_DIR`); MySQL keeps only the image filename. The API serves each image only after checking manager access. Images left in the previous MySQL BLOB column are moved to this folder when the Node API starts.
