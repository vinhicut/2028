import React, { useEffect, useState } from 'react';
import './BoiKieu.css';

const questionDecks = [
  { id: 'can-tai-loc', title: 'NIÊN VẬN – QUẺ CÀN', question: 'Năm nay tốt hay xấu?' },
  { id: 'kham-cong-danh', title: 'CÔNG DANH – QUẺ KHẢM', question: 'Thăng tiến sớm hay muộn?' },
  { id: 'can-nien-van', title: 'TÀI LỘC – QUẺ CẤN', question: 'Tiền của dồi dào hay hao hụt?' },
  { id: 'chan-am-tin', title: 'ÂM TÍN – QUẺ CHẤN', question: 'Hỏi tin tức người ở xa' },
  { id: 'ton-tranh-tung', title: 'TRANH TỤNG – QUẺ TỐN', question: 'Kiện cáo, thị phi lợi hay hại?' },
  { id: 'ly-binh-an', title: 'BÌNH AN – QUẺ LY', question: 'Vận gia đình có được bình an?' },
  { id: 'khon-hon-nhan', title: 'HÔN NHÂN – QUẺ KHÔN', question: 'Vợ chồng tốt hay xấu?' },
  { id: 'doai-thuong-mai', title: 'BUÔN BÁN – QUẺ ĐOÀI', question: 'Buôn bán lỗ hay lãi?' },
  { id: 'giap-thien-di', title: 'THIÊN DI – QUẺ GIÁP', question: 'Thay đổi chỗ ở/chỗ làm tốt hay xấu?' },
  { id: 'at-tat-benh', title: 'TẬT BỆNH – QUẺ ẤT', question: 'Bệnh nặng hay nhẹ?' },
  { id: 'binh-khoa-do', title: 'KHOA ĐỖ – QUẺ BÍNH', question: 'Thi cử, thăng tiến được chăng?' },
  { id: 'dinh-tu-tuc', title: 'TỬ TỨC – QUẺ ĐINH', question: 'Đường con cái tốt hay xấu?' },
  { id: 'mau-xuat-hanh', title: 'XUẤT HÀNH – QUẺ MẬU', question: 'Ra đi có gặp may không?' },
  { id: 'ky-truy-tim', title: 'TRUY TÌM – QUẺ KỶ', question: 'Có tìm thấy vật thất lạc/mất không?' },
  { id: 'canh-uu-tu', title: 'ƯU TƯ – QUẺ CANH', question: 'Hỏi việc lành hay dữ?' },
  { id: 'tan-tham-yet', title: 'THÁM YẾT – QUẺ TÂN', question: 'Đi thăm hỏi, thăm viếng được không?' },
  { id: 'nham-ky-nghe', title: 'KỸ NGHỆ – QUẺ NHÂM', question: 'Nghề nghiệp lợi hay hại?' },
  { id: 'quy-tam-su', title: 'TÂM SỰ – QUẺ QUÝ', question: 'Tình riêng có toại ý hay không?' },
];

function BoiKieu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selectDeck = (deckId) => {
    setSelectedDeck(deckId);
    setMenuOpen(false);
  };

  return (
    <div className="boikieu-page">
      <nav className="boikieu-navigation" aria-label="Xin quẻ chi tiết từng việc">
        <ul className="boikieu-nav-menu">
          <li
            className="boikieu-nav-item has-dropdown"
            onMouseEnter={() => {
              if (window.matchMedia('(hover: hover)').matches) setMenuOpen(true);
            }}
            onMouseLeave={() => {
              if (window.matchMedia('(hover: hover)').matches) setMenuOpen(false);
            }}
          >
            <button type="button" aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              XIN QUẺ CHI TIẾT TỪNG VIỆC<span className="boikieu-caret">▾</span>
            </button>
            {menuOpen && <ul className="boikieu-dropdown" aria-label="Chọn việc muốn xin quẻ">
              {questionDecks.map((deck) => (
                <li key={deck.id}>
                  <button type="button" className="boikieu-deck-option" onClick={() => selectDeck(deck.id)}>
                    <strong>{deck.title}</strong><small>({deck.question})</small>
                  </button>
                </li>
              ))}
            </ul>}
          </li>
        </ul>
      </nav>
      <div className="boikieu-iframe-wrap">
        <iframe
          src={`/tarot-kieu/boi-que-kieu.html${selectedDeck ? `?deck=${selectedDeck}` : ''}`}
          title={questionDecks.find((deck) => deck.id === selectedDeck)?.title || 'Bói Quẻ Kiều'}
          className="boikieu-iframe"
        />
      </div>
    </div>
  );
}

export default BoiKieu;
