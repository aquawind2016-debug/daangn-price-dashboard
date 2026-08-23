import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
import os

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
    save_path = os.path.join(current_dir, "daangn_result.csv")
    search_keyword = "아이패드 에어 5세대" 
    
    loop = asyncio.get_event_loop()
    raw_data = loop.run_until_complete(crawl_daangn(search_keyword, max_pages=3))
    refined_df = cleanse_and_filter(raw_data, search_keyword)
    
    if not refined_df.empty:
        refined_df.to_csv(save_path, index=False, encoding='utf-8-sig')
        print(f"\n💾 결과를 업데이트 했습니다: {save_path}")
