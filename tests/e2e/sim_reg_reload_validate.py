"""E2E: reload setelah sebagian field terisi → state reset, form awal kembali,
tombol Buat Booking tidak ada / disabled sampai patient & dokter dipilih lagi."""
import asyncio, sys, time
from pathlib import Path
from playwright.async_api import async_playwright
sys.path.insert(0, str(Path(__file__).parent))
from _helpers import login_demo, open_form_with_new_patient

SHOT = Path("/tmp/browser/sim-reg-reload/shots"); SHOT.mkdir(parents=True, exist_ok=True)
NAMA = f"Reload {int(time.time())}"
HP = "0813" + str(int(time.time()))[-7:]

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await login_demo(page)
        await page.goto("http://localhost:8080/sim-klinik/registrasi", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Isi sebagian: daftar pasien baru → form terbuka, tapi belum pilih dokter
        await open_form_with_new_patient(page, NAMA, HP)
        # Pastikan form muncul + banner validasi "Pilih dokter terlebih dahulu."
        validation_before = await page.locator('[data-testid="form-validation"]').count()
        btn = page.get_by_role("button", name="Buat Booking").first
        disabled_before = await btn.is_disabled()
        await page.screenshot(path=str(SHOT/"1_partial.png"))

        # Reload — state in-memory hilang, form awal muncul lagi (pilih/daftar pasien dulu).
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(SHOT/"2_after_reload.png"))

        # Tombol Buat Booking tidak boleh ada (selectedP null → form tertutup)
        btn_count = await page.get_by_role("button", name="Buat Booking").count()
        # Tombol pilih pasien tersedia → alur dipaksa mulai dari awal
        pick_btn = await page.get_by_role("button", name="Cari Pasien").count()
        new_btn = await page.get_by_role("button", name="Pasien Baru").count()
        # Validasi banner tidak muncul karena form tertutup
        validation_after = await page.locator('[data-testid="form-validation"]').count()

        # Tetap disabled sampai semua data benar: pilih ulang pasien, jangan pilih dokter
        await open_form_with_new_patient(page, NAMA + " B", "0814" + str(int(time.time()))[-7:])
        btn2 = page.get_by_role("button", name="Buat Booking").first
        disabled_no_dok = await btn2.is_disabled()
        validation_no_dok = await page.locator('[data-testid="form-validation"]:has-text("Pilih dokter")').count()
        await page.screenshot(path=str(SHOT/"3_revalidated.png"))

        print(f"validation_before={validation_before} disabled_before={disabled_before} "
              f"btn_count_after_reload={btn_count} pick={pick_btn} new={new_btn} "
              f"validation_after_reload={validation_after} disabled_no_dok={disabled_no_dok} "
              f"validation_no_dok_msg={validation_no_dok}")

        ok = (validation_before >= 1 and disabled_before
              and btn_count == 0 and pick_btn >= 1 and new_btn >= 1
              and validation_after == 0
              and disabled_no_dok and validation_no_dok >= 1)
        print("RESULT:", "PASS" if ok else "FAIL")
        await b.close()
        return 0 if ok else 1

sys.exit(asyncio.run(main()))
