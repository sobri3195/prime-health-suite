"""E2E: createBooking gagal (400) — toast error, selectedP tetap, bisa retry tanpa reload."""
import asyncio, random, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_create_booking

SHOT = Path("/tmp/browser/sim-reg-create-400/shots"); SHOT.mkdir(parents=True, exist_ok=True)
SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"]


async def pick_slot(page, slot: str) -> None:
    jam_trigger = page.get_by_role("combobox").nth(0)
    await jam_trigger.click()
    await page.wait_for_timeout(300)
    await page.get_by_role("option", name=slot).click()
    await page.wait_for_timeout(200)


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        fail_create = {"on": True}

        async def handler(route):
            if is_create_booking(route.request.url) and fail_create["on"]:
                return await route.fulfill(
                    status=400,
                    headers={"content-type": "application/json"},
                    body='{"error":"Slot bentrok dengan booking lain"}',
                )
            return await route.continue_()
        await page.route("**/_serverFn/**", handler)

        ok = False
        try:
            await login_demo(page)
            await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
            await page.wait_for_timeout(800)
            nama = f"E2E 400 {int(time.time())}"
            await open_form_with_new_patient(page, nama, "0818" + str(int(time.time()))[-7:])

            trigger = page.get_by_label("Pilih dokter").first
            await trigger.wait_for(state="visible", timeout=8000)
            await trigger.click()
            await page.wait_for_timeout(500)
            await page.locator('[role="option"]').first.click()

            btn = page.get_by_role("button", name="Buat Booking").first
            await btn.click()
            await page.wait_for_timeout(2000)
            await page.screenshot(path=str(SHOT / "1_after_fail.png"))

            toast_count = await page.locator('[data-sonner-toast]').count()
            btn_still = await btn.is_visible() and not await btn.is_disabled()

            # Bisa retry tanpa reload: matikan intercept, pakai slot acak (hindari collision).
            fail_create["on"] = False
            reset_ok = False
            for slot in random.sample(SLOTS, len(SLOTS)):
                await pick_slot(page, slot)
                await btn.click()
                await page.wait_for_timeout(2500)
                if await page.get_by_role("button", name="Pasien Baru").count() > 0:
                    reset_ok = True
                    break
            await page.screenshot(path=str(SHOT / "2_after_retry.png"))

            print("toast_count:", toast_count, "btn_still:", btn_still, "reset_ok:", reset_ok)
            ok = toast_count > 0 and btn_still and reset_ok
            print("RESULT:", "PASS" if ok else "FAIL")
        finally:
            await b.close()
        return 0 if ok else 1


sys.exit(asyncio.run(main()))
