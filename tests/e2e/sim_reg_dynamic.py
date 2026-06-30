"""E2E: data berubah (kosong → terisi) tanpa reload halaman."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_list_dokter, rewrite_dokter_empty

SHOT = Path("/tmp/browser/sim-reg-dynamic/shots"); SHOT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        # PHASE 1: install intercept BEFORE login → dokter list empty
        handler = await rewrite_dokter_empty(ctx, page)
        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        await open_form_with_new_patient(page, f"E2E Dyn {int(time.time())}", "0814" + str(int(time.time()))[-7:])

        empty_banner = await page.locator('[role="alert"]:has-text("Daftar dokter kosong")').count()
        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=8000)
        disabled_before = await trigger.get_attribute("data-disabled") is not None
        btn = page.get_by_role("button", name="Buat Booking").first
        btn_disabled_before = await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"1_empty.png"))
        print("PHASE1 empty_banner:", empty_banner, "trigger_disabled:", disabled_before, "btn_disabled:", btn_disabled_before)

        # PHASE 2: remove intercept → unmount/remount to refetch
        await page.unroute("**/_serverFn/**", handler)
        await page.goto("http://localhost:8080/sim-klinik", wait_until="domcontentloaded")
        await page.wait_for_timeout(400)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1500)
        # Re-open form (selectedP reset by unmount)
        await open_form_with_new_patient(page, f"E2E Dyn2 {int(time.time())}", "0818" + str(int(time.time()))[-7:])
        try:
            await page.wait_for_response(lambda r: is_list_dokter(r.url) and r.status == 200, timeout=8000)
        except Exception:
            pass
        await page.wait_for_timeout(1200)

        empty_banner_after = await page.locator('[role="alert"]:has-text("Daftar dokter kosong")').count()
        # Open the trigger to read options
        trigger = page.get_by_label("Pilih dokter").first
        disabled_after = await trigger.get_attribute("data-disabled") is not None
        await trigger.click()
        await page.wait_for_timeout(600)
        opts = page.locator('[role="option"]')
        n = await opts.count()
        if n > 0:
            await opts.nth(0).click()
        btn = page.get_by_role("button", name="Buat Booking").first
        btn_disabled_after = await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"2_filled.png"))
        print("PHASE2 empty_banner:", empty_banner_after, "trigger_disabled:", disabled_after, "options:", n, "btn_disabled:", btn_disabled_after)

        ok = (
            empty_banner == 1 and disabled_before and btn_disabled_before and
            empty_banner_after == 0 and not disabled_after and n > 0 and not btn_disabled_after
        )
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
