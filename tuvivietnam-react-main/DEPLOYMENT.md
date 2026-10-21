# Docker deployment

## Before starting

1. Copy `.env.server.example` to `.env` in the project root. Replace all example credentials with production values, including the Google OAuth client ID and secret. Keep `.env` private and out of Git.
2. Install Docker Engine and the Docker Compose plugin on the server.
3. Create the shared network once: `docker network create tuvi_app_network`.
4. If the app uses Firebase, place the service account JSON on the server and add a read-only bind mount for it under `tuvi-website.volumes` in the root `docker-compose.yml`, targeting the configured `FIREBASE_CREDENTIALS_PATH`. Do not add that credential to the image or Git. Without it, the backend falls back to its local SQLite database.

## Start

From the project root, start the Flask website:

```sh
docker compose up -d --build
```

Then start MySQL, the Node API and phpMyAdmin:

```sh
docker compose --env-file ../.env up -d --build
```

Run the second command from `backend-node/`. Both stacks join `tuvi_app_network`. The website calls `customer-api:3001`; the Node API calls `tuvi_hongan_app:2026` for manager session checks. MySQL and phpMyAdmin remain bound to the server's loopback interface. phpMyAdmin is available on the server at port `8082` and should be reached remotely through SSH tunneling or VPN. The website SQLite fallback and MySQL database use Docker volumes so container recreation does not erase them.

## Backups and updates

Back up the MySQL Docker volume `tuvi_mysql_data` and the Firebase data separately. Updating/rebuilding containers keeps named volumes, but deleting the MySQL volume deletes its database. To inspect service status, use `docker compose ps` from the root and `docker compose --env-file ../.env ps` from `backend-node/`.
