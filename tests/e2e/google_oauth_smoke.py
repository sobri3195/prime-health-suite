"""Exercise Google OAuth initiation/callbacks without Google credentials or DB writes.

Start the dev server first. All external requests are intercepted or blocked.
PLAYWRIGHT_CHROMIUM_EXECUTABLE optionally selects a locally installed browser.
"""

import asyncio
import base64
import json
import os
import time
from urllib.parse import parse_qs, urlencode, urlparse

from playwright.async_api import async_playwright, expect


BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
USER = {
    "id": "00000000-0000-4000-8000-000000000001",
    "aud": "authenticated",
    "role": "authenticated",
    "email": "oauth-smoke@example.invalid",
    "app_metadata": {"provider": "google", "providers": ["google"]},
    "user_metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
}


def callback(system="sim-klinik", redirect="/sim-klinik/login", **params):
    return BASE_URL + "/login?" + urlencode(
        {"oauth": "google", "system": system, "redirect": redirect, **params}
    )


async def intercept_external(route, *, authorize=None, authenticated=False):
    url = urlparse(route.request.url)
    if url.netloc == urlparse(BASE_URL).netloc and "/_serverFn/" in url.path and authenticated:
        await route.fulfill(
            content_type="application/json",
            body=json.dumps({"result": {"profile": None, "bookings": [], "queue": []}, "context": {}}),
        )
    elif url.netloc == urlparse(BASE_URL).netloc:
        await route.continue_()
    elif url.path == "/auth/v1/authorize" and authorize is not None:
        authorize.append(route.request.url)
        await route.fulfill(content_type="text/html", body="OAuth request intercepted")
    elif url.path == "/auth/v1/user" and authenticated:
        await route.fulfill(content_type="application/json", body=json.dumps(USER))
    else:
        # Keep the smoke test independent of remote services and production data.
        await route.abort()


async def check_initiation(browser, system, destination):
    context = await browser.new_context()
    captured = []
    await context.route(
        "**/*", lambda route: intercept_external(route, authorize=captured)
    )
    page = await context.new_page()
    await page.goto(
        BASE_URL + f"/{system}/login?" + urlencode({"redirect": destination})
    )
    await page.get_by_role("button", name="Lanjutkan dengan Google").click()
    await page.wait_for_url("**/auth/v1/authorize?**")
    assert len(captured) == 1, f"{system}: expected one Supabase authorize request"
    query = parse_qs(urlparse(captured[0]).query)
    assert query.get("provider") == ["google"], system
    target = urlparse(query["redirect_to"][0])
    assert target.netloc == urlparse(BASE_URL).netloc, system
    assert target.path == "/login", system
    callback_query = parse_qs(target.query)
    assert callback_query["oauth"] == ["google"], system
    assert callback_query["system"] == [system], system
    assert callback_query["redirect"] == [destination], system
    assert "/~oauth/" not in captured[0], system
    await context.close()
    print(f"PASS: {system} uses Supabase Google OAuth with its requested deep link")


async def check_cancelled(browser, fragment=False):
    context = await browser.new_context()
    await context.route("**/*", intercept_external)
    page = await context.new_page()
    error = {"error": "access_denied", "error_description": "private-provider-details"}
    target = callback() + "#" + urlencode(error) if fragment else callback(**error)
    await page.goto(target)
    await expect(page.get_by_role("alert")).to_contain_text("Login Google dibatalkan")
    link = page.get_by_role("link", name="Kembali ke login")
    await expect(link).to_have_attribute(
        "href", "/sim-klinik/login?redirect=%2Fsim-klinik"
    )
    assert "private-provider-details" not in await page.locator("body").inner_text()
    assert "error_description" not in page.url
    await context.close()
    print("PASS: cancelled OAuth callback is recoverable and removes provider details")


async def check_missing_session(browser):
    context = await browser.new_context()
    await context.route("**/*", intercept_external)
    page = await context.new_page()
    await page.goto(callback())
    await expect(page.get_by_role("alert")).to_contain_text("Login Google gagal")
    assert urlparse(page.url).path == "/login"
    await context.close()
    print("PASS: callback without a session does not enter the application")


async def check_success(browser):
    context = await browser.new_context()
    await context.route(
        "**/*", lambda route: intercept_external(route, authenticated=True)
    )
    page = await context.new_page()
    # Synthetic token accepted only by our intercepted user endpoint; never sent
    # to a real service. Domain requests are intercepted above as read fixtures.
    claims = {"sub": USER["id"], "exp": int(time.time()) + 3600}
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    fragment = urlencode(
        {
            "access_token": f"eyJhbGciOiJIUzI1NiJ9.{payload}.test-signature",
            "refresh_token": "synthetic-oauth-smoke-token",
            "expires_in": "3600",
            "token_type": "bearer",
        }
    )
    await page.goto(callback(system="apps", redirect="/apps") + "#" + fragment)
    await page.wait_for_url(BASE_URL + "/apps")
    assert "access_token" not in page.url
    session = await page.evaluate(
        """() => Object.entries(localStorage).some(([key, value]) =>
            key.endsWith('-auth-token') && value.includes('oauth-smoke@example.invalid'))"""
    )
    assert session, "Supabase should persist the verified callback session"
    await context.close()
    print("PASS: SDK consumes callback tokens and returns to the selected system")


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE") or None,
        )
        try:
            for system, destination in (
                ("sim-klinik", "/sim-klinik/registrasi?tab=baru"),
                ("finance", "/finance/laporan"),
                ("apps", "/apps/booking"),
            ):
                await check_initiation(browser, system, destination)
            await check_cancelled(browser)
            await check_cancelled(browser, fragment=True)
            await check_missing_session(browser)
            await check_success(browser)
        finally:
            await browser.close()
    print("PASS: all 7 Google OAuth browser scenarios completed")


if __name__ == "__main__":
    asyncio.run(main())
