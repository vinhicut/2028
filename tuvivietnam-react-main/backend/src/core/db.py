import sqlite3
import json
import secrets
import datetime
from typing import Optional, Dict, Any, List
from core.config import DB_PATH, SUPER_ADMIN_EMAILS
import core.firebase_db as firebase_db

# Flag to indicate if Firebase is active
FIREBASE_ACTIVE = False

def get_connection() -> sqlite3.Connection:
    """Tạo kết nối SQLite an toàn với WAL mode và Row factory."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """Khởi tạo cấu trúc các bảng cơ sở dữ liệu nếu chưa tồn tại. Đồng thời thử kết nối Firebase."""
    global FIREBASE_ACTIVE
    FIREBASE_ACTIVE = firebase_db.init_firebase()
    
    conn = get_connection()
    try:
        with conn:
            # 1. Bảng người dùng
            conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                avatar TEXT,
                role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'manager')),
                account_type TEXT NOT NULL DEFAULT 'user',
                admin_level INTEGER NOT NULL DEFAULT 0,
                referral_code TEXT,
                referred_by_user_id INTEGER REFERENCES users(id),
                created_at TEXT NOT NULL,
                last_login_at TEXT NOT NULL
            );
            """)

            user_columns = {row['name'] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
            if 'account_type' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'user'")
            if 'admin_level' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN admin_level INTEGER NOT NULL DEFAULT 0")
            if 'referral_code' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN referral_code TEXT")
            if 'referred_by_user_id' not in user_columns:
                conn.execute("ALTER TABLE users ADD COLUMN referred_by_user_id INTEGER REFERENCES users(id) DEFAULT NULL")
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL")
            admin_placeholders = ','.join('?' for _ in SUPER_ADMIN_EMAILS) or "''"
            conn.execute(f"UPDATE users SET account_type = 'admin', admin_level = CASE WHEN lower(email) IN ({admin_placeholders}) THEN 1 ELSE 2 END WHERE role = 'manager' AND account_type = 'user'", SUPER_ADMIN_EMAILS)
            conn.execute("UPDATE users SET role = 'manager' WHERE account_type = 'admin'")

            # 2. Bảng phiên đăng nhập (Sessions)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)

            # 3. Bảng lá số người dùng (Bảng có cấu trúc cố định)
            conn.execute("""
            CREATE TABLE IF NOT EXISTS user_charts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                chart_code TEXT NOT NULL,
                ho_ten TEXT NOT NULL,
                gioi_tinh TEXT NOT NULL,
                ngay_sinh INTEGER NOT NULL,
                thang_sinh INTEGER NOT NULL,
                nam_sinh INTEGER NOT NULL,
                gio_sinh INTEGER NOT NULL,
                phut_sinh INTEGER NOT NULL,
                loai_lich TEXT NOT NULL,
                thang_nhuan INTEGER NOT NULL DEFAULT 0,
                nam_xem_han INTEGER NOT NULL,
                input_data TEXT NOT NULL,
                chart_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """)

            # Chỉ mục tăng tốc độ truy vấn
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_charts_latest ON user_charts(user_id, updated_at DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_user_charts_code ON user_charts(chart_code);")
    finally:
        conn.close()

# ----------------- User Queries -----------------

def _new_referral_code() -> str:
    return secrets.token_urlsafe(7).replace('-', '').replace('_', '').upper()[:9]

def upsert_user(google_id: str, email: str, name: str, avatar: Optional[str], role: str = 'user', referral_code: Optional[str] = None) -> Dict[str, Any]:
    """Tạo mới hoặc cập nhật người dùng khi đăng nhập Google SSO."""
    if FIREBASE_ACTIVE:
        return firebase_db.upsert_user(google_id, email, name, avatar, role, referral_code)

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE google_id = ? OR email = ?", (google_id, email))
            existing = cur.fetchone()

            if existing:
                # Giữ nguyên role manager nếu tài khoản đã là manager
                final_role = existing['role'] if existing['role'] == 'manager' else role
                account_type = existing['account_type']
                admin_level = existing['admin_level']
                if role == 'manager' and account_type != 'admin':
                    account_type, admin_level = 'admin', 2
                if email.lower() in SUPER_ADMIN_EMAILS:
                    final_role, account_type, admin_level = 'manager', 'admin', 1
                referred_by_user_id = existing['referred_by_user_id']
                if not referred_by_user_id and referral_code and str(existing['google_id']).startswith('pending:'):
                    cur.execute("SELECT id FROM users WHERE upper(referral_code) = upper(?) AND account_type = 'collaborator'", (referral_code.strip(),))
                    referrer = cur.fetchone()
                    referred_by_user_id = referrer['id'] if referrer else None
                cur.execute("""
                    UPDATE users
                    SET google_id = ?, email = ?, name = ?, avatar = ?, role = ?, account_type = ?, admin_level = ?, referred_by_user_id = ?, last_login_at = ?
                    WHERE id = ?
                """, (google_id, email, name, avatar, final_role, account_type, admin_level, referred_by_user_id, now_str, existing['id']))
                user_id = existing['id']
            else:
                account_type = 'admin' if role == 'manager' or email.lower() in SUPER_ADMIN_EMAILS else 'user'
                admin_level = (1 if email.lower() in SUPER_ADMIN_EMAILS else 2) if account_type == 'admin' else 0
                referred_by_user_id = None
                if referral_code:
                    cur.execute("SELECT id FROM users WHERE upper(referral_code) = upper(?) AND account_type = 'collaborator'", (referral_code.strip(),))
                    referrer = cur.fetchone()
                    if referrer:
                        referred_by_user_id = referrer['id']
                referral_code_for_user = _new_referral_code() if account_type == 'collaborator' else None
                cur.execute("""
                    INSERT INTO users (google_id, email, name, avatar, role, account_type, admin_level, referral_code, referred_by_user_id, created_at, last_login_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (google_id, email, name, avatar, 'manager' if account_type == 'admin' else 'user', account_type, admin_level, referral_code_for_user, referred_by_user_id, now_str, now_str))
                user_id = cur.lastrowid

            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row)
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_by_id(str(user_id))

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

# ----------------- Session Queries -----------------

def create_session(user_id: int, token: str, days: int = 30) -> Dict[str, Any]:
    if FIREBASE_ACTIVE:
        return firebase_db.create_session(str(user_id), token, days)

    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.isoformat()
    exp_str = (now + datetime.timedelta(days=days)).isoformat()

    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO sessions (user_id, token, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            """, (user_id, token, exp_str, now_str))
            return {"user_id": user_id, "token": token, "expires_at": exp_str}
    finally:
        conn.close()

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_by_token(token)

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.*
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        """, (token, now_str))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def delete_session(token: str) -> bool:
    if FIREBASE_ACTIVE:
        return firebase_db.delete_session(token)

    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM sessions WHERE token = ?", (token,))
            return cur.rowcount > 0
    finally:
        conn.close()

# ----------------- Chart Queries -----------------

def save_user_chart(
    user_id: int,
    chart_code: str,
    ho_ten: str,
    gioi_tinh: str,
    ngay_sinh: int,
    thang_sinh: int,
    nam_sinh: int,
    gio_sinh: int,
    phut_sinh: int,
    loai_lich: str,
    thang_nhuan: int,
    nam_xem_han: int,
    input_data: Any,
    chart_data: Any
) -> Dict[str, Any]:
    """Lưu hoặc cập nhật một bản ghi lá số vào bảng cố định user_charts."""
    if FIREBASE_ACTIVE:
        return firebase_db.save_user_chart(
            str(user_id), chart_code, ho_ten, gioi_tinh,
            ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
            loai_lich, thang_nhuan, nam_xem_han, input_data, chart_data
        )

    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    input_json = json.dumps(input_data, ensure_ascii=False) if not isinstance(input_data, str) else input_data
    chart_json = json.dumps(chart_data, ensure_ascii=False) if not isinstance(chart_data, str) else chart_data

    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO user_charts (
                    user_id, chart_code, ho_ten, gioi_tinh,
                    ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                    loai_lich, thang_nhuan, nam_xem_han,
                    input_data, chart_data, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, chart_code, ho_ten, gioi_tinh,
                ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                loai_lich, thang_nhuan, nam_xem_han,
                input_json, chart_json, now_str, now_str
            ))
            chart_id = cur.lastrowid
            return {
                "id": chart_id,
                "chart_code": chart_code,
                "ho_ten": ho_ten,
                "updated_at": now_str
            }
    finally:
        conn.close()

def get_latest_user_chart(user_id: int) -> Optional[Dict[str, Any]]:
    """Truy xuất lá số được lưu gần đây nhất của người dùng."""
    if FIREBASE_ACTIVE:
        return firebase_db.get_latest_user_chart(str(user_id))

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, user_id, chart_code, ho_ten, gioi_tinh,
                   ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                   loai_lich, thang_nhuan, nam_xem_han,
                   input_data, chart_data, created_at, updated_at
            FROM user_charts
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
        """, (user_id,))
        row = cur.fetchone()
        if not row:
            return None
        res = dict(row)
        try:
            res["input_data"] = json.loads(res["input_data"])
        except Exception:
            pass
        try:
            res["chart_data"] = json.loads(res["chart_data"])
        except Exception:
            pass
        return res
    finally:
        conn.close()

def get_user_charts_list(user_id: int, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    """Lấy danh sách các lá số mà người dùng đã lưu."""
    if FIREBASE_ACTIVE:
        return firebase_db.get_user_charts_list(str(user_id), limit, offset)

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, chart_code, ho_ten, gioi_tinh,
                   ngay_sinh, thang_sinh, nam_sinh, gio_sinh, phut_sinh,
                   loai_lich, thang_nhuan, nam_xem_han, created_at, updated_at
            FROM user_charts
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        """, (user_id, limit, offset))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

# ----------------- Admin Queries -----------------

def admin_get_users(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_users(limit, offset)

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.google_id, u.email, u.name, u.avatar, u.role, u.account_type, u.admin_level,
                   u.referral_code, u.referred_by_user_id, r.name AS referrer_name, r.email AS referrer_email,
                   u.created_at, u.last_login_at, COUNT(DISTINCT c.id) AS total_charts,
                   COUNT(DISTINCT referred.id) AS referred_users
            FROM users u
            LEFT JOIN user_charts c ON u.id = c.user_id
            LEFT JOIN users r ON r.id = u.referred_by_user_id
            LEFT JOIN users referred ON referred.referred_by_user_id = u.id
            GROUP BY u.id
            ORDER BY u.id DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def admin_get_user_detail(user_id: str) -> Optional[Dict[str, Any]]:
    """Return a user's basic account data and saved chart/service history."""
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_user_detail(str(user_id))
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""SELECT u.id, u.email, u.name, u.avatar, u.account_type, u.admin_level,
                          u.referral_code, u.referred_by_user_id, u.created_at, u.last_login_at,
                          r.name AS referrer_name, r.email AS referrer_email, r.referral_code AS referrer_code,
                          (SELECT COUNT(*) FROM users referred WHERE referred.referred_by_user_id = u.id) AS referred_users
                     FROM users u LEFT JOIN users r ON r.id = u.referred_by_user_id WHERE u.id = ?""", (user_id,))
        user = cur.fetchone()
        if not user:
            return None
        result = dict(user)
        cur.execute("""SELECT id, chart_code, ho_ten, gioi_tinh, ngay_sinh, thang_sinh, nam_sinh,
                          gio_sinh, phut_sinh, loai_lich, nam_xem_han, created_at, updated_at
                     FROM user_charts WHERE user_id = ? ORDER BY updated_at DESC""", (user_id,))
        result['services'] = [dict(row) for row in cur.fetchall()]
        return result
    finally:
        conn.close()


def admin_create_user(email: str, name: str, account_type: str = 'user') -> Dict[str, Any]:
    email = email.strip().lower()
    name = name.strip()
    if FIREBASE_ACTIVE:
        return firebase_db.admin_create_user(email, name, account_type)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    code = _new_referral_code() if account_type == 'collaborator' else None
    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("INSERT INTO users (google_id,email,name,role,account_type,admin_level,referral_code,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?)",
                        (f"pending:{secrets.token_urlsafe(18)}", email, name, 'manager' if account_type == 'admin' else 'user', account_type, 2 if account_type == 'admin' else 0, code, now, now))
            cur.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,))
            return dict(cur.fetchone())
    finally:
        conn.close()


def admin_update_user(user_id: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_update_user(str(user_id), updates)
    allowed = {'name', 'account_type', 'admin_level', 'referred_by_user_id'}
    fields = {key: value for key, value in updates.items() if key in allowed}
    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            current = cur.fetchone()
            if not current:
                return None
            if fields.get('referred_by_user_id'):
                cur.execute("SELECT id FROM users WHERE id = ? AND account_type = 'collaborator'", (fields['referred_by_user_id'],))
                if not cur.fetchone() or str(fields['referred_by_user_id']) == str(user_id):
                    raise ValueError('Người giới thiệu phải là một tài khoản cộng tác viên khác.')
            if 'account_type' in fields:
                if fields['account_type'] not in ('admin', 'collaborator', 'user'):
                    raise ValueError('Loại tài khoản không hợp lệ.')
                fields['role'] = 'manager' if fields['account_type'] == 'admin' else 'user'
                if fields['account_type'] == 'admin':
                    fields['admin_level'] = fields.get('admin_level') or current['admin_level'] or 2
                else:
                    fields['admin_level'] = 0
                if fields['account_type'] == 'collaborator' and not current['referral_code']:
                    fields['referral_code'] = _new_referral_code()
            if 'admin_level' in fields and fields['admin_level'] not in (1, 2, 3):
                raise ValueError('Cấp quản trị phải là 1, 2 hoặc 3.')
            if fields:
                assignments = ', '.join(f"{column} = ?" for column in fields)
                cur.execute(f"UPDATE users SET {assignments} WHERE id = ?", [*fields.values(), user_id])
            cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def admin_delete_user(user_id: Any) -> bool:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_delete_user(str(user_id))
    conn = get_connection()
    try:
        with conn:
            cur = conn.cursor()
            cur.execute("UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?", (user_id,))
            cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
            return cur.rowcount > 0
    finally:
        conn.close()

def admin_get_charts(limit: int = 50, offset: int = 0, search: Optional[str] = None) -> List[Dict[str, Any]]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_charts(limit, offset, search)

    conn = get_connection()
    try:
        cur = conn.cursor()
        if search:
            q = f"%{search}%"
            cur.execute("""
                SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                       c.chart_code, c.ho_ten, c.gioi_tinh, c.ngay_sinh, c.thang_sinh, c.nam_sinh,
                       c.gio_sinh, c.phut_sinh, c.loai_lich, c.thang_nhuan, c.nam_xem_han,
                       c.created_at, c.updated_at
                FROM user_charts c
                JOIN users u ON c.user_id = u.id
                WHERE c.chart_code LIKE ? OR c.ho_ten LIKE ? OR u.email LIKE ?
                ORDER BY c.id DESC
                LIMIT ? OFFSET ?
            """, (q, q, q, limit, offset))
        else:
            cur.execute("""
                SELECT c.id, c.user_id, u.name AS user_name, u.email AS user_email,
                       c.chart_code, c.ho_ten, c.gioi_tinh, c.ngay_sinh, c.thang_sinh, c.nam_sinh,
                       c.gio_sinh, c.phut_sinh, c.loai_lich, c.thang_nhuan, c.nam_xem_han,
                       c.created_at, c.updated_at
                FROM user_charts c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.id DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

def admin_get_stats() -> Dict[str, Any]:
    if FIREBASE_ACTIVE:
        return firebase_db.admin_get_stats()

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        total_users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM users WHERE role = 'manager'")
        total_managers = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM user_charts")
        total_charts = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')")
        active_sessions = cur.fetchone()[0]
        return {
            "total_users": total_users,
            "total_managers": total_managers,
            "total_charts": total_charts,
            "active_sessions": active_sessions
        }
    finally:
        conn.close()
