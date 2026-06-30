"""E2E: state loading listDokter — placeholder 'Memuat dokter…', dropdown disabled, tombol disabled.
Setelah data tiba, dropdown terisi & tombol Buat Booking enable setelah pilih dokter."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_list_dokter

SHOT = Path("/tmp/browser/sim-reg-loading/shots"); SHOT.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        release = asyncio.Event()

        async def handler(route):
            if is_list_dokter(route.request.url):
                await release.wait()
            return await route.continue_()
        await page.route("**/_serverFn/**", handler)

        try:
            await login_demo(page)
            # Buka registrasi — listDokter akan menggantung sampai release.set()
            await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="domcontentloaded")
            await page.wait_for_timeout(600)
            await open_form_with_new_patient(page, f"E2E LOAD {int(time.time())}", "0815" + str(int(time.time()))[-7:])

            # --- LOADING state ---
            trigger = page.get_by_label("Pilih dokter").first
            await trigger.wait_for(state="visible", timeout=8000)
            placeholder = (await trigger.inner_text()).strip()
            trig_disabled = await trigger.get_attribute("data-disabled") is not None
            btn = page.get_by_role("button", name="Buat Booking").first
            btn_disabled_loading = await btn.is_disabled()
            await page.screenshot(path=str(SHOT / "1_loading.png"))
            print("placeholder(loading):", placeholder, "| trig_disabled:", trig_disabled, "| btn_disabled:", btn_disabled_loading)

            # --- release request ---
            release.set()
            await page.wait_for_timeout(1500)

            await trigger.click()
            await page.wait_for_timeout(500)
            opts = page.locator('[role="option"]')
            n = await opts.count()
            await opts.nth(0).click()
            await page.wait_for_timeout(300)
            btn_after = await btn.is_disabled()
            await page.screenshot(path=str(SHOT / "2_loaded.png"))
            print("options:", n, "| btn_after_pick:", btn_after)

            ok = (
                "Memuat" in placeholder and trig_disabled and btn_disabled_loading
                and n > 0 and not btn_after
            )
            print("RESULT:", "PASS" if ok else "FAIL")
        finally:
            await b.close()
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
