import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, Clock3, Search, Users, X } from 'lucide-react';
import './CoursesPage.css';

// Add new course objects here (or replace this list with an API response later).
const COURSES = [
  {
    id: 'tu-vi-co-ban',
    title: 'Khóa học Tử Vi Cơ Bản',
    eyebrow: 'Lộ trình nhập môn',
    category: 'Tử Vi',
    status: 'Đang mở đăng ký',
    statusTone: 'open',
    format: '16 buổi · 8 tuần',
    startDate: '2026-11-08',
    displayDate: 'Khai giảng 08/11/2026',
    price: '2.000.000đ',
    oldPrice: '4.000.000đ',
    description: 'Từ nền tảng Âm Dương – Ngũ Hành đến tự lập lá số và nhận biết các vòng sao cơ bản.',
    image: '/khoa-hoc-tu-vi-co-ban.jpg',
    featured: true,
    lessons: ['Nguồn gốc Tử Vi & thuyết Âm Dương – Ngũ Hành', 'Lập Thiên Bàn, Địa Bàn và 12 cung', 'An 14 chính tinh & Ngũ Hành', 'Vòng Lộc Tồn, Tràng Sinh, Thái Tuế'],
  },
  {
    id: 'doc-la-so-thuc-hanh',
    title: 'Đọc Lá Số Thực Hành',
    eyebrow: 'Học qua tình huống thật',
    category: 'Tử Vi',
    status: 'Sắp mở',
    statusTone: 'soon',
    format: '12 buổi · học trực tuyến',
    startDate: '2026-12-05',
    displayDate: 'Dự kiến 05/12/2026',
    price: 'Đang cập nhật',
    description: 'Rèn cách luận giải mạch lạc qua nhiều lá số thực tế, phù hợp cho người đã nắm kiến thức nền.',
    image: '/BatQuai.png',
    lessons: ['Đọc tổng quan và xác định trọng tâm', 'Luận Mệnh – Thân và các cung chính', 'Kết nối đại vận, tiểu vận', 'Thực hành trình bày một bản luận'],
  },
  {
    id: 'ky-mon-don-giap',
    title: 'Kỳ Môn Độn Giáp Ứng Dụng',
    eyebrow: 'Ra mắt trong thời gian tới',
    category: 'Kỳ Môn',
    status: 'Sắp ra mắt',
    statusTone: 'new',
    format: '8 buổi · chuyên đề',
    startDate: '2027-01-10',
    displayDate: 'Dự kiến 10/01/2027',
    price: 'Đang cập nhật',
    description: 'Làm quen với tư duy Kỳ Môn và cách ứng dụng trong lựa chọn thời điểm, phương hướng.',
    image: '/qimen/van-hon.webp',
    lessons: ['Cấu trúc một bàn Kỳ Môn', 'Thiên Can, Cửu Tinh, Bát Môn', 'Chọn dụng thần và đọc thông tin', 'Bài tập ứng dụng theo câu hỏi'],
  },
];

const CATEGORIES = ['Tất cả', 'Tử Vi', 'Kỳ Môn'];

function CoursesPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [sort, setSort] = useState('newest');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return COURSES
      .filter((course) => category === 'Tất cả' || course.category === category)
      .filter((course) => !normalizedQuery || `${course.title} ${course.description}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'vi') : new Date(a.startDate) - new Date(b.startDate));
  }, [category, query, sort]);

  const featuredCourse = COURSES.find((course) => course.featured);

  return (
    <div className="courses-page">
      <section className="featured-course" aria-label="Khóa học nổi bật">
        <div className="featured-course-image"><img src="/khoa-hoc-tu-vi-co-ban-ngang.png" alt="Poster ngang khóa học Tử Vi Cơ Bản" /></div>
        <div className="featured-course-content">
          <div className="course-label-row"><span className="course-label">Nổi bật tháng này</span><span className="course-status open">{featuredCourse.status}</span></div>
          <h2>{featuredCourse.title}</h2>
          <p className="featured-description">{featuredCourse.description}</p>
          <div className="course-facts"><span><CalendarDays size={17} /> {featuredCourse.displayDate}</span><span><Clock3 size={17} /> {featuredCourse.format}</span><span><Users size={17} /> Nhóm học nhỏ</span></div>
          <div className="featured-bottom"><div><span className="old-price">{featuredCourse.oldPrice}</span><strong>{featuredCourse.price}</strong></div><button className="course-dark-btn" onClick={() => setSelectedCourse(featuredCourse)}>Xem chi tiết <ArrowRight size={16} /></button></div>
        </div>
      </section>

      <section className="course-catalog" id="course-list">
        <div className="catalog-heading"><div><span className="section-eyebrow">Lộ trình đang mở</span><h2>Tìm khóa học phù hợp với bạn</h2></div><span className="catalog-count">{filteredCourses.length} khóa học</span></div>
        <div className="course-toolbar">
          <label className="course-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên khóa học..." /></label>
          <div className="category-tabs">{CATEGORIES.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sắp xếp khóa học"><option value="newest">Khai giảng gần nhất</option><option value="name">Tên A–Z</option></select>
        </div>
        <div className="course-grid">
          {filteredCourses.map((course) => <article className="course-card" key={course.id} onClick={() => setSelectedCourse(course)}>
            <div className="course-card-image"><img src={course.image} alt="" /><span className={`course-status ${course.statusTone}`}>{course.status}</span></div>
            <div className="course-card-body"><span className="card-category">{course.category} · {course.eyebrow}</span><h3>{course.title}</h3><p>{course.description}</p><div className="card-meta"><span><Clock3 size={15} /> {course.format}</span><span className="card-arrow"><ArrowRight size={17} /></span></div></div>
          </article>)}
        </div>
        {filteredCourses.length === 0 && <div className="empty-courses"><BookOpen size={28} /><p>Chưa tìm thấy khóa học phù hợp.</p></div>}
      </section>

      <section className="update-banner"><div><span className="section-eyebrow">Luôn được cập nhật</span><h2>Khóa học mới sẽ xuất hiện tại đây</h2><p>Nội dung và lịch khai giảng được bổ sung theo thời gian phát sinh. Hãy quay lại thường xuyên để không bỏ lỡ lộ trình mới.</p></div><a href="tel:0385497085" className="course-primary-btn">Nhận tư vấn <ArrowRight size={17} /></a></section>

      {selectedCourse && <div className="course-modal-backdrop" role="presentation" onClick={() => setSelectedCourse(null)}><div className="course-modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedCourse(null)} aria-label="Đóng"><X size={20} /></button><span className={`course-status ${selectedCourse.statusTone}`}>{selectedCourse.status}</span><span className="modal-category">{selectedCourse.category} · {selectedCourse.eyebrow}</span><h2 id="course-modal-title">{selectedCourse.title}</h2><p>{selectedCourse.description}</p><div className="modal-facts"><span><CalendarDays size={17} /> {selectedCourse.displayDate}</span><span><Clock3 size={17} /> {selectedCourse.format}</span></div><h3>Nội dung chính</h3><ul>{selectedCourse.lessons.map((lesson) => <li key={lesson}><Check size={16} /> {lesson}</li>)}</ul><a href="tel:0385497085" className="course-dark-btn modal-cta">Liên hệ đăng ký <ArrowRight size={16} /></a></div></div>}
    </div>
  );
}

export default CoursesPage;
