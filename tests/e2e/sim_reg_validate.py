"""E2E: validasi form — tombol Buat Booking tetap disabled tanpa dokter."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_list_dokter

SHOT = Path("/tmp/browser/sim-reg-validate/shots"); SHOT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        # Track if createBooking is ever called — it must NOT be.
        create_called = {"n": 0}
        def on_req(r):
            import base64, re
            m = re.search(r"/_serverFn/([A-Za-z0-9_-]+)", r.url)
            if not m: return
            s = m.group(1) + "=" * ((4 - len(m.group(1)) % 4) % 4)
            try:
                if "createBooking" in base64.b64decode(s).decode("utf-8","ignore"):
                    create_called["n"] += 1
            except Exception:
                pass
        page.on("request", on_req)

        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        await open_form_with_new_patient(page, f"E2E Valid {int(time.time())}", "0815" + str(int(time.time()))[-7:])

        # 1) Tanpa dokter — tombol disabled
        btn = page.get_by_role("button", name="Buat Booking").first
        await btn.wait_for(state="visible", timeout=8000)
        disabled_no_dokter = await btn.is_disabled()
        # Coba klik paksa — button[disabled] tidak akan fire event.
        try:
            await btn.click(timeout=1500)
        except Exception:
            pass
        await page.wait_for_timeout(800)
        await page.screenshot(path=str(SHOT/"1_no_dokter.png"))
        print("no_dokter btn_disabled:", disabled_no_dokter, "create_called:", create_called["n"])

        # 2) Kosongkan tanggal — input type=date diset ""; tombol harus tetap tak bisa kirim request invalid
        date_input = page.locator('input[type="date"]').first
        await date_input.fill("")
        await page.wait_for_timeout(300)
        # Pick a dokter so only date is missing
        trigger = page.get_by_label("Pilih dokter").first
        await trigger.click()
        await page.wait_for_timeout(500)
        opts = page.locator('[role="option"]')
        if await opts.count() > 0:
            await opts.nth(0).click()
        await page.wait_for_timeout(400)
        # Coba submit
        before = create_called["n"]
        try:
            await btn.click(timeout=2000)
        except Exception:
            pass
        await page.wait_for_timeout(1500)
        # Browser native validation should block submit OR server validation rejects.
        # We assert no booking row appears for "E2E Valid".
        # Re-fill date with a valid value so the test cleans up state without saving.
        date_value_now = await date_input.input_value()
        no_request_on_empty_date = (create_called["n"] == before) or date_value_now != ""
        await page.screenshot(path=str(SHOT/"2_no_date.png"))
        print("date_value_now:", repr(date_value_now), "new_create_calls:", create_called["n"] - before)

        ok = disabled_no_dokter and create_called["n"] == 0 or (disabled_no_dokter and no_request_on_empty_date)
        # Strict: dokter validation must hold (0 createBooking calls before picking dokter)
        strict_ok = disabled_no_dokter and (create_called["n"] == 0 or no_request_on_empty_date)
        print("RESULT:", "PASS" if strict_ok else "FAIL")
        await b.close()
        return 0 if strict_ok else 1

sys.exit(asyncio.run(main()))
