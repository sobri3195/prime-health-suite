"""E2E: pilih dokter + slot jadwal, submit, refresh, pastikan slot yang sama
masih tersedia dan bisa dipilih ulang tanpa error."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient

SHOT = Path("/tmp/browser/sim-reg-slot/shots"); SHOT.mkdir(parents=True, exist_ok=True)
NAMA = f"Slot {int(time.time())}"
HP = "0815" + str(int(time.time()))[-7:]
SLOT_PICK = "10:30"

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)[:140]))
        page.on("console", lambda m: m.type == "error" and errs.append(m.text[:140]))

        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await open_form_with_new_patient(page, NAMA, HP)

        # Pilih slot jam
        jam_trigger = page.locator('label:has-text("Jam") + button, label:has-text("Jam") ~ button').first
        # Fallback: trigger select via accessible name
        if await jam_trigger.count() == 0:
            jam_trigger = page.get_by_role("combobox").nth(0)
        await jam_trigger.click()
        await page.wait_for_timeout(400)
        await page.get_by_role("option", name=SLOT_PICK).click()
        await page.wait_for_timeout(200)

        # Pilih dokter
        d_trigger = page.get_by_label("Pilih dokter").first
        await d_trigger.click()
        await page.wait_for_timeout(400)
        dokter_text = (await page.locator('[role="option"]').nth(0).inner_text()).strip()
        await page.locator('[role="option"]').nth(0).click()
        await page.wait_for_timeout(300)

        await page.get_by_role("button", name="Buat Booking").first.click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"1_submitted.png"))

        row_count = await page.locator(f'[data-testid="booking-row"]:has-text("{NAMA}")').count()

        # Refresh halaman
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Re-buka form dgn pasien baru lain → cek slot SLOT_PICK masih ada & bisa dipilih
        await open_form_with_new_patient(page, NAMA + "-2", "0816" + str(int(time.time()))[-7:])
        jam_trigger2 = page.get_by_role("combobox").nth(0)
        await jam_trigger2.click()
        await page.wait_for_timeout(400)
        slot_visible = await page.get_by_role("option", name=SLOT_PICK).count()
        await page.get_by_role("option", name=SLOT_PICK).click()
        await page.wait_for_timeout(300)

        # Dokter yang sama bisa dipilih ulang
        d_trigger2 = page.get_by_label("Pilih dokter").first
        await d_trigger2.click()
        await page.wait_for_timeout(400)
        # Cari opsi dokter dengan nama yg sama
        same_doc = await page.locator(f'[role="option"]:has-text("{dokter_text.split(chr(10))[0]}")').count()
        if same_doc > 0:
            await page.locator(f'[role="option"]:has-text("{dokter_text.split(chr(10))[0]}")').first.click()
        await page.wait_for_timeout(300)
        btn = page.get_by_role("button", name="Buat Booking").first
        re_enabled = not await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"2_reselect.png"))

        clean_errs = [e for e in errs if "hydrat" not in e.lower()]
        print(f"row_after_submit={row_count} slot_visible={slot_visible} same_doc={same_doc} re_enabled={re_enabled} errs={clean_errs[:3]}")
        ok = row_count >= 1 and slot_visible >= 1 and same_doc >= 1 and re_enabled and not clean_errs
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
