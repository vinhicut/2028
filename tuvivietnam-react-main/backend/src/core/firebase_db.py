import os
import json
import secrets
import datetime
from typing import Optional, Dict, Any, List
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from core.config import FIREBASE_PROJECT_ID, FIREBASE_CREDENTIALS_PATH, SUPER_ADMIN_EMAILS

# Global Firestore client
db = None

def init_firebase() -> bool:
    global db
    if db is not None:
        return True
    
    try:
        if os.path.exists(FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred, {
                'projectId': FIREBASE_PROJECT_ID
            })
            db = firestore.client()
            # Test connection
            try:
                db.collection('users').limit(1).get()
            except Exception as e:
                print(f"[Firebase] Connected but Firestore is disabled or errored: {e}. Falling back to SQLite.")
                db = None
                return False
            print(f"[Firebase] Successfully initialized with {FIREBASE_CREDENTIALS_PATH}")
            return True
        else:
            print(f"[Firebase] Credentials file not found at {FIREBASE_CREDENTIALS_PATH}. Falling back to SQLite.")
            return False
    except Exception as e:
        print(f"[Firebase] Initialization error: {e}. Falling back to SQLite.")
        return False

# ----------------- User Queries -----------------

def upsert_user(google_id: str, email: str, name: str, avatar: Optional[str], role: str = 'user', referral_code: Optional[str] = None) -> Dict[str, Any]:
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    users_ref = db.collection('users')
    
    # Check if user exists by google_id
    query = users_ref.where(filter=firestore.FieldFilter('google_id', '==', google_id)).limit(1).get()
    if not query:
        query = users_ref.where(filter=firestore.FieldFilter('email', '==', email.lower())).limit(1).get()
    
    if query:
        doc = query[0]
        user_data = doc.to_dict()
        user_id = doc.id
        final_role = user_data.get('role', 'user')
        account_type = user_data.get('account_type', 'admin' if final_role == 'manager' else 'user')
        admin_level = user_data.get('admin_level', 2 if final_role == 'manager' else 0)
        if role == 'manager' and account_type != 'admin':
            account_type, admin_level = 'admin', 2
        if email.lower() in SUPER_ADMIN_EMAILS:
            final_role, account_type, admin_level = 'manager', 'admin', 1
        referred_by_user_id = user_data.get('referred_by_user_id')
        if not referred_by_user_id and referral_code:
            referrers = users_ref.where(filter=firestore.FieldFilter('referral_code', '==', referral_code.strip().upper())).limit(1).get()
            if referrers and referrers[0].id != user_id and referrers[0].to_dict().get('account_type') == 'collaborator':
                referred_by_user_id = referrers[0].id
            
        update_data = {
            'email': email,
            'name': name,
            'avatar': avatar,
            'role': final_role,
            'account_type': account_type,
            'admin_level': admin_level,
            'referred_by_user_id': referred_by_user_id,
            'last_login_at': now_str
        }
        users_ref.document(user_id).update(update_data)
        user_data.update(update_data)
        user_data['id'] = user_id
        return user_data
    else:
        # Create new user
        account_type = 'admin' if role == 'manager' or email.lower() in SUPER_ADMIN_EMAILS else 'user'
        referred_by_user_id = None
        if referral_code:
            referrers = users_ref.where(filter=firestore.FieldFilter('referral_code', '==', referral_code.strip().upper())).limit(1).get()
            if referrers and referrers[0].to_dict().get('account_type') == 'collaborator':
                referred_by_user_id = referrers[0].id
        new_user = {
            'google_id': google_id,
            'email': email,
            'name': name,
            'avatar': avatar,
            'role': 'manager' if account_type == 'admin' else 'user',
            'account_type': account_type,
            'admin_level': (1 if email.lower() in SUPER_ADMIN_EMAILS else 2) if account_type == 'admin' else 0,
            'referral_code': secrets.token_urlsafe(7).replace('-', '').replace('_', '').upper()[:9] if account_type == 'collaborator' else None,
            'referred_by_user_id': referred_by_user_id,
            'created_at': now_str,
            'last_login_at': now_str
        }
        doc_ref = users_ref.document() # Auto ID
        doc_ref.set(new_user)
        new_user['id'] = doc_ref.id
        return new_user

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    doc = db.collection('users').document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

# ----------------- Session Queries -----------------

def create_session(user_id: str, token: str, days: int = 30) -> Dict[str, Any]:
    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.isoformat()
    exp_str = (now + datetime.timedelta(days=days)).isoformat()

    session_data = {
        'user_id': user_id,
        'token': token,
        'expires_at': exp_str,
        'created_at': now_str
    }
    db.collection('sessions').document(token).set(session_data)
    return session_data

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    doc = db.collection('sessions').document(token).get()
    if doc.exists:
        session_data = doc.to_dict()
        if session_data.get('expires_at') > now_str:
            user_id = session_data.get('user_id')
            user_doc = db.collection('users').document(str(user_id)).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                user_data['id'] = user_doc.id
                return user_data
    return None

def delete_session(token: str) -> bool:
    doc_ref = db.collection('sessions').document(token)
    if doc_ref.get().exists:
        doc_ref.delete()
        return True
    return False

# ----------------- Chart Queries -----------------

def save_user_chart(
    user_id: str,
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
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # We might need the user email to save directly for easier viewing
    user_doc = db.collection('users').document(str(user_id)).get()
    user_email = ""
    if user_doc.exists:
        user_email = user_doc.to_dict().get('email', '')

    chart_doc = {
        'user_id': str(user_id),
        'user_email': user_email,
        'chart_code': chart_code,
        'ho_ten': ho_ten,
        'gioi_tinh': gioi_tinh,
        'ngay_sinh': ngay_sinh,
        'thang_sinh': thang_sinh,
        'nam_sinh': nam_sinh,
        'gio_sinh': gio_sinh,
        'phut_sinh': phut_sinh,
        'loai_lich': loai_lich,
        'thang_nhuan': thang_nhuan,
        'nam_xem_han': nam_xem_han,
        'input_data': input_data if isinstance(input_data, dict) else json.loads(input_data),
        'chart_data': chart_data if isinstance(chart_data, dict) else json.loads(chart_data),
        'created_at': now_str,
        'updated_at': now_str
    }
    
    # Reuse a matching chart only when it belongs to this user. Chart codes
    # can collide, so matching globally could overwrite another user's record.
    charts_ref = db.collection('user_charts')
    query = charts_ref.where(filter=firestore.FieldFilter('chart_code', '==', chart_code)).get()
    existing_chart = next((doc for doc in query if str(doc.to_dict().get('user_id')) == str(user_id)), None)
    
    if existing_chart:
        doc_id = existing_chart.id
        chart_doc.pop('created_at', None) # Don't update created_at
        charts_ref.document(doc_id).update(chart_doc)
        chart_id = doc_id
    else:
        # Try to find by user_id to just overwrite latest, or just create new
        doc_ref = charts_ref.document()
        doc_ref.set(chart_doc)
        chart_id = doc_ref.id

    return {
        "id": chart_id,
        "chart_code": chart_code,
        "ho_ten": ho_ten,
        "updated_at": now_str
    }

def get_latest_user_chart(user_id: str) -> Optional[Dict[str, Any]]:
    charts_ref = db.collection('user_charts')
    query = (charts_ref
             .where(filter=firestore.FieldFilter('user_id', '==', str(user_id)))
             .order_by('updated_at', direction=firestore.Query.DESCENDING)
             .limit(1)
             .get())
    
    if query:
        doc = query[0]
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

def get_user_charts_list(user_id: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
    charts_ref = db.collection('user_charts')
    query = (charts_ref
             .where(filter=firestore.FieldFilter('user_id', '==', str(user_id)))
             .order_by('updated_at', direction=firestore.Query.DESCENDING)
             .limit(limit)
             .offset(offset)
             .get())
             
    results = []
    for doc in query:
        data = doc.to_dict()
        data['id'] = doc.id
        # Remove massive payload for list view
        data.pop('input_data', None)
        data.pop('chart_data', None)
        results.append(data)
    return results

# ----------------- Admin Queries -----------------
# Implementations for admin queries if needed, kept simple for now

def admin_get_users(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    query = db.collection('users').order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit).offset(offset).get()
    all_users = db.collection('users').get()
    users_by_id = {doc.id: doc.to_dict() for doc in all_users}
    referral_counts = {}
    for user in users_by_id.values():
        referrer_id = user.get('referred_by_user_id')
        if referrer_id:
            referral_counts[str(referrer_id)] = referral_counts.get(str(referrer_id), 0) + 1
    results = []
    for doc in query:
        data = doc.to_dict()
        data['id'] = doc.id
        data.setdefault('account_type', 'admin' if data.get('role') == 'manager' else 'user')
        data.setdefault('admin_level', 2 if data.get('role') == 'manager' else 0)
        if str(data.get('email', '')).lower() in SUPER_ADMIN_EMAILS:
            data.update({'role': 'manager', 'account_type': 'admin', 'admin_level': 1})
        referrer = users_by_id.get(str(data.get('referred_by_user_id')))
        data['referrer_name'] = referrer.get('name') if referrer else None
        data['referrer_email'] = referrer.get('email') if referrer else None
        data['referred_users'] = referral_counts.get(doc.id, 0)
        results.append(data)
    return results


def admin_get_user_detail(user_id: str) -> Optional[Dict[str, Any]]:
    user_doc = db.collection('users').document(str(user_id)).get()
    if not user_doc.exists:
        return None
    user = user_doc.to_dict()
    user['id'] = user_doc.id
    user.setdefault('account_type', 'admin' if user.get('role') == 'manager' else 'user')
    user.setdefault('admin_level', 2 if user.get('role') == 'manager' else 0)
    if str(user.get('email', '')).lower() in SUPER_ADMIN_EMAILS:
        user.update({'role': 'manager', 'account_type': 'admin', 'admin_level': 1})
    referrer_id = user.get('referred_by_user_id')
    if referrer_id:
        referrer_doc = db.collection('users').document(str(referrer_id)).get()
        if referrer_doc.exists:
            referrer = referrer_doc.to_dict()
            user['referrer_name'] = referrer.get('name')
            user['referrer_email'] = referrer.get('email')
            user['referrer_code'] = referrer.get('referral_code')
    user['referred_users'] = len(db.collection('users').where(filter=firestore.FieldFilter('referred_by_user_id', '==', str(user_id))).get())
    charts = (db.collection('user_charts')
              .where(filter=firestore.FieldFilter('user_id', '==', str(user_id)))
              .order_by('updated_at', direction=firestore.Query.DESCENDING)
              .limit(200).get())
    user['services'] = []
    for chart in charts:
        item = chart.to_dict()
        item['id'] = chart.id
        item.pop('input_data', None)
        item.pop('chart_data', None)
        user['services'].append(item)
    return user


def admin_create_user(email: str, name: str, account_type: str = 'user') -> Dict[str, Any]:
    users_ref = db.collection('users')
    if users_ref.where(filter=firestore.FieldFilter('email', '==', email)).limit(1).get():
        raise ValueError('Email này đã tồn tại.')
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    user = {
        'google_id': f"pending:{secrets.token_urlsafe(18)}", 'email': email, 'name': name, 'avatar': None,
        'role': 'manager' if account_type == 'admin' else 'user', 'account_type': account_type,
        'admin_level': 2 if account_type == 'admin' else 0,
        'referral_code': secrets.token_urlsafe(7).replace('-', '').replace('_', '').upper()[:9] if account_type == 'collaborator' else None,
        'referred_by_user_id': None, 'created_at': now, 'last_login_at': now,
    }
    doc = users_ref.document()
    doc.set(user)
    user['id'] = doc.id
    return user


def admin_update_user(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    ref = db.collection('users').document(str(user_id))
    doc = ref.get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    patch = {key: value for key, value in updates.items() if key in {'name', 'account_type', 'admin_level', 'referred_by_user_id'}}
    if patch.get('referred_by_user_id'):
        referrer = db.collection('users').document(str(patch['referred_by_user_id'])).get()
        if not referrer.exists or referrer.to_dict().get('account_type') != 'collaborator' or str(patch['referred_by_user_id']) == str(user_id):
            raise ValueError('Người giới thiệu phải là một tài khoản cộng tác viên khác.')
    if patch.get('account_type') == 'admin':
        patch['role'] = 'manager'
        patch['admin_level'] = patch.get('admin_level') or data.get('admin_level') or 2
    elif patch.get('account_type') in ('user', 'collaborator'):
        patch['role'] = 'user'
        patch['admin_level'] = 0
    if patch.get('account_type') == 'collaborator' and not data.get('referral_code'):
        patch['referral_code'] = secrets.token_urlsafe(7).replace('-', '').replace('_', '').upper()[:9]
    if patch:
        ref.update(patch)
        data.update(patch)
    data['id'] = doc.id
    return data


def admin_delete_user(user_id: str) -> bool:
    user_ref = db.collection('users').document(str(user_id))
    if not user_ref.get().exists:
        return False
    for referred in db.collection('users').where(filter=firestore.FieldFilter('referred_by_user_id', '==', str(user_id))).get():
        referred.reference.update({'referred_by_user_id': None})
    for collection in ('sessions', 'user_charts'):
        for doc in db.collection(collection).where(filter=firestore.FieldFilter('user_id', '==', str(user_id))).get():
            doc.reference.delete()
    user_ref.delete()
    return True

def admin_get_charts(limit: int = 50, offset: int = 0, search: Optional[str] = None) -> List[Dict[str, Any]]:
    query = db.collection('user_charts').order_by('updated_at', direction=firestore.Query.DESCENDING).limit(limit).offset(offset).get()
    results = []
    for doc in query:
        data = doc.to_dict()
        data['id'] = doc.id
        data.pop('input_data', None)
        data.pop('chart_data', None)
        results.append(data)
    return results

def admin_get_stats() -> Dict[str, Any]:
    # Firestore doesn't have COUNT() easily without scanning or using aggregation queries.
    # Using simple approach (might be slow for large datasets, but okay for this scope)
    users_count = db.collection('users').count().get()[0][0].value
    managers_count = db.collection('users').where(filter=firestore.FieldFilter('role', '==', 'manager')).count().get()[0][0].value
    charts_count = db.collection('user_charts').count().get()[0][0].value
    sessions_count = db.collection('sessions').count().get()[0][0].value
    
    return {
        "total_users": users_count,
        "total_managers": managers_count,
        "total_charts": charts_count,
        "active_sessions": sessions_count
    }
