"""E2E: dokter terpilih hilang via 'realtime' (refetch). Tombol kembali disabled."""
import asyncio, json, re, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient, is_list_dokter

SHOT = Path("/tmp/browser/sim-reg-rt/shots"); SHOT.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        await login_demo(page)

        # Phase 1: biarkan listDokter normal — pilih dokter pertama
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await open_form_with_new_patient(page, f"RT Test {int(time.time())}", "0811" + str(int(time.time()))[-7:])

        trigger = page.get_by_label("Pilih dokter").first
        await trigger.wait_for(state="visible", timeout=10000)
        await trigger.click()
        await page.wait_for_timeout(500)
        opts = page.locator('[role="option"]')
        n_initial = await opts.count()
        chosen_text = (await opts.nth(0).inner_text()).strip()
        await opts.nth(0).click()
        await page.wait_for_timeout(300)
        btn = page.get_by_role("button", name="Buat Booking").first
        enabled_after_pick = not await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"1_picked.png"))

        # Phase 2: pasang interceptor yang KOSONGKAN array dokter,
        # lalu trigger refetch React Query lewat window focus event.
        async def handler(route):
            if not is_list_dokter(route.request.url):
                return await route.continue_()
            resp = await route.fetch()
            body = await resp.text()
            try:
                parsed = json.loads(body)
                def walk(n):
                    if isinstance(n, dict):
                        if n.get("t") == 9:
                            if isinstance(n.get("a"), list): n["a"] = []
                            if isinstance(n.get("p"), list): n["p"] = []
                        for v in n.values(): walk(v)
                    elif isinstance(n, list):
                        for v in n: walk(v)
                walk(parsed)
                body = json.dumps(parsed)
            except Exception:
                pass
            return await route.fulfill(response=resp, body=body)

        await page.route("**/_serverFn/**", handler)

        # Trigger refetch tanpa reload halaman: dispatch focus event
        await page.evaluate("window.dispatchEvent(new Event('focus'))")
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(SHOT/"2_after_realtime.png"))

        # Verifikasi: placeholder berubah (tidak lagi memuat nama dokter), tombol disabled
        trigger_text = (await trigger.inner_text()).strip()
        placeholder_changed = chosen_text.split()[0] not in trigger_text
        disabled_now = await btn.is_disabled()
        validation = await page.locator('[data-testid="form-validation"]').count()

        # Pilih ulang dari daftar kosong tidak mungkin → tombol tetap disabled
        # Sekarang lepas interceptor & refetch lagi → daftar kembali, pilih ulang
        await page.unroute("**/_serverFn/**", handler)
        await page.evaluate("window.dispatchEvent(new Event('focus'))")
        await page.wait_for_timeout(2000)
        await trigger.click()
        await page.wait_for_timeout(500)
        n_back = await opts.count()
        if n_back > 0:
            await opts.nth(0).click()
        await page.wait_for_timeout(400)
        re_enabled = not await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"3_reselected.png"))

        print(f"n_initial={n_initial} enabled_after_pick={enabled_after_pick} "
              f"placeholder_changed={placeholder_changed} disabled_now={disabled_now} "
              f"validation={validation} n_back={n_back} re_enabled={re_enabled}")
        ok = enabled_after_pick and placeholder_changed and disabled_now and validation >= 1 and re_enabled
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
