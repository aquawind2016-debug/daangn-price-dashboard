import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import os
import json

def crawl_daangn_fast(keyword: str):
    results = []
    # 💡 아주 평범한 한국 크롬 사용자처럼 신분증(Header)을 위조합니다.
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.google.com/"
    }
    
    print(f"🔍 '{keyword}' 검색 크롤링 시작 (초고속 가벼운 모드)...")
    url = f"https://www.daangn.com/search/{keyword}"
    
    try:
        # 브라우저를 안 띄우고 문서만 1초 만에 훔쳐 옵니다.
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status() 
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        articles = soup.find_all('article', class_='flea-market-article')
        if not articles:
            articles = soup.find_all('article')
            
        for article in articles:
            try:
                title_elem = article.find(class_='article-title') or article.find('h2')
                title = title_elem.text.strip() if title_elem else "제목없음"
                
                price_elem = article.find(class_='article-price') or article.find('p', class_='price')
                price_text = price_elem.text.strip() if price_elem else "0원"
                
                if "나눔" in price_text or "-" in price_text or "미정" in price_text:
                    price_num = 0
                else:
                    price_clean = re.sub(r'[^0-9]', '', price_text)
                    price_num = int(price_clean) if price_clean else 0

                link_elem = article.find('a', class_='flea-market-article-link') or article.find('a')
                link = f"https://www.daangn.com{link_elem['href']}" if link_elem and 'href' in link_elem.attrs else ""

                doc_id = link.split('/')[-1] if link else ""

                results.append({
                    "id": doc_id,
                    "title": title,
                    "price": price_num,
                    "url": link
                })
            except Exception:
                continue
                
    except Exception as e:
        print(f"⚠️ 요청 중 에러 발생: {e}")
        
    return results

def cleanse_and_filter(data_list):
    if not data_list:
        return pd.DataFrame()
    df = pd.DataFrame(data_list)
    df = df[(df['price'] > 1000) & (df['price'] < 5000000)]
    clean_df = df.copy() 
    clean_df = clean_df.drop_duplicates(subset=['id'])
    return clean_df

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    frontend_public_dir = os.path.join(project_root, "frontend-web", "public")
    os.makedirs(frontend_public_dir, exist_ok=True)
    
    save_path_json = os.path.join(frontend_public_dir, "data.json")
    search_keyword = "아이패드 에어 5세대" 
    
    # 💡 빠르고 가벼운 크롤러 실행
    raw_data = crawl_daangn_fast(search_keyword)
    refined_df = cleanse_and_filter(raw_data)
    
    if not refined_df.empty:
        avg_price = int(refined_df['price'].mean())
        min_price = int(refined_df['price'].min())
        max_price = int(refined_df['price'].max())
        
        hot_deals_df = refined_df[refined_df['price'] < avg_price].sort_values(by='price').head(5)
        
        hot_deals = []
        for _, row in hot_deals_df.iterrows():
            hot_deals.append({
                "title": row['title'],
                "price": int(row['price']),
                "link": row['url'],
                "discount_gap": avg_price - int(row['price'])
            })
            
        dashboard_data = {
            "keyword": search_keyword,
            "average_price": avg_price,
            "min_price": min_price,
            "max_price": max_price,
            "hot_deals": hot_deals
        }
        print("\n✅ 가벼운 낚아채기 성공! 매물 데이터를 획득했습니다.")
    else:
        dashboard_data = {
            "keyword": "수집 실패 (미국 서버 IP 완전 차단됨 🚨)",
            "average_price": 0,
            "min_price": 0,
            "max_price": 0,
            "hot_deals": [
                {
                    "title": "당근마켓이 GitHub 서버(해외)를 완전히 차단했습니다. 로컬 PC에서 실행해야 합니다.",
                    "price": 0,
                    "link": "#",
                    "discount_gap": 0
                }
            ]
        }
        print("\n❌ 해외 IP 완전 차단됨")

    with open(save_path_json, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
