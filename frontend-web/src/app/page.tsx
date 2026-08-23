'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const formatPrice = (price) => price.toLocaleString() + '원';
const formatDiff = (diff) => `${Math.floor(diff / 10000)}만원`;

const fetchCSVData = async () => {
  // 🔴 나중에 이 주소를 본인의 GitHub 주소로 변경하시면 됩니다.
  const csvUrl = 'https://raw.githubusercontent.com/aquawind2016-debug/daangn-price-dashboard/main/backend-crawler/daangn_result.csv';
  
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`HTTP 오류: ${response.status}`);
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    const items = lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        id: values[0],
        title: values[1],
        price: parseInt(values[2], 10),
        region_raw: values[3],
        url: values[4],
        time_ago: '최근 업데이트', 
        region_1: values[3] ? values[3].split(' ')[0] : '',
        region_2: values[3] && values[3].split(' ').length > 1 ? values[3].split(' ')[1] : ''
      };
    }).filter(item => !isNaN(item.price)); 
    
    return items;
  } catch (error) {
    console.warn("실제 데이터를 불러오지 못해 임시 데이터를 보여줍니다.", error);
    return [
      { id: '1', title: '아이패드 에어 5세대 64G 미개봉 새상품', price: 750000, region_1: '서울특별시', region_2: '강남구', url: '#', time_ago: '최근' },
      { id: '2', title: '아이패드 에어 5 미개봉 스페이스그레이', price: 770000, region_1: '경기도', region_2: '수원시', url: '#', time_ago: '최근' },
      { id: '3', title: '미개봉 새제품 아이패드 에어 5세대', price: 780000, region_1: '부산광역시', region_2: '해운대구', url: '#', time_ago: '최근' },
      { id: '4', title: '아이패드 에어 5세대 64기가 미개봉', price: 800000, region_1: '서울특별시', region_2: '서초구', url: '#', time_ago: '최근' },
      { id: '5', title: '아이패드 에어5 와이파이 미개봉 팝니다', price: 810000, region_1: '인천광역시', region_2: '부평구', url: '#', time_ago: '최근' },
      ...Array.from({length: 40}).map((_, i) => ({
        id: `dummy-${i}`, title: '테스트 매물', price: 800000 + (Math.floor(Math.random() * 10) - 5) * 10000, region_1: '테스트', region_2: '', url: '#', time_ago: '최근'
      }))
    ];
  }
};

const processData = (items) => {
    if(!items || items.length === 0) return { summary: null, chartData: [] };

    const sortedItems = [...items].sort((a, b) => a.price - b.price);
    const prices = sortedItems.map(item => item.price);

    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const midIndex = Math.floor(prices.length / 2);
    const medianPrice = prices.length % 2 !== 0 ? prices[midIndex] : (prices[midIndex - 1] + prices[midIndex]) / 2;

    const summary = {
        keyword: '아이패드 에어 5세대',
        totalCount: items.length,
        averagePrice: avgPrice,
        medianPrice: medianPrice,
        minPrice: minPrice,
        maxPrice: maxPrice,
    };

    const bucketSize = 50000;
    const distribution = {};

    sortedItems.forEach(item => {
        const bucketStart = Math.floor(item.price / bucketSize) * bucketSize;
        distribution[bucketStart] = (distribution[bucketStart] || 0) + 1;
    });

    const chartData = Object.keys(distribution).sort((a,b) => Number(a)-Number(b)).map(bucket => {
        const p = Number(bucket);
        return {
            name: `${p/10000}만`,
            count: distribution[p],
            range: `${p/10000}만 ~ ${(p+bucketSize)/10000}만`,
            priceValue: p
        };
    });

    return { summary, chartData, topDeals: sortedItems.slice(0, 5) };
}

export default function DaangnDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchCSVData();
      setItems(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const { summary, chartData, topDeals } = useMemo(() => processData(items), [items]);
  const maxCount = chartData.length > 0 ? Math.max(...chartData.map((d) => d.count)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
         <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
         <p className="text-gray-500 font-medium">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (!items.length || !summary) {
     return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
         <h2 className="text-xl font-bold">수집된 데이터가 없습니다.</h2>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <span className="text-orange-500 text-2xl">🥕</span> 
            <span className="text-gray-900">당근시세</span>
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            거품 없는 <span className="text-orange-500">진짜 중고 시세</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-gray-500 font-medium mb-1">분석 키워드</p>
            <p className="text-lg font-bold text-gray-800 line-clamp-1">{summary.keyword}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-gray-500 font-medium mb-1 flex items-center gap-1">적정 시세</p>
            <p className="text-2xl font-black text-orange-500">{formatPrice(summary.medianPrice)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-gray-500 font-medium mb-1">발견된 최저가</p>
            <p className="text-2xl font-bold text-blue-600">{formatPrice(summary.minPrice)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-sm text-gray-500 font-medium mb-1">발견된 최고가</p>
            <p className="text-2xl font-bold text-gray-400">{formatPrice(summary.maxPrice)}</p>
          </div>
        </div>

        <div className="w-full h-80 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">가격대별 매물 분포</h3>
          </div>
          <ResponsiveContainer width="100%" height="70%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.count === maxCount ? '#FF8A3D' : '#FFDBC1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800">🔥 실시간 최저가 꿀매물</h3>
          </div>
          <ul className="flex flex-col gap-3">
            {topDeals.map((item, index) => {
              const priceDiff = summary.medianPrice - item.price;
              return (
                <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row sm:items-center justify-between w-full">
                      <div className="flex items-center gap-2 mb-2 sm:mb-0">
                        <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2.5 py-1 rounded-md">{index + 1}위</span>
                        <span className="font-semibold text-gray-800">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xl font-bold text-gray-900">{formatPrice(item.price)}</div>
                        {priceDiff > 0 && (
                          <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                            시세 대비 {formatDiff(priceDiff)} 저렴 ↓
                          </div>
                        )}
                      </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
