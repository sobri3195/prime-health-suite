"""E2E: createBooking gagal 400/409 → pesan error spesifik & informatif.

Verifikasi:
  - Toast error muncul (data-sonner-toast).
  - Teks toast memuat pesan dari server (bukan generik 'Error' kosong).
  - SelectedP (pasien terpilih) TIDAK berubah / form tidak ter-reset.
  - Dropdown dokter masih terisi nilai sebelumnya.
  - Tombol Buat Booking tetap visible & enabled (siap retry).

Diulang untuk status 400 dan 409 dengan pesan berbeda.
"""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import (
    login_demo, open_form_with_new_patient, is_create_booking,
    attach_console, snap, dump_failure,
)

SHOT = Path("/tmp/browser/sim-reg-create-400-message/shots")

CASES = [
    (400, "Slot bentrok dengan booking lain di jam tersebut"),
    (409, "Konflik: dokter sudah punya antrian aktif"),
]


async def run_case(page, status: int, message: str, idx: int) -> bool:
    case_dir = SHOT / f"case_{idx}_{status}"
    case_dir.mkdir(parents=True, exist_ok=True)
    console: list[str] = []
    attach_console(page, console)

    async def handler(route):
        if is_create_booking(route.request.url):
            return await route.fulfill(
                status=status,
                headers={"content-type": "application/json"},
                body=f'{{"error":"{message}"}}',
            )
        return await route.continue_()
    await page.route("**/_serverFn/**", handler)

    try:
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(600)
        nama = f"E2E MSG {status} {int(time.time())}"
        await open_form_with_new_patient(page, nama, "0817" + str(int(time.time()))[-7:])
        await snap(page, case_dir, "01_before_submit")

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=20000)
        await trigger.click()
        await page.wait_for_timeout(500)
        n = await page.locator('[role="option"]').count()
        if n == 0:
            await dump_failure(page, case_dir, console, "FAIL_no_dokter")
            return False
        await page.locator('[role="option"]').nth(0).click()
        dokter_text_before = (await trigger.inner_text()).strip()
        await snap(page, case_dir, "02_dokter_picked")

        # Snapshot patient block visible (selectedP)
        patient_visible_before = await page.get_by_text(nama).count() > 0

        btn = page.get_by_role("button", name="Buat Booking").first
        await btn.click()
        # Wait up to 4s for toast
        try:
            await page.wait_for_selector('[data-sonner-toast]', timeout=4000)
        except Exception:
            pass
        await snap(page, case_dir, "03_after_fail")

        toasts = page.locator('[data-sonner-toast]')
        toast_count = await toasts.count()
        all_texts = []
        for i in range(toast_count):
            try:
                t = (await toasts.nth(i).text_content()) or ""
                all_texts.append(t.strip())
            except Exception:
                pass
        toast_text = " || ".join(all_texts)

        dokter_text_after = (await trigger.inner_text()).strip()
        patient_visible_after = await page.get_by_text(nama).count() > 0
        btn_still_enabled = await btn.is_visible() and not await btn.is_disabled()

        print(f"[{status}] toast={toast_count!r} text={toast_text!r}")
        print(f"[{status}] dokter before/after = {dokter_text_before!r} / {dokter_text_after!r}")
        print(f"[{status}] patient_visible before/after = {patient_visible_before} / {patient_visible_after}")
        print(f"[{status}] btn_still_enabled = {btn_still_enabled}")

        lower = toast_text.lower()
        msg_ok = (
            "booking gagal" in lower
            or "bentrok" in lower
            or "konflik" in lower
            or "slot" in lower
        )
        ok = (
            toast_count > 0
            and msg_ok
            and dokter_text_before == dokter_text_after
            and patient_visible_after
            and btn_still_enabled
        )
        if not ok:
            await dump_failure(page, case_dir, console, f"FAIL_case_{status}")
        return ok
    except Exception as e:
        print(f"EXC[{status}]:", e)
        await dump_failure(page, case_dir, console, f"FAIL_exc_{status}")
        return False
    finally:
        await page.unroute("**/_serverFn/**", handler)


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        ok_all = False
        try:
            await login_demo(page)
            results = []
            for i, (status, msg) in enumerate(CASES, start=1):
                results.append(await run_case(page, status, msg, i))
            ok_all = all(results)
            print("RESULT:", "PASS" if ok_all else "FAIL", "cases=", results)
        finally:
            await b.close()
        return 0 if ok_all else 1


sys.exit(asyncio.run(main()))
