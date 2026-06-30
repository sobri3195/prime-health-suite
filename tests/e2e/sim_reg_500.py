"""E2E: listDokter gagal 500 — banner error, dropdown disabled, tombol disabled."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_list_dokter

SHOT = Path("/tmp/browser/sim-reg-500/shots"); SHOT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        async def handler(route):
            if is_list_dokter(route.request.url):
                return await route.fulfill(status=500, headers={"content-type":"application/json"}, body='{"error":"Internal Server Error"}')
            return await route.continue_()
        await page.route("**/_serverFn/**", handler)

        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await open_form_with_new_patient(page, f"E2E 500 {int(time.time())}", "0816" + str(int(time.time()))[-7:])
        await page.wait_for_timeout(2500)  # allow retry:1 to settle

        err_banner = page.locator('[data-testid="dokter-error"]')
        err_visible = await err_banner.count() > 0 and await err_banner.first.is_visible()
        err_text = (await err_banner.first.inner_text()).strip() if err_visible else ""

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=5000)
        trigger_disabled = await trigger.get_attribute("data-disabled") is not None
        placeholder = (await trigger.inner_text()).strip()

        btn = page.get_by_role("button", name="Buat Booking").first
        btn_disabled = await btn.is_disabled()

        await page.screenshot(path=str(SHOT/"1_500.png"))
        print("err_visible:", err_visible, "| text starts:", err_text[:40])
        print("trigger_disabled:", trigger_disabled, "| placeholder:", placeholder)
        print("btn_disabled:", btn_disabled)

        ok = err_visible and trigger_disabled and btn_disabled and "ditolak" in err_text.lower()
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
