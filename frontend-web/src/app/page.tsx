'use client';
import { useEffect, useState } from 'react';

interface Deal {
  title: string;
  price: number;
  url: string;
  status: string;
}

interface DashboardData {
  keyword: string;
  average_price: number;
  min_price: number;
  max_price: number;
  available_items: Deal[];
  completed_items: Deal[];
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');

  useEffect(() => {
    const timestamp = new Date().getTime();
    fetch(`/daangn-price-dashboard/data.json?t=${timestamp}`)
      .then((res) => res.json())
      .then((jsonData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('에러:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}><h2>⏳ 데이터를 불러오는 중입니다...</h2></div>;
  if (!data) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}><h2>❌ 데이터를 찾을 수 없습니다.</h2></div>;

  const itemsToShow = activeTab === 'available' ? data.available_items : data.completed_items;

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🥕 당근시세 대시보드</h1>
      
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🔍 분석 키워드: {data.keyword}</h3>
        <p style={{ color: '#888', fontSize: '14px', margin: '-10px 0 15px 0' }}>* 시세 통계는 '거래가능' 매물 기준입니다.</p>
        <p><strong>적정 시세 (평균가):</strong> {data.average_price.toLocaleString()}원</p>
        <p><strong>발견된 최저가:</strong> {data.min_price.toLocaleString()}원</p>
        <p><strong>발견된 최고가:</strong> {data.max_price.toLocaleString()}원</p>
      </div>

      {/* 탭 버튼 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('available')}
          style={{
            flex: 1, padding: '15px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '8px',
            background: activeTab === 'available' ? '#ff6f0f' : '#ddd', 
            color: activeTab === 'available' ? '#fff' : '#333', cursor: 'pointer'
          }}
        >
          🟢 거래가능 Top 30
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          style={{
            flex: 1, padding: '15px', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '8px',
            background: activeTab === 'completed' ? '#333' : '#ddd', 
            color: activeTab === 'completed' ? '#fff' : '#333', cursor: 'pointer'
          }}
        >
          ⚫ 거래완료 Top 30
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {itemsToShow.map((deal, index) => (
          <li key={index} style={{ borderBottom: '1px solid #ddd', padding: '15px 0' }}>
            <a href={deal.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#333', fontSize: '18px', display: 'block' }}>
              <span style={{ color: activeTab === 'available' ? '#ff6f0f' : '#888', marginRight: '8px', fontWeight: 'bold' }}>{index + 1}위</span>
              {deal.title}
            </a>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
              {deal.price.toLocaleString()}원
            </p>
          </li>
        ))}
        {itemsToShow.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>해당 조건의 매물이 없습니다.</p>}
      </ul>
    </main>
  );
}
