from flask import Blueprint, request, jsonify, g
from core.node_api_proxy import proxy_customer_api
from core.db import admin_get_user_detail
from modules.auth.auth import (
    verify_google_id_token,
    issue_user_session,
    login_required,
    delete_session,
    get_current_user_from_request
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/customer-accounts/sync", methods=["POST"])
@login_required
def sync_customer_account():
    return proxy_customer_api("/api/customer-accounts/sync")

@auth_bp.route("/google", methods=["POST"])
def auth_google():
    """Endpoint nhận Google ID token từ client và cấp phiên đăng nhập."""
    data = request.get_json(silent=True) or {}
    credential = data.get("credential")

    if not credential:
        return jsonify({
            "status": "error",
            "message": "Không tìm thấy thông tin đăng nhập Google (credential)."
        }), 400

    success, user_info, err_msg = verify_google_id_token(credential)
    if not success or not user_info:
        return jsonify({
            "status": "error",
            "message": err_msg or "Xác thực tài khoản Google thất bại."
        }), 401

    session_res = issue_user_session(user_info, referral_code=data.get("referral_code"))
    return jsonify({
        "status": "success",
        "message": f"Chào mừng {session_res['user']['name']} đã đăng nhập thành công!",
        "token": session_res["token"],
        "expires_at": session_res["expires_at"],
        "user": session_res["user"]
    }), 200

@auth_bp.route("/me", methods=["GET"])
@login_required
def auth_me():
    """Lấy thông tin người dùng hiện tại từ session token."""
    return jsonify({
        "status": "success",
        "user": g.current_user
    }), 200

@auth_bp.route("/profile/details", methods=["GET"])
@login_required
def auth_profile_details():
    """Return profile details for the authenticated user only."""
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile:
        return jsonify({"status": "error", "message": "Không tìm thấy hồ sơ người dùng."}), 404
    return jsonify({"status": "success", "data": profile}), 200

@auth_bp.route("/profile/chart-logs", methods=["GET"])
@login_required
def auth_profile_chart_logs():
    """Return legacy chart selection logs for the authenticated account."""
    return proxy_customer_api("/api/customer-logs/my-charts")

@auth_bp.route("/profile/referred-emails", methods=["GET"])
@login_required
def auth_profile_referred_emails():
    """Expose only this collaborator's referred account emails to the customer API."""
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile or profile.get("account_type") != "collaborator":
        return jsonify({"status": "error", "message": "Tài khoản không phải cộng tác viên."}), 403
    emails = [str(account.get("email") or "").strip().lower() for account in profile.get("referred_accounts", [])]
    return jsonify({"status": "success", "data": {"emails": [email for email in emails if email]}}), 200

@auth_bp.route("/profile/referred-chart-logs", methods=["GET"])
@login_required
def auth_profile_referred_chart_logs():
    """Return chart history belonging to accounts referred by the current collaborator."""
    profile = admin_get_user_detail(str(g.current_user["id"]))
    if not profile or profile.get("account_type") != "collaborator":
        return jsonify({"status": "error", "message": "Tài khoản không phải cộng tác viên."}), 403
    return proxy_customer_api("/api/customer-logs/my-referred-charts")

@auth_bp.route("/logout", methods=["POST"])
def auth_logout():
    """Đăng xuất và hủy token phiên làm việc."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        if token:
            delete_session(token)
    return jsonify({
        "status": "success",
        "message": "Đã đăng xuất thành công."
    }), 200

@auth_bp.route("/dev-login", methods=["POST"])
def auth_dev_login():
    """
    Endpoint đăng nhập nhanh thử nghiệm cục bộ (Dev Quick Login).
    Hỗ trợ kiểm thử trực tiếp vai trò User và Manager mà không cần Google Cloud Console ngay.
    """
    data = request.get_json(silent=True) or {}
    role = data.get("role", "user")
    if role not in ("user", "manager"):
        role = "user"

    if role == "manager":
        mock_user = {
            "google_id": "dev_manager_id_999",
            "email": "quanly@tuvihongan.com",
            "name": data.get("name", "Quản Lý Tử Vi Hồng Ân"),
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=Manager"
        }
    else:
        mock_user = {
            "google_id": "dev_user_id_101",
            "email": "user.demo@tuvihongan.com",
            "name": data.get("name", "Người Dùng Thử Nghiệm"),
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=TuViUser"
        }

    session_res = issue_user_session(mock_user, forced_role=role)
    return jsonify({
        "status": "success",
        "message": f"Đăng nhập thành công với vai trò {role.upper()}!",
        "token": session_res["token"],
        "expires_at": session_res["expires_at"],
        "user": session_res["user"]
    }), 200
