import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import pandas as pd
import re
import os
import json

async def crawl_daangn(keyword: str, max_pages: int = 3):
    results = []
    
    async with async_playwright() as p:
        # 자동화 브라우저 특징 숨기기
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled']
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='ko-KR',
            timezone_id='Asia/Seoul'
        )
        
        # 💡 핵심: 웹페이지에 "나는 봇(webdriver)이 아니다"라는 속이는 스크립트 몰래 주입하기
        await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        page = await context.new_page()
        print(f"🔍 '{keyword}' 검색 크롤링 시작...")

        url = f"https://www.daangn.com/search/{keyword}"
        
        try:
            # 뻗는 현상 방지를 위해 domcontentloaded로 롤백
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000) 
            
            # 사람처럼 스크롤 내리기
            await page.mouse.wheel(0, 500)
            await page.wait_for_timeout(1000)

            for i in range(max_pages - 1):
                more_btn = await page.query_selector(".more-btn")
                if more_btn:
                    await more_btn.click()
                    await page.wait_for_timeout(2000)
                else:
                    break
        except Exception as e:
            print(f"⚠️ 페이지 로딩 중 에러 (무시하고 계속 진행): {e}")

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

        await browser.close()
        
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
    
    loop = asyncio.get_event_loop()
    raw_data = loop.run_until_complete(crawl_daangn(search_keyword, max_pages=3))
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
        print("\n✅ 크롤링 성공!")
    else:
        dashboard_data = {
            "keyword": "수집 실패 (당근마켓 봇 차단🚨)",
            "average_price": 0,
            "min_price": 0,
            "max_price": 0,
            "hot_deals": [
                {
                    "title": "안전망 작동 완료! 다시 시도하거나 키워드를 변경해 보세요.",
                    "price": 0,
                    "link": "#",
                    "discount_gap": 0
                }
            ]
        }
        print("\n❌ 조건에 맞는 매물 없음 또는 차단됨")

    with open(save_path_json, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
