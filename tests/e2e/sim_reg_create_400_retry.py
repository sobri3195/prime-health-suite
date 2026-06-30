"""E2E: retry setelah createBooking gagal 400/409 TANPA reload.

Verifikasi:
  1. Submit pertama gagal (server fulfill 400/409).
  2. Toast error tampil; tombol Buat Booking kembali aktif (tidak loading-stuck).
  3. Tanpa reload, user dapat memilih ulang slot/dokter & submit lagi.
  4. Setelah intercept dimatikan, retry SUKSES → form ter-reset (selectedP null
     → tombol 'Pasien Baru' kembali tampil) sebagai indikator booking dibuat.

Screenshot ditangkap di setiap titik kritis dan failure menyertakan console log.
"""
import asyncio, random, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import (
    login_demo, open_form_with_new_patient, is_create_booking,
    attach_console, snap, dump_failure,
)

SHOT = Path("/tmp/browser/sim-reg-create-400-retry/shots")
SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
         "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"]


async def pick_slot(page, slot: str) -> None:
    jam_trigger = page.get_by_role("combobox").nth(0)
    await jam_trigger.click(); await page.wait_for_timeout(300)
    await page.get_by_role("option", name=slot).click()
    await page.wait_for_timeout(200)


async def pick_random_dokter(page):
    trig = page.get_by_label("Pilih dokter").first
    await trig.click(); await page.wait_for_timeout(400)
    n = await page.locator('[role="option"]').count()
    if n == 0:
        await page.keyboard.press("Escape")
        return False
    await page.locator('[role="option"]').nth(random.randrange(n)).click()
    return True


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        console: list[str] = []
        attach_console(page, console)

        state = {"fail_status": 400, "fail_on": True}

        async def handler(route):
            if is_create_booking(route.request.url) and state["fail_on"]:
                return await route.fulfill(
                    status=state["fail_status"],
                    headers={"content-type": "application/json"},
                    body='{"error":"Slot bentrok — silakan pilih jam lain"}',
                )
            return await route.continue_()
        await page.route("**/_serverFn/**", handler)

        ok = False
        try:
            await login_demo(page); await snap(page, SHOT, "01_login")
            await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
            await page.wait_for_timeout(700)

            nama = f"E2E RETRY {int(time.time())}"
            await open_form_with_new_patient(page, nama, "0819" + str(int(time.time()))[-7:])
            await snap(page, SHOT, "02_form_open")

            trigger = page.get_by_label("Pilih dokter").first
            await trigger.wait_for(state="visible", timeout=20000)
            if not await pick_random_dokter(page):
                await dump_failure(page, SHOT, console, "FAIL_no_dokter")
                return 1

            btn = page.get_by_role("button", name="Buat Booking").first
            await snap(page, SHOT, "03_before_first_submit")
            await btn.click()
            try:
                await page.wait_for_selector('[data-sonner-toast]', timeout=4000)
            except Exception:
                pass
            await snap(page, SHOT, "04_after_first_fail")

            toast_first = await page.locator('[data-sonner-toast]').count()
            btn_enabled_after_fail = await btn.is_visible() and not await btn.is_disabled()
            print("first-fail toast:", toast_first, "btn_enabled:", btn_enabled_after_fail)
            if not (toast_first > 0 and btn_enabled_after_fail):
                await dump_failure(page, SHOT, console, "FAIL_first_state")
                return 1

            # ---- second attempt: still failing (409) — ensures user can resubmit ----
            state["fail_status"] = 409
            await pick_slot(page, random.choice(SLOTS))
            await pick_random_dokter(page)
            await snap(page, SHOT, "05_before_second_submit")
            await btn.click()
            try:
                await page.wait_for_selector('[data-sonner-toast]', timeout=4000)
            except Exception:
                pass
            await snap(page, SHOT, "06_after_second_fail")
            toast_second = await page.locator('[data-sonner-toast]').count()
            btn_enabled_after_second = await btn.is_visible() and not await btn.is_disabled()
            print("second-fail toast:", toast_second, "btn_enabled:", btn_enabled_after_second)
            if not (toast_second > 0 and btn_enabled_after_second):
                await dump_failure(page, SHOT, console, "FAIL_second_state")
                return 1

            # ---- final attempt: stop intercept; rotate slot+dokter until success ----
            state["fail_on"] = False
            await snap(page, SHOT, "07_before_success_retry")
            success = False
            for slot in random.sample(SLOTS, len(SLOTS)):
                await pick_slot(page, slot)
                if not await pick_random_dokter(page):
                    continue
                await btn.click()
                await page.wait_for_timeout(2800)
                if await page.get_by_role("button", name="Pasien Baru").count() > 0:
                    success = True; break
            await snap(page, SHOT, "08_after_success")
            print("retry-success:", success)

            ok = success
            if not ok:
                await dump_failure(page, SHOT, console, "FAIL_retry_did_not_succeed")
            print("RESULT:", "PASS" if ok else "FAIL")
        except Exception as e:
            print("EXC:", e)
            await dump_failure(page, SHOT, console, "FAIL_exception")
        finally:
            await b.close()
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
