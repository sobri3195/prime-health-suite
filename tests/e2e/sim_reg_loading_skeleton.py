"""E2E: loading skeleton/spinner pada dropdown dokter saat listDokter pending.

Verifikasi:
  - Placeholder 'Memuat dokter…' tampil saat request pending.
  - SelectTrigger 'Pilih dokter' disabled selama pending.
  - Tombol 'Buat Booking' disabled selama pending.
  - Setelah data tiba: dropdown enable, opsi tersedia, dan tombol Buat Booking
    otomatis aktif sesudah memilih dokter.

Screenshot ditangkap pada setiap titik assert kritis (before/after).
"""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import (
    login_demo, open_form_with_new_patient, is_list_dokter,
    attach_console, snap, dump_failure,
)

SHOT = Path("/tmp/browser/sim-reg-loading-skeleton/shots")


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        console: list[str] = []
        attach_console(page, console)

        release = asyncio.Event()

        async def handler(route):
            if is_list_dokter(route.request.url):
                await release.wait()
            return await route.continue_()
        await page.route("**/_serverFn/**", handler)

        ok = False
        try:
            await login_demo(page); await snap(page, SHOT, "01_after_login")
            await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="domcontentloaded")
            await page.wait_for_timeout(500)
            await open_form_with_new_patient(page, f"E2E SK {int(time.time())}", "0815" + str(int(time.time()))[-7:])
            await snap(page, SHOT, "02_form_open_pending")

            trigger = page.get_by_label("Pilih dokter").first
            await trigger.wait_for(state="visible", timeout=10000)

            placeholder = (await trigger.inner_text()).strip()
            trig_disabled = (await trigger.get_attribute("data-disabled") is not None) or (await trigger.get_attribute("disabled") is not None)
            btn = page.get_by_role("button", name="Buat Booking").first
            btn_disabled_loading = await btn.is_disabled()
            await snap(page, SHOT, "03_loading_state")
            print("placeholder(loading):", repr(placeholder), "trig_disabled:", trig_disabled, "btn_disabled:", btn_disabled_loading)

            loading_ok = ("Memuat" in placeholder) and trig_disabled and btn_disabled_loading
            if not loading_ok:
                await dump_failure(page, SHOT, console, "FAIL_loading_assert")

            # Release listDokter request — data should arrive.
            release.set()
            await page.wait_for_timeout(1500)
            await snap(page, SHOT, "04_after_release")

            # Dropdown must now be enabled & populated.
            trig_disabled_after = (await trigger.get_attribute("data-disabled") is not None) or (await trigger.get_attribute("disabled") is not None)
            await trigger.click()
            await page.wait_for_timeout(500)
            n_opts = await page.locator('[role="option"]').count()
            await snap(page, SHOT, "05_options_open")
            if n_opts > 0:
                await page.locator('[role="option"]').nth(0).click()
            await page.wait_for_timeout(300)
            btn_after_pick = await btn.is_disabled()
            await snap(page, SHOT, "06_after_pick")

            print("trig_disabled_after:", trig_disabled_after, "options:", n_opts, "btn_after_pick:", btn_after_pick)
            ok = loading_ok and (not trig_disabled_after) and n_opts > 0 and (not btn_after_pick)
            if not ok:
                await dump_failure(page, SHOT, console, "FAIL_final")
            print("RESULT:", "PASS" if ok else "FAIL")
        except Exception as e:
            print("EXC:", e)
            await dump_failure(page, SHOT, console, "FAIL_exception")
        finally:
            await b.close()
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
