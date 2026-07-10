"""Smoke test: Finance master routes render and expose schema-matched fields."""
import asyncio, pathlib, re, sys
from playwright.async_api import async_playwright, expect

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _helpers import attach_console, dump_failure, login_finance_demo, snap  # type: ignore

OUT = pathlib.Path("/tmp/browser/finance-master-smoke")
OUT.mkdir(parents=True, exist_ok=True)

ROUTES = [
    ("/finance/master", re.compile("Master Data Finance", re.I)),
    ("/finance/master/profil-klinik", re.compile("Profil Klinik", re.I)),
    ("/finance/master/dokter", re.compile("Dokter", re.I)),
    ("/finance/master/payer", re.compile("Payer", re.I)),
    ("/finance/master/vendor", re.compile("Vendor", re.I)),
    ("/finance/master/tarif-pajak", re.compile("Tarif Pajak", re.I)),
]


async def main():
    console: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        attach_console(page, console)
        try:
            await login_finance_demo(page)
            await snap(page, OUT, "0_logged_in")

            for i, (path, heading) in enumerate(ROUTES, start=1):
                await page.goto(f"http://localhost:8080{path}", wait_until="networkidle")
                await expect(page.get_by_role("heading", name=heading).first).to_be_visible(timeout=15000)
                body = await page.locator("body").inner_text()
                assert "Validasi gagal" not in body
                assert "Could not find" not in body
                assert "column" not in body.lower()
                await snap(page, OUT, f"{i}_{path.strip('/').replace('/', '_')}")

            await page.goto("http://localhost:8080/finance/master/dokter", wait_until="networkidle")
            add = page.get_by_role("button", name=re.compile("Tambah", re.I)).first
            if await add.is_enabled():
                await add.click()
                await expect(page.get_by_role("dialog")).to_be_visible(timeout=5000)
                for label in ["Telepon", "No. SIP", "PTKP K/0"]:
                    await expect(page.get_by_text(label, exact=True).first).to_be_visible(timeout=5000)
                await page.keyboard.press("Escape")
            await snap(page, OUT, "7_dokter_form")
        except Exception:
            await dump_failure(page, OUT, console, "failure")
            raise
        finally:
            await browser.close()
    print("PASS: finance master routes render with schema-matched fields")


asyncio.run(main())