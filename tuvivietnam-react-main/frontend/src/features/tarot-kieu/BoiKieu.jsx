import React, { useEffect, useState } from 'react';
import './BoiKieu.css';

/**
 * Trang Bói Quẻ Kiều – nhúng HTML gốc (bánh xe + 210 quẻ)
 */
function BoiKieu() {
  const [chanTonOpen, setChanTonOpen] = useState(false);
  const [canKhamCanOpen, setCanKhamCanOpen] = useState(false);
  const [lyKhonDoaiOpen, setLyKhonDoaiOpen] = useState(false);
  const [atBinhDinhMauOpen, setAtBinhDinhMauOpen] = useState(false);
  const [kyCanhTanNhamQuyOpen, setKyCanhTanNhamQuyOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="boikieu-page">
      <nav className="boikieu-navigation" aria-label="Điều hướng tử vi">
        <ul className="boikieu-nav-menu">
          {[
            'Giáp Thiên Di',
            'Chấn Tốn',
            'Càn Khảm Cấn',
            'Ly Khôn Đoài',
            'Ất Bính Đinh Mậu',
            'Kỷ Canh Tân Nhâm Quỷ',
          ].map((item) => (
            <li
              className={`boikieu-nav-item${['Chấn Tốn', 'Càn Khảm Cấn', 'Ly Khôn Đoài', 'Ất Bính Đinh Mậu', 'Kỷ Canh Tân Nhâm Quỷ'].includes(item) ? ' has-dropdown' : ''}`}
              key={item}
              onMouseEnter={() => {
                if (item === 'Chấn Tốn') setChanTonOpen(true);
                if (item === 'Càn Khảm Cấn') setCanKhamCanOpen(true);
                if (item === 'Ly Khôn Đoài') setLyKhonDoaiOpen(true);
                if (item === 'Ất Bính Đinh Mậu') setAtBinhDinhMauOpen(true);
                if (item === 'Kỷ Canh Tân Nhâm Quỷ') setKyCanhTanNhamQuyOpen(true);
              }}
              onMouseLeave={() => {
                if (item === 'Chấn Tốn') setChanTonOpen(false);
                if (item === 'Càn Khảm Cấn') setCanKhamCanOpen(false);
                if (item === 'Ly Khôn Đoài') setLyKhonDoaiOpen(false);
                if (item === 'Ất Bính Đinh Mậu') setAtBinhDinhMauOpen(false);
                if (item === 'Kỷ Canh Tân Nhâm Quỷ') setKyCanhTanNhamQuyOpen(false);
              }}
            >
              <button
                type="button"
                aria-haspopup={['Chấn Tốn', 'Càn Khảm Cấn', 'Ly Khôn Đoài', 'Ất Bính Đinh Mậu', 'Kỷ Canh Tân Nhâm Quỷ'].includes(item) ? 'true' : undefined}
                aria-expanded={item === 'Chấn Tốn' ? chanTonOpen : item === 'Càn Khảm Cấn' ? canKhamCanOpen : item === 'Ly Khôn Đoài' ? lyKhonDoaiOpen : item === 'Ất Bính Đinh Mậu' ? atBinhDinhMauOpen : item === 'Kỷ Canh Tân Nhâm Quỷ' ? kyCanhTanNhamQuyOpen : undefined}
                onClick={item === 'Chấn Tốn'
                  ? () => setChanTonOpen((open) => !open)
                  : item === 'Càn Khảm Cấn'
                    ? () => setCanKhamCanOpen((open) => !open)
                    : item === 'Ly Khôn Đoài'
                      ? () => setLyKhonDoaiOpen((open) => !open)
                      : item === 'Ất Bính Đinh Mậu'
                        ? () => setAtBinhDinhMauOpen((open) => !open)
                        : item === 'Kỷ Canh Tân Nhâm Quỷ'
                          ? () => setKyCanhTanNhamQuyOpen((open) => !open)
                  : item === 'Giáp Thiên Di'
                    ? () => setSelectedDeck('giap-thien-di')
                    : undefined}
              >
                {item}{['Chấn Tốn', 'Càn Khảm Cấn', 'Ly Khôn Đoài', 'Ất Bính Đinh Mậu', 'Kỷ Canh Tân Nhâm Quỷ'].includes(item) && <span className="boikieu-caret">▾</span>}
              </button>
              {item === 'Chấn Tốn' && chanTonOpen && (
                <ul className="boikieu-dropdown">
                  <li><button type="button" onClick={() => { setSelectedDeck('chan-am-tin'); setChanTonOpen(false); }}>Chấn Âm Tín</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('ton-tranh-tung'); setChanTonOpen(false); }}>Tốn thanh trừng</button></li>
                </ul>
              )}
              {item === 'Càn Khảm Cấn' && canKhamCanOpen && (
                <ul className="boikieu-dropdown">
                  <li><button type="button" onClick={() => { setSelectedDeck('can-tai-loc'); setCanKhamCanOpen(false); }}>Càn Tài Lộc</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('kham-cong-danh'); setCanKhamCanOpen(false); }}>Khảm Công Danh</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('can-nien-van'); setCanKhamCanOpen(false); }}>Cấn Niên Vận</button></li>
                </ul>
              )}
              {item === 'Ly Khôn Đoài' && lyKhonDoaiOpen && (
                <ul className="boikieu-dropdown">
                  <li><button type="button" onClick={() => { setSelectedDeck('ly-binh-an'); setLyKhonDoaiOpen(false); }}>Ly Bình An</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('khon-hon-nhan'); setLyKhonDoaiOpen(false); }}>Khôn Hôn Nhân</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('doai-thuong-mai'); setLyKhonDoaiOpen(false); }}>Đoài Thương Mại</button></li>
                </ul>
              )}
              {item === 'Ất Bính Đinh Mậu' && atBinhDinhMauOpen && (
                <ul className="boikieu-dropdown">
                  <li><button type="button" onClick={() => { setSelectedDeck('at-tat-benh'); setAtBinhDinhMauOpen(false); }}>Ất Tật Bệnh</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('binh-khoa-do'); setAtBinhDinhMauOpen(false); }}>Bính Khoa Đỗ</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('dinh-tu-tuc'); setAtBinhDinhMauOpen(false); }}>Đinh Tử Tức</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('mau-xuat-hanh'); setAtBinhDinhMauOpen(false); }}>Mậu Xuất Hành</button></li>
                </ul>
              )}
              {item === 'Kỷ Canh Tân Nhâm Quỷ' && kyCanhTanNhamQuyOpen && (
                <ul className="boikieu-dropdown">
                  <li><button type="button" onClick={() => { setSelectedDeck('ky-truy-tim'); setKyCanhTanNhamQuyOpen(false); }}>Kỷ Truy Tìm</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('canh-uu-tu'); setKyCanhTanNhamQuyOpen(false); }}>Canh Ưu Tú</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('tan-tham-yet'); setKyCanhTanNhamQuyOpen(false); }}>Tân Thám Yết</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('nham-ky-nghe'); setKyCanhTanNhamQuyOpen(false); }}>Nhâm Kỹ Nghệ</button></li>
                  <li><button type="button" onClick={() => { setSelectedDeck('quy-tam-su'); setKyCanhTanNhamQuyOpen(false); }}>Quý Tâm Sự</button></li>
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="boikieu-iframe-wrap">
        <iframe
          src={`/tarot-kieu/boi-que-kieu.html${selectedDeck ? `?deck=${selectedDeck}` : ''}`}
          title={selectedDeck === 'giap-thien-di' ? 'Giáp Thiên Di' : 'Bói Quẻ Kiều'}
          className="boikieu-iframe"
        />
      </div>
    </div>
  );
}

export default BoiKieu;
