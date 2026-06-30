"""E2E: listDokter timeout (abort) — error banner, dropdown disabled, tombol disabled."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_list_dokter

SHOT = Path("/tmp/browser/sim-reg-timeout/shots"); SHOT.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        async def handler(route):
            if is_list_dokter(route.request.url):
                # Simulate timeout: abort with timed-out error.
                return await route.abort("timedout")
            return await route.continue_()
        await page.route("**/_serverFn/**", handler)

        try:
            await login_demo(page)
            await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
            await page.wait_for_timeout(800)
            await open_form_with_new_patient(page, f"E2E TO {int(time.time())}", "0819" + str(int(time.time()))[-7:])
            # tunggu retry:1 selesai juga
            await page.wait_for_timeout(3500)

            err = page.locator('[data-testid="dokter-error"]').first
            err_visible = await err.count() > 0 and await err.is_visible()
            err_text = (await err.inner_text()).strip() if err_visible else ""

            trigger = page.get_by_label("Pilih dokter").first
            await trigger.wait_for(state="visible", timeout=5000)
            trigger_disabled = await trigger.get_attribute("data-disabled") is not None

            btn = page.get_by_role("button", name="Buat Booking").first
            btn_disabled = await btn.is_disabled()

            await page.screenshot(path=str(SHOT / "1_timeout.png"))
            print("err_visible:", err_visible, "| text:", err_text[:50])
            print("trigger_disabled:", trigger_disabled, "btn_disabled:", btn_disabled)

            ok = err_visible and trigger_disabled and btn_disabled
            print("RESULT:", "PASS" if ok else "FAIL")
        finally:
            await b.close()
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
