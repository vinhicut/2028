import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';

import Navbar from '../shared/ui/Navbar';
import Footer from '../shared/ui/Footer';
import Home from '../pages/Home';
import LaSoTuVi from '../features/la-so-tu-vi/LaSoTuVi';
import CategoryPage from '../features/bai-viet/CategoryPage';
import BoiKieu from '../features/tarot-kieu/BoiKieu';
import LichVanSu from '../features/lich-van-su/LichVanSu';
import KhamThienTuViThienTuong from '../features/bai-viet/KhamThienTuViThienTuong';
import QuickInsights from '../shared/ui/QuickInsights';
import UnderDevelopment from '../shared/ui/UnderDevelopment';
import KhamThienGiamThaiDuong from '../features/bai-viet/KhamThienGiamThaiDuong';
import CuMon from '../features/bai-viet/CuMon';
import ThienLuong from '../features/bai-viet/ThienLuong';
import ThatSat from '../features/bai-viet/ThatSat';
import PhaQuan from '../features/bai-viet/PhaQuan';
import { PhongThuyWidget } from '../features/phong-thuy/PhongThuyWidget';
import QimenArticles from '../features/ky-mon/QimenPage';
import QuanLy from '../pages/admin/QuanLy';
import ChatWidget from '../shared/ui/ChatWidget';
import ArticleManager from '../pages/admin/ArticleManager';
import PhatPhapPage from '../features/phat-phap/PhatPhapPage';
import UserManagement from '../pages/admin/UserManagement';
import CoursesPage from '../pages/courses/CoursesPage';
import CourseArticlePage from '../pages/courses/CourseArticlePage';
function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    const sendActivity = () => {
      const token = localStorage.getItem('tuvi_token');
      if (!token) return;
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    };
    sendActivity();
    const interval = window.setInterval(sendActivity, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const referralCode = new URLSearchParams(window.location.search).get('ref');
    if (referralCode) localStorage.setItem('tuvi_referral_code', referralCode.trim().toUpperCase());
  }, []);

  if (pathname === '/' || pathname === '/home') {
    return <><Home /><ChatWidget /></>;
  }

  return (
    <div className="app">
      <Navbar />

      <main className="main-content">
        <Routes>
          <Route path="/quan-ly" element={<QuanLy />} />
          <Route path="/quan-ly/nguoi-dung" element={<UserManagement />} />
          <Route path="/quan-ly/bai-viet" element={<ArticleManager />} />
          <Route path="/quan-ly/khoa-hoc" element={<ArticleManager defaultCategory="Khóa học" />} />
          <Route path="/phat-phap" element={<PhatPhapPage />} />
          <Route path="/phat-phap/:slug" element={<PhatPhapPage />} />
          <Route
            path="/la-so-tu-vi"
            element={
              <div className="home-content-flow">
                <LaSoTuVi />
                <QuickInsights />
              </div>
            }
          />
          <Route path="/lich-van-su" element={<LichVanSu />} />
          <Route path="/boi-kieu" element={<BoiKieu />} />
          <Route path="/la-kinh-phong-thuy" element={<PhongThuyWidget />} />
          <Route path="/chuyen-muc" element={<CategoryPage />} />
          <Route path="/chuyen-muc/thien-tuong" element={<KhamThienTuViThienTuong />} />
          <Route path="/chuyen-muc/thien-giam-thai-duong" element={<KhamThienGiamThaiDuong />} />
          <Route path="/chuyen-muc/cu-mon" element={<CuMon />} />
          <Route path="/chuyen-muc/thien-luong" element={<ThienLuong />} />
          <Route path="/chuyen-muc/that-sat" element={<ThatSat />} />
          <Route path="/chuyen-muc/pha-quan" element={<PhaQuan />} />

          {/* Các phân hệ đang trong quá trình phát triển UI&UX */}
          <Route path="/lien-he" element={<UnderDevelopment />} />
          <Route path="/dien-dan" element={<UnderDevelopment />} />
          <Route path="/khoa-hoc" element={<CoursesPage />} />
          <Route path="/khoa-hoc/bai-viet/:slug" element={<CourseArticlePage />} />
          <Route path="/cua-hang" element={<UnderDevelopment />} />
          <Route path="/ky-mon" element={<QimenArticles />} />
          <Route path="/ky-mon-don-giap" element={<QimenArticles />} />
          <Route path="/ky-mon-don-giap/:slug" element={<QimenArticles />} />
          <Route path="/than-so" element={<UnderDevelopment />} />
        </Routes>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}

export default App;
