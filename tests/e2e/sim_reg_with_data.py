"""E2E: data tersedia — tidak ada banner kosong, dropdown terisi, tombol enable setelah pilih."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient

SHOT = Path("/tmp/browser/sim-reg-happy-data/shots"); SHOT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        await open_form_with_new_patient(page, f"E2E OK {int(time.time())}", "0817" + str(int(time.time()))[-7:])

        empty_banner = await page.locator('[role="alert"]:has-text("Daftar dokter kosong")').count()
        err_banner = await page.locator('[data-testid="dokter-error"]').count()

        btn = page.get_by_role("button", name="Buat Booking").first
        btn_before = await btn.is_disabled()

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=8000)
        await trigger.click()
        await page.wait_for_timeout(600)
        opts = page.locator('[role="option"]')
        n = await opts.count()
        await opts.nth(0).click()
        await page.wait_for_timeout(300)

        btn_after = await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"1_happy.png"))
        print("empty_banner:", empty_banner, "err_banner:", err_banner)
        print("options:", n, "btn_before:", btn_before, "btn_after:", btn_after)

        ok = empty_banner == 0 and err_banner == 0 and n > 0 and btn_before and not btn_after
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
