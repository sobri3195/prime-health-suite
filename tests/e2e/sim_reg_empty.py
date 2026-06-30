import asyncio, re, base64, json
from pathlib import Path
from playwright.async_api import async_playwright

SHOT = Path("/tmp/browser/sim-reg-empty/shots"); SHOT.mkdir(parents=True, exist_ok=True)

def is_list_dokter(url: str) -> bool:
    m = re.search(r"/_serverFn/([A-Za-z0-9_-]+)", url)
    if not m: return False
    s = m.group(1)
    s += "=" * ((4 - len(s) % 4) % 4)
    try:
        return "listDokter" in base64.b64decode(s).decode("utf-8", "ignore")
    except Exception:
        return False

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        async def handler(route):
            if is_list_dokter(route.request.url):
                # Probe real shape once
                resp = await ctx.request.fetch(route.request)
                body = await resp.text()
                # TSS may wrap as {"result": [...]} or return raw array. Replace either.
                def empty_arrays(node):
                    # TSS encodes arrays as {"t":9,"i":N,"p":[...]} — empty them in-place.
                    if isinstance(node, dict):
                        if node.get("t") == 9:
                            if isinstance(node.get("a"), list): node["a"] = []
                            if isinstance(node.get("p"), list): node["p"] = []
                        for v in node.values():
                            empty_arrays(v)
                    elif isinstance(node, list):
                        for v in node:
                            empty_arrays(v)
                try:
                    parsed = json.loads(body)
                    if isinstance(parsed, dict) and "result" in parsed and isinstance(parsed["result"], list):
                        parsed["result"] = []
                        new_body = json.dumps(parsed)
                    else:
                        empty_arrays(parsed)
                        new_body = json.dumps(parsed)
                except Exception:
                    new_body = "[]"
                return await route.fulfill(
                    status=200,
                    headers={"content-type": "application/json"},
                    body=new_body,
                )
            return await route.continue_()

        await page.route("**/_serverFn/**", handler)

        await page.goto("http://localhost:8080/sim-klinik/login", wait_until="domcontentloaded")
        await page.locator("input[type=email]").first.fill("demo@prime.id")
        await page.locator("input[type=password]").first.fill("demo1234")
        await page.locator("button[type=submit]").first.click()
        await page.wait_for_url(re.compile(r"/sim-klinik(?!/login)"), timeout=15000)

        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        await page.get_by_role("button", name=re.compile("Pasien Baru")).click()
        await page.wait_for_selector('role=dialog')
        dlg = page.get_by_role("dialog")
        await dlg.locator("input").nth(0).fill("E2E Empty Probe")
        await dlg.locator("input").nth(1).fill("08110000000")
        await dlg.get_by_role("button", name="Daftar").click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"1_form.png"))

        banner = page.locator('[role="alert"]:has-text("Daftar dokter kosong")')
        try:
            await banner.first.wait_for(state="visible", timeout=8000)
            banner_visible = True
        except Exception:
            banner_visible = False
        print("banner_visible:", banner_visible)

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=5000)
        data_disabled = await trigger.get_attribute("data-disabled")
        aria_disabled = await trigger.get_attribute("aria-disabled")
        placeholder = (await trigger.inner_text()).strip()
        trigger_disabled = data_disabled is not None or aria_disabled == "true"
        print("trigger_disabled:", trigger_disabled, "| placeholder:", placeholder)

        btn = page.get_by_role("button", name="Buat Booking").first
        btn_disabled = await btn.is_disabled()
        print("buat_booking_disabled:", btn_disabled)

        await page.screenshot(path=str(SHOT/"2_banner.png"))

        ok = banner_visible and trigger_disabled and btn_disabled and "Tidak ada dokter" in placeholder
        print("RESULT:", "PASS ✅" if ok else "FAIL ❌")
        await b.close()
        return 0 if ok else 1

import sys
sys.exit(asyncio.run(main()))
