"""Verify demo access for all three systems using intercepted auth responses.

No real login, account creation, role changes, or remote database writes occur.
Start a dev server with demo controls enabled before running this script.
"""

import asyncio
import json
import os
import re
import time
from urllib.parse import unquote, urlparse

from playwright.async_api import async_playwright, expect

expect.set_options(timeout=15000)


BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:8080").rstrip("/")
DEMO_EMAIL = "demo-kasir@prime.id"
USER = {
    "id": "00000000-0000-4000-8000-000000000002",
    "aud": "authenticated",
    "role": "authenticated",
    "email": DEMO_EMAIL,
    "app_metadata": {"provider": "email", "providers": ["email"]},
    "user_metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
}


async def check_login(browser, system, *, invalid_password=False, roles=None):
    granted_roles = ["kasir"] if roles is None else roles
    context = await browser.new_context()
    requests = {"token": 0, "signup": 0, "roles": 0}

    async def intercept(route):
        url = urlparse(route.request.url)
        if "/_serverFn/" in url.path:
            requests["roles"] += 1
            await route.fulfill(
                content_type="application/json",
                body=json.dumps({"result": {"roles": granted_roles}, "context": {}}),
            )
        elif url.netloc == urlparse(BASE_URL).netloc:
            await route.continue_()
        elif url.path == "/auth/v1/token":
            requests["token"] += 1
            payload = route.request.post_data_json
            assert payload["email"] == DEMO_EMAIL
            assert payload["password"] == "demo1234"
            assert url.query == "grant_type=password"
            if invalid_password:
                await route.fulfill(
                    status=400,
                    content_type="application/json",
                    body=json.dumps(
                        {"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"}
                    ),
                )
            else:
                await route.fulfill(
                    content_type="application/json",
                    body=json.dumps(
                        {
                            "access_token": "synthetic-demo-access-token",
                            "refresh_token": "synthetic-demo-refresh-token",
                            "token_type": "bearer",
                            "expires_in": 3600,
                            "expires_at": int(time.time()) + 3600,
                            "user": USER,
                        }
                    ),
                )
        elif url.path == "/auth/v1/user":
            await route.fulfill(content_type="application/json", body=json.dumps(USER))
        elif url.path == "/auth/v1/logout":
            await route.fulfill(status=204)
        elif url.path == "/auth/v1/signup":
            requests["signup"] += 1
            await route.fulfill(status=500)
        else:
            await route.abort()

    await context.route("**/*", intercept)
    page = await context.new_page()
    # Return to the system root; any domain data requests are intercepted above.
    await page.goto(BASE_URL + f"/{system}/login")
    button = page.get_by_role("button", name="Masuk dengan akun demo")
    await expect(button).to_be_visible()
    await expect(page.get_by_text(DEMO_EMAIL, exact=True)).to_be_visible()
    await button.click()

    if invalid_password or not granted_roles:
        await expect(page.get_by_role("alert")).to_be_visible()
        await expect(button).to_be_enabled()
        assert urlparse(page.url).path == f"/{system}/login"
        if not granted_roles:
            await expect(page.get_by_role("alert")).to_contain_text("belum punya peran")
        else:
            await expect(page.get_by_role("alert")).to_contain_text("Email atau password salah")
    else:
        await page.wait_for_url(re.compile(re.escape(BASE_URL) + f"/{system}/?$"))
        cookies = await context.cookies()
        marker = next(c for c in cookies if c["name"] == f"ph_session_{system}_v1")
        user = json.loads(unquote(marker["value"]))
        assert user["email"] == DEMO_EMAIL
        assert user["role"] == ("front_office" if system == "apps" else "kasir")
        if system != "apps":
            assert requests["roles"] >= 1, "Staff demo login must resolve roles through the server"

    assert requests["token"] == 1
    assert requests["signup"] == 0, "A failed demo login must not create a new account"
    await context.close()
    scenario = "bad password" if invalid_password else "role denied" if not granted_roles else "success"
    print(f"PASS: {system} demo {scenario}; existing identity and server permissions retained")


async def check_chooser(browser):
    context = await browser.new_context()
    page = await context.new_page()
    await page.goto(BASE_URL + "/login")
    await expect(page.get_by_text(DEMO_EMAIL, exact=True)).to_be_visible()
    await expect(page.get_by_text("Satu akun demo untuk Apps, SIM Klinik, dan Finance.")).to_be_visible()
    assert await page.get_by_text("demo@prime.id", exact=True).count() == 0
    await context.close()
    print("PASS: login chooser shows the same cashier demo account")


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            executable_path=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE") or None,
        )
        try:
            await check_chooser(browser)
            for system in ("apps", "sim-klinik", "finance"):
                await check_login(browser, system)
                await check_login(browser, system, invalid_password=True)
            for system in ("sim-klinik", "finance"):
                await check_login(browser, system, roles=[])
        finally:
            await browser.close()
    print("PASS: all 9 demo-access browser scenarios completed")


if __name__ == "__main__":
    asyncio.run(main())
