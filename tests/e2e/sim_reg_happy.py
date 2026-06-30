import asyncio, re, time
from pathlib import Path
from playwright.async_api import async_playwright, expect

SHOT = Path("/tmp/browser/sim-reg/shots"); SHOT.mkdir(parents=True, exist_ok=True)
NAMA = f"E2E Test {int(time.time())}"
HP   = "0811" + str(int(time.time()))[-7:]

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()
        errs=[]; page.on("console", lambda m: m.type=="error" and errs.append(m.text[:140]))

        # LOGIN ------------------------------------------------------------
        await page.goto("http://localhost:8080/sim-klinik/login", wait_until="domcontentloaded")
        await page.locator("input[type=email]").first.fill("demo@prime.id")
        await page.locator("input[type=password]").first.fill("demo1234")
        await page.locator("button[type=submit]").first.click()
        await page.wait_for_url(re.compile(r"/sim-klinik(?!/login)"), timeout=15000)
        print("✓ Login OK →", page.url)

        # REGISTRASI -------------------------------------------------------
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1200)
        await page.screenshot(path=str(SHOT/"1_registrasi.png"))

        # Empty banner must NOT appear (yet form not shown — banner is inside form).
        # First: open "Pasien Baru" dialog
        await page.get_by_role("button", name=re.compile("Pasien Baru")).click()
        await page.wait_for_selector('role=dialog')
        dlg = page.get_by_role("dialog")
        await dlg.locator("input").nth(0).fill(NAMA)   # Nama
        await dlg.locator("input").nth(1).fill(HP)     # HP
        await page.screenshot(path=str(SHOT/"2_newp.png"))
        await dlg.get_by_role("button", name="Daftar").click()
        # Dialog closes → selectedP set → form renders
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"3_form_open.png"))

        # Now Dokter trigger should be visible
        trigger = page.get_by_label("Pilih dokter")
        await trigger.first.wait_for(state="visible", timeout=10000)

        empty = await page.locator('[role="alert"]:has-text("Daftar dokter kosong")').count()
        print("empty_alert:", empty, "→", "FAIL" if empty else "OK")

        await trigger.first.click()
        await page.wait_for_timeout(700)
        opts = page.locator('[role="option"]')
        n = await opts.count()
        print("dokter options:", n)
        first_doc = (await opts.nth(0).inner_text()).strip()
        print("picking:", first_doc)
        await opts.nth(0).click()

        # Buat Booking should be enabled now
        btn = page.get_by_role("button", name="Buat Booking")
        disabled = await btn.first.is_disabled()
        print("Buat Booking disabled?:", disabled)
        await page.screenshot(path=str(SHOT/"4_ready_submit.png"))

        await btn.first.click()
        # Wait for success toast or for the new booking to appear in list
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"5_after_submit.png"))

        # Verify by searching for our patient name in the bookings list
        appeared = await page.locator(f'text="{NAMA}"').count()
        print(f"booking row for {NAMA}:", appeared)

        print("CONSOLE_ERRORS:", [e for e in errs if "hydrat" not in e.lower()][:5])
        ok = (empty == 0) and (n > 0) and (not disabled) and (appeared >= 1)
        print("RESULT:", "PASS ✅" if ok else "FAIL ❌")
        await b.close()
        return 0 if ok else 1

import sys
sys.exit(asyncio.run(main()))
