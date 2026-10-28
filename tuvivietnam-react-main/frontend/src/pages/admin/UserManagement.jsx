import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Copy, Mail, RefreshCw, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import './UserManagement.css';

const ROLE_LABELS = { user: 'Người dùng', collaborator: 'Cộng tác viên', admin: 'Admin' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', account_type: 'user' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);
  const token = localStorage.getItem('tuvi_token') || '';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('tuvi_token') || ''}` };
      const [meResponse, firstUsersResponse] = await Promise.all([
        fetch('/api/auth/me', { headers }),
        fetch('/api/admin/users?limit=200&offset=0', { headers }),
      ]);
      const me = await meResponse.json().catch(() => ({}));
      const firstPage = await firstUsersResponse.json().catch(() => ({}));
      if (!meResponse.ok || !firstUsersResponse.ok) throw new Error(firstPage.message || me.message || 'Bạn không có quyền quản lý người dùng.');
      const allUsers = firstPage.data || [];
      for (let offset = allUsers.length; allUsers.length > 0 && allUsers.length % 200 === 0; offset += 200) {
        const response = await fetch(`/api/admin/users?limit=200&offset=${offset}`, { headers });
        const page = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(page.message || 'Không tải được danh sách người dùng.');
        allUsers.push(...(page.data || []));
        if ((page.data || []).length < 200) break;
      }
      setCurrentUser({ ...me.user, account_type: me.user.account_type || (me.user.role === 'manager' ? 'admin' : 'user'), admin_level: me.user.admin_level || (me.user.role === 'manager' ? 2 : 0) });
      setUsers(allUsers);
    } catch (loadError) {
      setError(loadError.message || 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return query ? users.filter((user) => [user.name, user.email, user.referral_code].some((value) => String(value || '').toLocaleLowerCase('vi').includes(query))) : users;
  }, [users, search]);

  const createUser = async (event) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không thể thêm người dùng.');
      setForm({ name: '', email: '', account_type: 'user' });
      setNotice('Đã tạo hồ sơ. Người dùng sẽ liên kết tài khoản khi đăng nhập bằng Google với email này.');
      await loadUsers();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  };

  const updateUser = async (user, changes) => {
    setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không thể cập nhật người dùng.');
      setUsers((items) => items.map((item) => String(item.id) === String(user.id) ? result.data : item));
      setNotice('Đã lưu thay đổi.');
    } catch (saveError) { setError(saveError.message); }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Xóa hồ sơ của ${user.name || user.email}?`)) return;
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không thể xóa người dùng.');
      setUsers((items) => items.filter((item) => String(item.id) !== String(user.id)));
    } catch (deleteError) { setError(deleteError.message); }
  };

  const openUserDetail = async (user) => {
    setSelectedUser(user);
    setUserDetail(null);
    setReferralLinkCopied(false);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được thông tin người dùng.');
      setUserDetail(result.data);
    } catch (detailError) {
      setUserDetail({ error: detailError.message });
    } finally {
      setDetailLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!userDetail?.referral_code) return;
    const link = `${window.location.origin}/?ref=${encodeURIComponent(userDetail.referral_code)}`;
    try {
      await navigator.clipboard.writeText(link);
      setReferralLinkCopied(true);
    } catch {
      setError('Không thể sao chép liên kết. Hãy sao chép liên kết hiển thị trong popup.');
    }
  };

  return (
    <main className="user-management-page">
      <header className="user-management-header">
        <div><Link to="/quan-ly" className="user-management-back"><ArrowLeft size={16} /> Khu vực quản trị</Link><span className="user-management-eyebrow"><Users size={15} /> TÀI KHOẢN</span><h1>Quản lý người dùng</h1><p>Phân loại user, cộng tác viên và quản trị viên; theo dõi liên kết giới thiệu.</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Link className="user-management-refresh" to="/quan-ly/bai-viet">Quản lý bài viết</Link><button type="button" className="user-management-refresh" onClick={loadUsers} disabled={loading}><RefreshCw size={16} /> Làm mới</button></div>
      </header>

      {error && <p className="user-management-message error" role="alert">{error}</p>}
      {notice && <p className="user-management-message success" role="status">{notice}</p>}

      {currentUser?.account_type === 'admin' && <form className="user-management-create" onSubmit={createUser}>
        <div className="user-management-section-heading"><div><UserPlus size={17} /><h2>Thêm hồ sơ</h2></div><span>Đăng nhập Google sẽ liên kết theo email</span></div>
        <div className="user-management-create-fields"><label>Họ tên<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Email Google<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Loại tài khoản<select value={form.account_type} onChange={(event) => setForm({ ...form, account_type: event.target.value })}><option value="user">Người dùng</option><option value="collaborator">Cộng tác viên</option>{currentUser?.admin_level === 1 && <option value="admin">Admin cấp 2</option>}</select></label><button type="submit" disabled={saving}>{saving ? 'Đang thêm…' : 'Thêm người dùng'}</button></div>
      </form>}

      <section className="user-management-list">
        <div className="user-management-list-heading"><div><h2>Danh sách tài khoản</h2><span>{users.length} hồ sơ</span></div><label className="user-management-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, mã giới thiệu" /></label></div>
        {loading ? <p className="user-management-empty">Đang tải danh sách…</p> : filteredUsers.length === 0 ? <p className="user-management-empty">Không tìm thấy tài khoản phù hợp.</p> : <div className="user-management-table-wrap"><table><thead><tr><th>Người dùng</th><th>Loại</th><th>Giới thiệu</th><th>Mã cộng tác viên</th><th>Thao tác</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}>
          <td><button type="button" className="user-management-detail-trigger" onClick={() => openUserDetail(user)}>{user.name || user.email}</button><input aria-label={`Tên ${user.email}`} defaultValue={user.name || ''} onBlur={(event) => { if (event.target.value.trim() && event.target.value.trim() !== user.name) updateUser(user, { name: event.target.value.trim() }); }} style={{ width: '100%', maxWidth: 220, border: 0, borderBottom: '1px solid #eee4d7', padding: '4px 0', background: 'transparent', font: '600 12px inherit', color: 'inherit' }} /><small>{user.email}</small></td>
          <td><select aria-label={`Vai trò ${user.email}`} value={user.account_type || (user.role === 'manager' ? 'admin' : 'user')} disabled={user.account_type === 'admin' && currentUser?.admin_level !== 1} onChange={(event) => updateUser(user, { account_type: event.target.value })}><option value="user">{ROLE_LABELS.user}</option><option value="collaborator">{ROLE_LABELS.collaborator}</option>{(currentUser?.admin_level === 1 || user.account_type === 'admin') && <option value="admin">Admin</option>}</select>{user.account_type === 'admin' && <small>Admin {user.admin_level || 2}</small>}</td>
          <td>{user.referred_by_user_id ? <><strong>{user.referrer_name || 'Cộng tác viên'}</strong><small>{user.referrer_email}</small></> : <span className="user-management-muted">Không có</span>}</td>
          <td>{user.account_type === 'collaborator' ? <><code>{user.referral_code || '—'}</code>{user.referral_code && <small><a href={`/?ref=${encodeURIComponent(user.referral_code)}`}>Mở liên kết giới thiệu</a></small>}<small>{user.referred_users || 0} người được giới thiệu</small></> : <span className="user-management-muted">—</span>}</td>
          <td className="user-management-actions">{user.account_type === 'admin' && currentUser?.admin_level === 1 && <select aria-label={`Cấp admin ${user.email}`} value={user.admin_level || 2} onChange={(event) => updateUser(user, { account_type: 'admin', admin_level: Number(event.target.value) })}><option value="1">Admin 1</option><option value="2">Admin 2</option><option value="3">Admin 3</option></select>}<button type="button" aria-label={`Xóa ${user.email}`} onClick={() => deleteUser(user)}><Trash2 size={16} /></button></td>
        </tr>)}</tbody></table></div>}
      </section>
      <aside className="user-management-note">Admin 1 quản lý toàn hệ thống. Admin 2 và 3 cùng quản lý bài viết, người dùng. Tỷ lệ ưu đãi của mã cộng tác viên sẽ được cấu hình riêng.</aside>
      {selectedUser && <div className="user-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
        <section className="user-detail-modal" role="dialog" aria-modal="true" aria-labelledby="user-detail-title">
          <button type="button" className="user-detail-close" aria-label="Đóng" onClick={() => setSelectedUser(null)}><X size={20} /></button>
          <div className="user-detail-heading"><div className="user-detail-avatar">{(selectedUser.name || selectedUser.email || 'U').slice(0, 1).toUpperCase()}</div><div><span>HỒ SƠ NGƯỜI DÙNG</span><h2 id="user-detail-title">{selectedUser.name || 'Chưa có tên'}</h2><p><Mail size={14} /> {selectedUser.email}</p></div></div>
          {detailLoading ? <p className="user-detail-state">Đang tải thông tin…</p> : userDetail?.error ? <p className="user-detail-state error">{userDetail.error}</p> : userDetail && <>
            <div className="user-detail-facts"><div><span>Mã user</span><strong>{userDetail.id}</strong></div><div><span>Mã cộng tác viên gắn với user</span><strong>{userDetail.referrer_code || (userDetail.account_type === 'collaborator' ? userDetail.referral_code : '') || 'Không có'}</strong></div><div><span>Loại tài khoản</span><strong>{ROLE_LABELS[userDetail.account_type] || `Admin ${userDetail.admin_level || 2}`}</strong></div><div><span>Ngày tạo</span><strong>{userDetail.created_at ? new Date(userDetail.created_at).toLocaleDateString('vi-VN') : 'Chưa có dữ liệu'}</strong></div><div><span>Đăng nhập gần nhất</span><strong>{userDetail.last_login_at ? new Date(userDetail.last_login_at).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}</strong></div><div><span>Người được giới thiệu</span><strong>{userDetail.referred_users || 0}</strong></div><div><span>Người giới thiệu</span><strong>{userDetail.referrer_name || 'Không có'}{userDetail.referrer_email ? ` · ${userDetail.referrer_email}` : ''}</strong></div>{userDetail.referral_code && <div><span>Mã cộng tác viên</span><strong>{userDetail.referral_code}</strong></div>}</div>
            {userDetail.account_type === 'collaborator' && userDetail.referral_code && <div className="user-detail-referral"><span>Liên kết giới thiệu</span><div><a href={`/?ref=${encodeURIComponent(userDetail.referral_code)}`} target="_blank" rel="noreferrer">{`${window.location.origin}/?ref=${userDetail.referral_code}`}</a><button type="button" onClick={copyReferralLink}><Copy size={14} />{referralLinkCopied ? 'Đã sao chép' : 'Sao chép'}</button></div><small>Người mở liên kết và đăng nhập bằng Google sẽ được tạo tài khoản, gắn với cộng tác viên này.</small></div>}
            <div className="user-detail-services-heading"><h3>Lịch sử lập lá số tử vi và dịch vụ đã sử dụng</h3><span>{userDetail.services?.length || 0}</span></div>
            {userDetail.services?.length ? <ul className="user-detail-services">{userDetail.services.map((service) => <li key={service.id}><CalendarDays size={17} /><div><strong>Lập lá số tử vi{service.ho_ten ? ` · ${service.ho_ten}` : ''}</strong><span>{service.updated_at || service.created_at ? new Date(service.updated_at || service.created_at).toLocaleString('vi-VN') : 'Không rõ thời gian'}{service.chart_code ? ` · Mã ${service.chart_code}` : ''}</span></div></li>)}</ul> : <p className="user-detail-empty">Chưa ghi nhận dịch vụ nào đã lưu cho tài khoản này.</p>}
          </>}
        </section>
      </div>}
    </main>
  );
}

