from playwright.sync_api import sync_playwright
url = "https://www.kicks.se/innisfree-green-tea-seed-hyaluronic-serum-80-ml"
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
    ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
    page = ctx.new_page()
    page.goto(url, wait_until="networkidle", timeout=45000)
    page.wait_for_timeout(1000)
    try:
        page.locator("button:has-text('Neka alla')").first.click(timeout=3000)
        page.wait_for_timeout(500)
    except:
        pass
    result = page.evaluate("""() => {
        let full = document.body.innerText;
        let idx = full.toLowerCase().indexOf('ingredien');
        if (idx >= 0) return full.substring(Math.max(0,idx-50), idx+500);
        return 'EJ HITTAT. Mitten: ' + full.substring(Math.floor(full.length/2), Math.floor(full.length/2)+500);
    }""")
    print(result)
    browser.close()
