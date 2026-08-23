import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
import os
import json # JSON 파일 저장을 위해 추가

async def crawl_daangn(keyword: str, max_pages: int = 3):
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        print(f"🔍 '{keyword}' 검색 크롤링 시작...")

        url = f"https://www.daangn.com/search/{keyword}"
        await page.goto(url)
        await page.wait_for_timeout(3000) 

        for i in range(max_pages - 1):
            try:
                more_btn = await page.query_selector(".more-btn")
                if more_btn:
                    await more_btn.click()
                    print(f"  [{i+2}/{max_pages}] 더보기 클릭 완료")
                    await page.wait_for_timeout(2000)
                else:
                    break
            except Exception as e:
                break

        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
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

                region_elem = article.find(class_='article-region-name') or article.find('p', class_='region-name')
                region_text = region_elem.text.strip() if region_elem else "지역미상"
                
                link_elem = article.find('a', class_='flea-market-article-link') or article.find('a')
                link = f"https://www.daangn.com{link_elem['href']}" if link_elem and 'href' in link_elem.attrs else ""

                doc_id = ""
                if link:
                    match = re.search(r'/articles/(\d+)', link)
                    if match:
                        doc_id = match.group(1)

                results.append({
                    "id": doc_id,
                    "title": title,
                    "price": price_num,
                    "region_raw": region_text,
                    "url": link
                })
            except Exception:
                continue

        await browser.close()
        
    return results

def cleanse_and_filter(data_list, keyword=""):
    if not data_list:
        return pd.DataFrame()
        
    df = pd.DataFrame(data_list)
    df = df[(df['price'] > 1000) & (df['price'] < 5000000)]
    df['title_clean'] = df['title'].str.replace(r'\s+', '', regex=True).str.lower()
    
    include_keywords = ['미개봉', '새제품', '새상품', '미사용']
    include_pattern = '|'.join(include_keywords)
    condition_include = df['title_clean'].str.contains(include_pattern, na=False)
    
    exclude_keywords = ['급', '아닙니다', '거의', '처럼', '케이스만', '상자만']
    exclude_pattern = '|'.join(exclude_keywords)
    condition_exclude = ~df['title_clean'].str.contains(exclude_pattern, na=False)
    
    keyword_clean = keyword.replace(" ", "").lower()
    condition_keyword = df['title_clean'].str.contains(keyword_clean, na=False)
    
    clean_df = df[condition_include & condition_exclude & condition_keyword].copy()
    clean_df = clean_df.drop_duplicates(subset=['id'])
    clean_df = clean_df.drop(columns=['title_clean'])
    
    return clean_df

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. 웹사이트 폴더 경로 설정 (frontend-web/public)
    project_root = os.path.dirname(current_dir)
    frontend_public_dir = os.path.join(project_root, "frontend-web", "public")
    os.makedirs(frontend_public_dir, exist_ok=True)
    
    save_path_json = os.path.join(frontend_public_dir, "data.json")
    
    search_keyword = "아이패드 에어 5세대" 
    
    loop = asyncio.get_event_loop()
    raw_data = loop.run_until_complete(crawl_daangn(search_keyword, max_pages=3))
    refined_df = cleanse_and_filter(raw_data, search_keyword)
    
    if not refined_df.empty:
        # 2. 통계 계산 (평균가, 최저가, 최고가)
        avg_price = int(refined_df['price'].mean())
        min_price = int(refined_df['price'].min())
        max_price = int(refined_df['price'].max())
        
        # 3. 꿀매물 추출 (평균가보다 저렴한 상품 중 상위 5개)
        hot_deals_df = refined_df[refined_df['price'] < avg_price].sort_values(by='price').head(5)
        
        hot_deals = []
        for _, row in hot_deals_df.iterrows():
            hot_deals.append({
                "title": row['title'],
                "price": int(row['price']),
                "link": row['url'],
                "discount_gap": avg_price - int(row['price'])
            })
            
        # 4. JSON 데이터 조립
        dashboard_data = {
            "keyword": search_keyword,
            "average_price": avg_price,
            "min_price": min_price,
            "max_price": max_price,
            "hot_deals": hot_deals
        }
        
        # 5. 프론트엔드 폴더에 data.json으로 저장
        with open(save_path_json, 'w', encoding='utf-8') as f:
            json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n💾 웹사이트 연동을 위해 JSON 파일을 업데이트 했습니다: {save_path_json}")
    else:
        print("\n❌ 조건에 맞는 매물을 찾지 못했습니다.")
