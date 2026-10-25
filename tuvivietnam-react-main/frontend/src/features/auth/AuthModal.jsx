import React, { useCallback, useEffect, useRef, useState } from 'react';
import './AuthModal.css';
import GoogleAvatar from '../../shared/ui/GoogleAvatar';

const API = import.meta.env.VITE_API_URL || '';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

function AuthModal({ open, onClose, user, onAuthSuccess, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [profileDetails, setProfileDetails] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!open || !user) return undefined;
    let active = true;
    setProfileDetails(null);
    setProfileError('');
    setProfileLoading(true);
    fetch(`${API}/api/auth/profile/details`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('tuvi_token') || ''}` },
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không tải được thông tin hồ sơ.');
      return result.data;
    }).then(async (data) => {
      const token = localStorage.getItem('tuvi_token') || '';
      let legacyServices = [];
      try {
        const logsResponse = await fetch(`${API}/api/auth/profile/chart-logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (logsResponse.ok) {
          const logsResult = await logsResponse.json().catch(() => ({}));
          legacyServices = Array.isArray(logsResult.data) ? logsResult.data : [];
        }
      } catch (logsError) {
        console.warn('Could not load legacy chart history:', logsError);
      }

      const savedServices = Array.isArray(data.services) ? data.services : [];
      const knownCodes = new Set(savedServices.map((service) => service.chart_code).filter(Boolean));
      const services = [
        ...savedServices,
        ...legacyServices.filter((service) => !service.chart_code || !knownCodes.has(service.chart_code)),
      ].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
      if (active) setProfileDetails({ ...data, services });
    }).catch((loadError) => {
      if (active) setProfileError(loadError.message || 'Không tải được thông tin hồ sơ.');
    }).finally(() => {
      if (active) setProfileLoading(false);
    });
    return () => { active = false; };
  }, [open, user?.id, user?.email]);

  const handleGoogleCredentialResponse = useCallback(async (response) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
          referral_code: localStorage.getItem('tuvi_referral_code') || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Xác thực Google thất bại.');
      if (!data.token || !data.user) throw new Error('Máy chủ trả về dữ liệu đăng nhập không hợp lệ.');

      // Primary auth is already successful. Save the session before attempting this optional sync.
      localStorage.setItem('tuvi_token', data.token);
      localStorage.setItem('tuvi_user', JSON.stringify(data.user));
      localStorage.removeItem('tuvi_referral_code');
      window.dispatchEvent(new Event('tuvi-auth-updated'));
      onAuthSuccess?.(data.user);
      onClose?.();

      fetch('/api/auth/customer-accounts/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.token}` },
      }).then((syncResponse) => {
        if (!syncResponse.ok) console.warn('Customer account sync failed:', syncResponse.status);
      }).catch((syncError) => console.warn('Customer account sync unavailable:', syncError));
    } catch (err) {
      setError(err.message || 'Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  }, [onAuthSuccess, onClose]);

  useEffect(() => {
    if (!open || user) {
      setGoogleReady(false);
      return undefined;
    }

    setError('');
    setGoogleReady(false);
    if (!GOOGLE_CLIENT_ID) {
      setError('Thiếu cấu hình đăng nhập Google. Hãy thêm VITE_GOOGLE_CLIENT_ID vào frontend/.env.local rồi khởi động lại ứng dụng.');
      return undefined;
    }

    let cancelled = false;
    let attempts = 0;
    let timer;

    const initializeGoogle = () => {
      if (cancelled) return;
      const googleId = window.google?.accounts?.id;
      if (googleId && googleBtnRef.current) {
        try {
          googleId.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredentialResponse });
          googleBtnRef.current.replaceChildren();
          googleId.renderButton(googleBtnRef.current, {
            theme: 'filled_blue', size: 'large', width: 300,
            text: 'signin_with', shape: 'rectangular', logo_alignment: 'left',
          });
          setGoogleReady(true);
        } catch (initError) {
          console.warn('Google Sign-In initialization failed:', initError);
          setError('Không thể khởi tạo đăng nhập Google. Vui lòng tải lại trang.');
        }
        return;
      }

      attempts += 1;
      if (attempts < 100) timer = window.setTimeout(initializeGoogle, 100);
      else setError('Không tải được dịch vụ Google Sign-In. Vui lòng kiểm tra kết nối rồi tải lại trang.');
    };

    initializeGoogle();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, user, handleGoogleCredentialResponse]);

  if (!open) return null;

  const handleLogout = () => {
    onLogout?.();
    onClose?.();
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} type="button" title="Đóng">×</button>

        {user ? (
          <div className="auth-logged-in-box">
            <div className="auth-user-card">
              <GoogleAvatar
                src={user.avatar}
                name={user.name}
                className="auth-user-avatar-lg"
                fallbackClassName="auth-user-avatar-lg default auth-user-avatar-initials"
              />
              <div className="auth-user-name">{user.name}</div>
              <div className="auth-user-email">{user.email}</div>
              {profileLoading && <div className="auth-profile-state">Đang tải thông tin hồ sơ…</div>}
              {profileError && <div className="auth-profile-state error" role="alert">{profileError}</div>}
              {profileDetails && <div className="auth-profile-details">
                <div className="auth-profile-facts">
                  <div><span>Mã user</span><strong>{profileDetails.id}</strong></div>
                  <div><span>Mã cộng tác viên gắn với tài khoản</span><strong>{profileDetails.referrer_code || (profileDetails.account_type === 'collaborator' ? profileDetails.referral_code : '') || 'Không có'}</strong></div>
                </div>
                <section className="auth-profile-history">
                  <header><strong>Lịch sử lập lá số tử vi</strong><span>{profileDetails.services?.length || 0}</span></header>
                  {profileDetails.services?.length ? <ul>{profileDetails.services.map((chart) => <li key={chart.id}>
                    <strong>{chart.ho_ten || 'Lá số đã lập'}</strong>
                    <span>{chart.chart_code || 'Chưa có mã lá số'} · {new Date(chart.updated_at || chart.created_at).toLocaleDateString('vi-VN')}</span>
                  </li>)}</ul> : <p>Chưa có lá số nào được lưu.</p>}
                </section>
                <div className="auth-profile-service-summary"><span>Dịch vụ đã sử dụng</span><strong>Lập lá số tử vi: {profileDetails.services?.length || 0} lần</strong></div>
              </div>}
              {user.account_type === 'collaborator' && user.referral_code && <div className="auth-referral-card"><span>Mã giới thiệu của bạn</span><strong>{user.referral_code}</strong><a href={`/?ref=${encodeURIComponent(user.referral_code)}`}>{window.location.origin}/?ref={user.referral_code}</a></div>}
            </div>
            <button type="button" className="btn-auth-logout" onClick={handleLogout}>ĐĂNG XUẤT</button>
          </div>
        ) : (
          <div className="auth-signin-box">
            <p className="auth-single-instruction">Đăng nhập để lưu trữ<br />và quản lý các lá số của bạn</p>
            {error && <div className="auth-error" role="alert">{error}</div>}
            {!googleReady && !error && <div className="auth-google-loading">Đang kết nối Google…</div>}
            <div className="google-btn-wrapper" ref={googleBtnRef}></div>
          </div>
        )}

        {loading && (
          <div className="auth-loading-overlay">
            <div className="spinner-small"></div>
            <span>Đang xử lý...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
