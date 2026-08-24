'use client';
import { useEffect, useState } from 'react';

interface Deal {
  title: string;
  price: number;
  url: string;
  region?: string;
}

interface DashboardData {
  keyword: string;
  average_price: number;
  min_price: number;
  max_price: number;
  items?: Deal[];
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const itemsToShow = data.items || [];

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🥕 당근시세 대시보드</h1>
      
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🔍 분석 키워드: {data.keyword}</h3>
        <p><strong>적정 시세 (평균가):</strong> {data.average_price?.toLocaleString()}원</p>
        <p><strong>발견된 최저가:</strong> {data.min_price?.toLocaleString()}원</p>
        <p><strong>발견된 최고가:</strong> {data.max_price?.toLocaleString()}원</p>
      </div>

      <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>🔥 실시간 거래가능 매물 Top 30</h2>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {itemsToShow.map((deal, index) => (
          <li key={index} style={{ borderBottom: '1px solid #ddd', padding: '15px 0' }}>
            <a href={deal.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#333', fontSize: '18px', display: 'block' }}>
              <span style={{ color: '#ff6f0f', marginRight: '8px', fontWeight: 'bold' }}>{index + 1}위</span>
              {deal.title}
            </a>
            <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
              {deal.price?.toLocaleString()}원 
              {deal.region && <span style={{ color: '#666', fontSize: '14px', marginLeft: '10px', fontWeight: 'normal' }}>📍 {deal.region}</span>}
            </p>
          </li>
        ))}
        {itemsToShow.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>현재 조건에 맞는 매물이 없습니다.</p>}
      </ul>
    </main>
  );
}
