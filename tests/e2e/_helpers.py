"""Shared helpers for SIM Klinik E2E tests."""
import re, base64, json
from playwright.async_api import Page, BrowserContext

EMPTY_TSS_BODY = json.dumps({
    "t": 10, "i": 0,
    "p": {
        "k": ["result", "error", "context"],
        "v": [{"t": 9, "i": 1, "a": [], "o": 0}, {"t": 3}, {"t": 3}],
    },
})


def _decode_fn(url: str) -> str:
    m = re.search(r"/_serverFn/([A-Za-z0-9_-]+)", url)
    if not m:
        return ""
    s = m.group(1) + "=" * ((4 - len(m.group(1)) % 4) % 4)
    try:
        return base64.b64decode(s).decode("utf-8", "ignore")
    except Exception:
        return ""


def is_list_dokter(url: str) -> bool:
    return "listDokter" in _decode_fn(url)


def is_create_booking(url: str) -> bool:
    return "createBooking" in _decode_fn(url)


async def login_demo(page: Page) -> None:
    await page.goto("http://localhost:8080/sim-klinik/login", wait_until="domcontentloaded")
    await page.locator("input[type=email]").first.fill("demo@prime.id")
    await page.locator("input[type=password]").first.fill("demo1234")
    await page.locator("button[type=submit]").first.click()
    await page.wait_for_url(re.compile(r"/sim-klinik(?!/login)"), timeout=15000)


async def login_finance_demo(page: Page) -> None:
    await page.goto("http://localhost:8080/finance/login", wait_until="domcontentloaded")
    await page.locator("input[type=email]").first.fill("demo-manajemen@prime.id")
    await page.locator("input[type=password]").first.fill("demo1234")
    await page.locator("button[type=submit]").first.click()
    await page.wait_for_url(re.compile(r"/finance(?!/login)"), timeout=15000)


async def open_form_with_new_patient(page: Page, name: str, phone: str) -> None:
    await page.get_by_role("button", name=re.compile("Pasien Baru")).click()
    await page.wait_for_selector('role=dialog')
    dlg = page.get_by_role("dialog")
    await dlg.locator("input").nth(0).fill(name)
    await dlg.locator("input").nth(1).fill(phone)
    await dlg.get_by_role("button", name="Daftar").click()
    await page.wait_for_timeout(2000)


async def rewrite_dokter_empty(ctx: BrowserContext, page: Page):
    """Intercept listDokter response and empty its TSS array."""
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
            new_body = json.dumps(parsed)
        except Exception:
            new_body = body
        return await route.fulfill(response=resp, body=new_body)
    await page.route("**/_serverFn/**", handler)
    return handler


# ---------- Debugging attachments (screenshots + console + DOM) ----------

def attach_console(page: Page, sink: list[str]) -> None:
    """Collect console + pageerror messages into `sink`."""
    page.on("console", lambda m: sink.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: sink.append(f"[pageerror] {e}"))
    page.on("requestfailed", lambda r: sink.append(f"[reqfail] {r.url} :: {r.failure}"))


async def snap(page: Page, out_dir, label: str) -> None:
    """Best-effort screenshot at an assert/action point. Never raises."""
    try:
        from pathlib import Path as _P
        d = _P(out_dir); d.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(d / f"{label}.png"))
    except Exception as e:
        print(f"[snap-fail:{label}] {e}")


async def dump_failure(page: Page, out_dir, console_sink: list[str], label: str = "FAILURE") -> None:
    """On test failure: screenshot + DOM + console log dump."""
    from pathlib import Path as _P
    d = _P(out_dir); d.mkdir(parents=True, exist_ok=True)
    try:
        await page.screenshot(path=str(d / f"{label}.png"))
    except Exception as e:
        print(f"[dump-screenshot-fail] {e}")
    try:
        html = await page.content()
        (d / f"{label}.html").write_text(html)
    except Exception as e:
        print(f"[dump-html-fail] {e}")
    try:
        (d / f"{label}.console.log").write_text("\n".join(console_sink))
    except Exception as e:
        print(f"[dump-console-fail] {e}")
    print(f"[failure-artifacts] dir={d}")
