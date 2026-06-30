import asyncio, re, base64, json
from pathlib import Path
from playwright.async_api import async_playwright

SHOT = Path("/tmp/browser/sim-reg-denied/shots"); SHOT.mkdir(parents=True, exist_ok=True)

def is_list_dokter(url: str) -> bool:
    m = re.search(r"/_serverFn/([A-Za-z0-9_-]+)", url)
    if not m: return False
    s = m.group(1)
    s += "=" * ((4 - len(s) % 4) % 4)
    try:
        return "listDokter" in base64.b64decode(s).decode("utf-8", "ignore")
    except Exception:
        return False

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width":1280,"height":1800})
        page = await ctx.new_page()

        async def handler(route):
            if is_list_dokter(route.request.url):
                print("ABORT", route.request.url[:120])
                return await route.abort("failed")
            return await route.continue_()

        await page.route("**/_serverFn/**", handler)

        await page.goto("http://localhost:8080/sim-klinik/login", wait_until="domcontentloaded")
        await page.locator("input[type=email]").first.fill("demo@prime.id")
        await page.locator("input[type=password]").first.fill("demo1234")
        await page.locator("button[type=submit]").first.click()
        await page.wait_for_url(re.compile(r"/sim-klinik(?!/login)"), timeout=15000)

        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Open Pasien Baru dialog to expose form
        await page.get_by_role("button", name=re.compile("Pasien Baru")).click()
        await page.wait_for_selector('role=dialog')
        dlg = page.get_by_role("dialog")
        await dlg.locator("input").nth(0).fill("E2E Denied Probe")
        await dlg.locator("input").nth(1).fill("08110000001")
        await dlg.get_by_role("button", name="Daftar").click()
        await page.wait_for_timeout(15000)
        await page.screenshot(path=str(SHOT/"1_form.png"))

        err = page.get_by_test_id("dokter-error")
        try:
            await err.wait_for(state="visible", timeout=8000)
            err_visible = True
            err_text = (await err.inner_text()).strip()
        except Exception:
            err_visible = False
            err_text = ""
        print("error_visible:", err_visible)
        print("error_text:", err_text[:120])

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=5000)
        data_disabled = await trigger.get_attribute("data-disabled")
        aria_disabled = await trigger.get_attribute("aria-disabled")
        placeholder = (await trigger.inner_text()).strip()
        trigger_disabled = data_disabled is not None or aria_disabled == "true"
        print("trigger_disabled:", trigger_disabled, "| placeholder:", placeholder)

        booking_btn = page.get_by_role("button", name=re.compile("Buat Booking"))
        await booking_btn.wait_for(state="visible", timeout=5000)
        btn_disabled = await booking_btn.is_disabled()
        print("buat_booking_disabled:", btn_disabled)
        html = await page.content()
        print("has_akses_ditolak_text:", "Akses ditolak" in html)
        print("has_dokter_error_testid:", "dokter-error" in html)
        print("buat_booking_disabled:", btn_disabled)

        await page.screenshot(path=str(SHOT/"2_state.png"))

        ok = err_visible and "Akses ditolak" in err_text and trigger_disabled and btn_disabled and "ditolak" in placeholder.lower()
        print("RESULT:", "PASS" if ok else "FAIL")

        await b.close()

asyncio.run(main())
