"""E2E: queue number tampil setelah check-in dan tetap konsisten setelah reload."""
import asyncio, re, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient

SHOT = Path("/tmp/browser/sim-reg-queue/shots"); SHOT.mkdir(parents=True, exist_ok=True)
NAMA = f"Q Test {int(time.time())}"
HP = "0812" + str(int(time.time()))[-7:]

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await open_form_with_new_patient(page, NAMA, HP)

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=10000)
        await trigger.click()
        await page.wait_for_timeout(500)
        await page.locator('[role="option"]').nth(0).click()
        await page.wait_for_timeout(300)
        await page.get_by_role("button", name="Buat Booking").first.click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"1_booked.png"))

        # Cari row booking yang baru dibuat berdasarkan nama pasien
        row = page.locator(f'[data-testid="booking-row"]:has-text("{NAMA}")').first
        await row.wait_for(state="visible", timeout=8000)
        booking_id = await row.get_attribute("data-booking-id")
        # Sebelum check-in, queue belum ada
        before_qno = await row.locator('[data-testid="queue-no"]').count()

        # Klik check-in di row tersebut
        await row.get_by_role("button", name=re.compile("Check-in")).click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"2_checked_in.png"))

        # Queue number sekarang tampil
        row2 = page.locator(f'[data-testid="booking-row"][data-booking-id="{booking_id}"]').first
        qbadge = row2.locator('[data-testid="queue-no"]').first
        await qbadge.wait_for(state="visible", timeout=8000)
        q_after = (await qbadge.inner_text()).strip()
        print("queue_after_checkin:", repr(q_after))

        # Reload halaman, queue_no harus tetap sama tanpa interaksi tambahan
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        row3 = page.locator(f'[data-testid="booking-row"][data-booking-id="{booking_id}"]').first
        await row3.wait_for(state="visible", timeout=8000)
        q_reload = (await row3.locator('[data-testid="queue-no"]').first.inner_text()).strip()
        await page.screenshot(path=str(SHOT/"3_after_reload.png"))
        print(f"before={before_qno} after={q_after} reload={q_reload}")

        ok = before_qno == 0 and q_after.startswith("#") and q_after == q_reload
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
