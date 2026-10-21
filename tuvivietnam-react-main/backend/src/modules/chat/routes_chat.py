from flask import Blueprint

from core.node_api_proxy import proxy_customer_api
from modules.auth.auth import login_required, permission_required

chat_bp = Blueprint("chat", __name__, url_prefix="/api")


@chat_bp.route("/chat/messages", methods=["GET", "POST"])
@login_required
def customer_chat_messages():
    return proxy_customer_api("/api/chat/messages")


@chat_bp.route("/admin/chat/conversations", methods=["GET"])
@permission_required("chat")
def admin_chat_conversations():
    return proxy_customer_api("/api/admin/chat/conversations")


@chat_bp.route("/admin/chat/conversations/<int:customer_id>/messages", methods=["GET", "POST"])
@permission_required("chat")
def admin_chat_messages(customer_id):
    return proxy_customer_api(f"/api/admin/chat/conversations/{customer_id}/messages")
