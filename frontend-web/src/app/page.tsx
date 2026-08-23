'use client';

import { useEffect, useState } from 'react';

// 데이터의 형태(타입)를 정의합니다.
interface HotDeal {
  title: string;
  price: number;
  link: string;
  discount_gap: number;
}

interface DashboardData {
  keyword: string;
  average_price: number;
  min_price: number;
  max_price: number;
  hot_deals: HotDeal[];
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // GitHub Pages 주소에 맞게 설정 (basePath)
    // 크롤러가 저장한 data.json 파일을 불러옵니다.
    fetch('/daangn-price-dashboard/data.json')
      .then((res) => res.json())
      .then((jsonData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('데이터를 불러오는 중 에러 발생:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>⏳ 데이터를 불러오는 중입니다...</h2>
        <p>파이썬 크롤러가 데이터를 수집 중이거나 연동을 기다리고 있습니다.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>❌ 데이터를 찾을 수 없습니다.</h2>
        <p>크롤러가 정상적으로 data.json 파일을 생성했는지 확인해주세요.</p>
      </div>
    );
  }

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🥕 당근시세 대시보드</h1>
      <p style={{ color: '#ff6f0f', fontWeight: 'bold' }}>거품 없는 진짜 중고 시세</p>
      
      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>🔍 분석 키워드: {data.keyword}</h3>
        <p><strong>적정 시세 (평균가):</strong> {data.average_price.toLocaleString()}원</p>
        <p><strong>발견된 최저가:</strong> {data.min_price.toLocaleString()}원</p>
        <p><strong>발견된 최고가:</strong> {data.max_price.toLocaleString()}원</p>
      </div>

      <h2>🔥 실시간 최저가 꿀매물</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {data.hot_deals.map((deal, index) => (
          <li key={index} style={{ borderBottom: '1px solid #ddd', padding: '10px 0' }}>
            <a href={deal.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#333', fontSize: '18px', display: 'block' }}>
              <span style={{ color: '#ff6f0f', marginRight: '8px' }}>{index + 1}위</span>
              {deal.title}
            </a>
            <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold' }}>
              {deal.price.toLocaleString()}원 
              <span style={{ color: 'green', fontSize: '14px', marginLeft: '10px' }}>
                (적정 시세 대비 {deal.discount_gap.toLocaleString()}원 저렴 ↓)
              </span>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
