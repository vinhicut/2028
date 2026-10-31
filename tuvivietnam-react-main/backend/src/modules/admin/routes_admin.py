from flask import Blueprint, request, jsonify, g
from modules.auth.auth import permission_required
from core.db import admin_get_users, admin_get_user_detail, admin_get_charts, admin_get_stats, admin_create_user, admin_update_user, admin_delete_user
from core.node_api_proxy import proxy_customer_api

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route("/users", methods=["GET"])
@permission_required("users")
def list_users():
    """Xem danh sách toàn bộ người dùng trong hệ thống (Dành cho Quản lý)."""
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))
    users = admin_get_users(limit=limit, offset=offset)
    return jsonify({
        "status": "success",
        "data": users
    }), 200


@admin_bp.route("/users/<user_id>", methods=["GET"])
@permission_required("users")
def get_user_detail(user_id):
    user = admin_get_user_detail(user_id)
    if not user:
        return jsonify({"status": "error", "message": "Không tìm thấy người dùng."}), 404
    return jsonify({"status": "success", "data": user}), 200

@admin_bp.route("/referral-chart-logs", methods=["GET"])
@permission_required("users")
def list_referred_user_chart_logs():
    """Return chart history for referred accounts in a collaborator detail popup."""
    return proxy_customer_api("/api/admin/referral-chart-logs")


@admin_bp.route("/users", methods=["POST"])
@permission_required("users")
def create_user():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email') or '').strip().lower()
    name = str(data.get('name') or '').strip()
    account_type = data.get('account_type', 'user')
    if not email or '@' not in email or not name or account_type not in ('user', 'collaborator', 'admin'):
        return jsonify({"status": "error", "message": "Họ tên, email hợp lệ và loại tài khoản là bắt buộc."}), 400
    if account_type == 'admin' and int(g.current_user.get('admin_level') or 2) != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được tạo tài khoản quản trị."}), 403
    try:
        user = admin_create_user(email, name, account_type)
    except Exception as error:
        return jsonify({"status": "error", "message": str(error) or "Không thể tạo người dùng."}), 409
    return jsonify({"status": "success", "data": user}), 201


@admin_bp.route("/users/<user_id>", methods=["PUT", "DELETE"])
@permission_required("users")
def update_or_delete_user(user_id):
    current = g.current_user
    current_level = int(current.get('admin_level') or 2)
    target = admin_get_user_detail(user_id)
    if not target:
        return jsonify({"status": "error", "message": "Không tìm thấy người dùng."}), 404
    if request.method == 'DELETE':
        if str(current.get('id')) == str(user_id):
            return jsonify({"status": "error", "message": "Không thể xóa tài khoản đang đăng nhập."}), 400
        if int(target.get('admin_level') or 0) == 1 and current_level != 1:
            return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được quản lý tài khoản Admin 1."}), 403
        admin_delete_user(user_id)
        return jsonify({"status": "success"}), 200

    updates = request.get_json(silent=True) or {}
    # A role change away from admin can arrive with a stale admin_level from
    # clients that submit the full user form. The database resets it to 0.
    if updates.get('account_type') in ('user', 'collaborator'):
        updates.pop('admin_level', None)
    if updates.get('account_type') == 'admin' and current_level != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được tạo hoặc phân quyền tài khoản quản trị."}), 403
    if 'admin_level' in updates and current_level != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được đổi cấp quản trị."}), 403
    if 'admin_level' in updates:
        try:
            updates['admin_level'] = int(updates['admin_level'])
        except (TypeError, ValueError):
            return jsonify({"status": "error", "message": "Cấp quản trị phải là 1, 2 hoặc 3."}), 400
        if updates['admin_level'] not in (1, 2, 3) or updates.get('account_type', target.get('account_type')) != 'admin':
            return jsonify({"status": "error", "message": "Cấp quản trị chỉ áp dụng cho tài khoản admin."}), 400
    if str(current.get('id')) == str(user_id) and updates.get('account_type', target.get('account_type')) != 'admin':
        return jsonify({"status": "error", "message": "Không thể tự hạ quyền tài khoản đang đăng nhập."}), 400
    if int(target.get('admin_level') or 0) == 1 and current_level != 1:
        return jsonify({"status": "error", "message": "Chỉ Admin 1 mới được sửa tài khoản Admin 1."}), 403
    try:
        user = admin_update_user(user_id, updates)
    except ValueError as error:
        return jsonify({"status": "error", "message": str(error)}), 400
    return jsonify({"status": "success", "data": user}), 200

@admin_bp.route("/charts", methods=["GET"])
@permission_required("full")
def list_charts():
    """Xem danh sách toàn bộ lá số đã lưu trên website (Dành cho Quản lý)."""
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))
    search = request.args.get("search", "").strip() or None
    charts = admin_get_charts(limit=limit, offset=offset, search=search)
    return jsonify({
        "status": "success",
        "data": charts
    }), 200

@admin_bp.route("/stats", methods=["GET"])
@permission_required("full")
def get_stats():
    """Xem thống kê tổng quan hệ thống (Dành cho Quản lý)."""
    stats = admin_get_stats()
    return jsonify({
        "status": "success",
        "data": stats
    }), 200

@admin_bp.route("/customer-logs/charts", methods=["GET"])
@permission_required("full")
def list_customer_chart_logs():
    return proxy_customer_api("/api/admin/customer-logs/charts")

@admin_bp.route("/customer-logs/charts/<int:chart_id>", methods=["DELETE"])
@permission_required("full")
def delete_customer_chart_log(chart_id):
    return proxy_customer_api(f"/api/admin/customer-logs/charts/{chart_id}")

@admin_bp.route("/customer-accounts", methods=["GET"])
@permission_required("full")
def list_google_customer_accounts():
    return proxy_customer_api("/api/admin/customer-accounts")

@admin_bp.route("/customer-accounts/<int:account_id>", methods=["DELETE"])
@permission_required("full")
def delete_google_customer_account(account_id):
    return proxy_customer_api(f"/api/admin/customer-accounts/{account_id}")

@admin_bp.route("/customer-logs/charts/<int:chart_id>/image", methods=["GET"])
@permission_required("full")
def get_customer_chart_image(chart_id):
    return proxy_customer_api(f"/api/admin/customer-logs/charts/{chart_id}/image")

@admin_bp.route("/articles", methods=["GET", "POST"])
@permission_required("articles")
def manage_articles():
    return proxy_customer_api("/api/admin/articles")

@admin_bp.route("/articles/<int:article_id>", methods=["PUT", "DELETE"])
@permission_required("articles")
def update_article(article_id):
    return proxy_customer_api(f"/api/admin/articles/{article_id}")

@admin_bp.route("/article-images", methods=["POST"])
@permission_required("articles")
def upload_article_image():
    return proxy_customer_api("/api/admin/article-images")
