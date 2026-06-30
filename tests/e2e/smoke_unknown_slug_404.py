"""Smoke test: invalid finance/sim-klinik slugs must render 404, not blank title."""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _helpers import login_demo  # type: ignore

SCREENSHOTS = pathlib.Path(__file__).parent.parent.parent / "/tmp/browser/smoke-404"
SCREENSHOTS = pathlib.Path("/tmp/browser/smoke-404")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

UNKNOWN_PATHS = [
    "/finance/__nope__",
    "/finance/master-xyz-not-real",
    "/sim-klinik/__nope__",
    "/sim-klinik/random-slug-404",
    "/apps/__nope__",
]

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()
        await login_demo(page)

        failures = []
        for i, path in enumerate(UNKNOWN_PATHS):
            await page.goto(f"http://localhost:8080{path}", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            body = (await page.locator("body").inner_text()).lower()
            await page.screenshot(path=str(SCREENSHOTS / f"{i}_{path.strip('/').replace('/','_')}.png"))
            if "404" not in body and "tidak ditemukan" not in body and "not found" not in body:
                failures.append((path, body[:200]))


        await browser.close()
        if failures:
            for f in failures:
                print("FAIL:", f)
            sys.exit(1)
        print("PASS: all unknown slugs render 404")

asyncio.run(main())
