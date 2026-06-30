import asyncio, re, time
from pathlib import Path
from playwright.async_api import async_playwright

SHOT = Path("/tmp/browser/sim-reg-persist/shots"); SHOT.mkdir(parents=True, exist_ok=True)
NAMA = f"E2E Persist {int(time.time())}"
HP   = "0812" + str(int(time.time()))[-7:]

async def pick_first_doctor(page):
    trigger = page.get_by_label("Pilih dokter").first
    await trigger.wait_for(state="visible", timeout=10000)
    await trigger.click()
    await page.wait_for_timeout(600)
    opts = page.locator('[role="option"]')
    n = await opts.count()
    assert n > 0, "no doctor options"
    name = (await opts.nth(0).inner_text()).strip()
    await opts.nth(0).click()
    return name, n

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()
        errs=[]; page.on("console", lambda m: m.type=="error" and errs.append(m.text[:140]))

        # LOGIN
        await page.goto("http://localhost:8080/sim-klinik/login", wait_until="domcontentloaded")
        await page.locator("input[type=email]").first.fill("demo@prime.id")
        await page.locator("input[type=password]").first.fill("demo1234")
        await page.locator("button[type=submit]").first.click()
        await page.wait_for_url(re.compile(r"/sim-klinik(?!/login)"), timeout=15000)

        # REGISTRASI flow 1
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.get_by_role("button", name=re.compile("Pasien Baru")).click()
        await page.wait_for_selector('role=dialog')
        dlg = page.get_by_role("dialog")
        await dlg.locator("input").nth(0).fill(NAMA)
        await dlg.locator("input").nth(1).fill(HP)
        await dlg.get_by_role("button", name="Daftar").click()
        await page.wait_for_timeout(2000)

        chosen_name, n1 = await pick_first_doctor(page)
        print("first pick:", chosen_name, "options:", n1)
        await page.screenshot(path=str(SHOT/"1_before_submit.png"))

        await page.get_by_role("button", name="Buat Booking").first.click()
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"2_after_submit.png"))
        appeared = await page.locator(f'text="{NAMA}"').count()
        print("booking appeared:", appeared)

        # REFRESH ----------------------------------------------------------
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(SHOT/"3_after_reload.png"))

        # No error banner
        err_banner = await page.locator('[data-testid="dokter-error"]').count()
        empty_banner = await page.locator('[role="alert"]:has-text("Daftar dokter kosong")').count()
        print("error_banner_after_reload:", err_banner, "empty_banner:", empty_banner)

        # Re-open form: need to pick a patient first (use existing patient list or new)
        # Quick path: open Pasien Baru again with same flow (different name suffix)
        NAMA2 = NAMA + " R"
        HP2 = "0813" + str(int(time.time()))[-7:]
        await page.get_by_role("button", name=re.compile("Pasien Baru")).click()
        await page.wait_for_selector('role=dialog')
        dlg = page.get_by_role("dialog")
        await dlg.locator("input").nth(0).fill(NAMA2)
        await dlg.locator("input").nth(1).fill(HP2)
        await dlg.get_by_role("button", name="Daftar").click()
        await page.wait_for_timeout(2000)

        # Verify dropdown still works and SAME doctor name is present + selectable
        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=10000)
        await trigger.click()
        await page.wait_for_timeout(600)
        opts = page.locator('[role="option"]')
        n2 = await opts.count()
        labels = [ (await opts.nth(i).inner_text()).strip() for i in range(n2) ]
        print("options after reload:", n2)
        same_present = chosen_name in labels
        print("same_doctor_present:", same_present)
        # click the same doctor
        idx = labels.index(chosen_name) if same_present else 0
        await opts.nth(idx).click()
        await page.screenshot(path=str(SHOT/"4_reselected.png"))

        btn = page.get_by_role("button", name="Buat Booking").first
        disabled = await btn.is_disabled()
        print("Buat Booking disabled after reselect?:", disabled)

        ok = (appeared >= 1) and err_banner == 0 and empty_banner == 0 and n2 > 0 and same_present and not disabled
        print("CONSOLE_ERRORS:", [e for e in errs if "hydrat" not in e.lower()][:5])
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

import sys
sys.exit(asyncio.run(main()))
