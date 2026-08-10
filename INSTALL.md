# PackshotForge — Install & Quick Start (2 minutes)

> Using **GIMP** instead of Photoshop? Skip to [GIMP 3 install](#gimp-3-install) below — same idea, one folder copy, no dependencies.

## 1. Get your Google Gemini API key (the key itself is free to create)
1. Go to https://aistudio.google.com and sign in with any Google account.
2. Click **Get API key** → **Create API key**. Copy it.
   - Image generation is billed per image on your own key — roughly $0.02–$0.07/image depending on model, half that in Batch mode (see pricing in-app). There is no free-image allowance for the image-generation models. If you see "Invalid Key", enable billing in Google AI Studio and check that your country is supported: https://ai.google.dev/gemini-api/docs/available-regions

## 2. Install the script
- **Option A (quick):** In Photoshop: `File > Scripts > Browse…` and pick `PackshotForge.jsx`.
- **Option B (permanent menu entry):** Copy `PackshotForge.jsx` into Photoshop's Scripts folder, then restart Photoshop:
  - macOS: `/Applications/Adobe Photoshop [version]/Presets/Scripts/`
  - Windows: `C:\Program Files\Adobe\Adobe Photoshop [version]\Presets\Scripts\`
  It then appears under `File > Scripts > PackshotForge`.

## 3. First run
1. Open a product photo.
2. Run PackshotForge, paste your API key (saved locally for next time).
3. Pick a scene preset (start with **Pure White Background**), click **Generate**.
4. The result lands as a new layer. Pick a marketplace in "Output" to also save a correctly-sized listing JPG.

## Batch mode
Choose **Batch folder**, then select an input folder of jpg/png photos and an output folder. In v1.1 you can select **multiple presets** — every image is rendered with every selected preset (M×N), and a batch report (successes, transparency checks, estimated cost) is shown and saved alongside the results.

## What's new in v1.2
- **Mask preflight before you're billed:** when Pixel-Lock is on, the script now runs Select Subject *before* calling the API and shows you the outline it found, along with what that image will cost on your key. Photoshop's Select Subject is a local operation and costs nothing, so if it missed the product — or grabbed the whole canvas — you can cancel and fix the shot without having paid for a generation. Cancelling charges nothing.
- Batch runs skip the prompt (it would defeat the point of batching), and so does the Subscription Bridge import, which never calls the API.
- To turn the prompt off, add `preflight=off` to your config file (`~/Library/Application Support/PackshotForge/config.txt` on macOS).

## What's new in v1.1
- **Pixel-Lock (on by default):** your original product pixels are composited back on top of the generated background using a Select Subject mask — the AI can never redraw your label or product surface. The result dialog shows PIXEL-LOCKED ✓ (or VISUAL CHECK ⚠ if the mask couldn't be applied, so you know to eyeball it).
- **Transparent cutout export:** one click saves a verified-alpha PNG of just your product.
- **Async Batch API (50% off):** submit a folder as a Gemini batch job and fetch results later at half price. Note: fetched images are raw PNGs (no Pixel-Lock compositing or marketplace export at fetch time).
- **Draft mode (experimental):** explore compositions with the cheaper lite model at 768px, then re-render only the keepers at full quality.
- **Stability provider (optional):** replace-background-and-relight ($0.08/image flat, native subject preservation, new accounts get 25 free credits).

## Requirements & notes
- Photoshop CC 2015+ recommended, macOS or Windows 10+ (uses the built-in `curl`).
- Your images go directly from your machine to Google's API. Nothing passes through our servers.
- Support: reply on Gumroad or email — answers within 24h.

---

# GIMP 3 install

**No pip. No dependencies. Copy one folder.** The plug-in uses only the Python that ships inside GIMP 3.

1. Get a Gemini API key (step 1 above — same key works for both builds).
2. Copy the `gimp/packshotforge/` folder into GIMP's plug-ins folder:
   - **macOS:** `~/Library/Application Support/GIMP/3.2/plug-ins/` (or `3.0` for GIMP 3.0.x)
   - **Linux:** `~/.config/GIMP/3.2/plug-ins/` (Flatpak: `~/.var/app/org.gimp.GIMP/config/GIMP/3.2/plug-ins/`)
   - **Windows:** `C:\Users\<you>\AppData\Roaming\GIMP\3.2\plug-ins\`
   The result must be `plug-ins/packshotforge/packshotforge.py` (folder name = file name — GIMP requires this).
3. macOS/Linux only: make it executable — `chmod +x .../plug-ins/packshotforge/packshotforge.py` (the download usually preserves this already).
4. Restart GIMP. You'll find **Filters > PackshotForge > Generate Scene…** and **Marketplace Export…**.

## First run (GIMP)
1. Open a product photo.
2. **Select the product** — fastest: Fuzzy Select (U) the background, then `Select > Invert`. This selection becomes the **Pixel-Lock** mask: your original product pixels are composited back over the generated scene, so the model can never redraw your label. (No selection? It still works, just without the lock — you'll be warned before anything is billed.)
3. `Filters > PackshotForge > Generate Scene…`, paste your API key (stored locally, file readable only by you), pick a preset, OK.
4. Before the billable call you'll see a confirmation with the estimated cost (~$0.067/image standard, ~$0.039 draft mode). Cancelling costs nothing.
5. The result lands as a layer stack: generated scene + `PSF Product (original)` masked to your selection on top.
6. `Marketplace Export…` saves a correctly-sized listing JPG (Amazon 2000×2000 white / Etsy 3000×2400 / Shopify 2048×2048).

## GIMP build — current limits
- Single image per run (the Photoshop build's batch folder mode is on the roadmap for the GIMP build).
- Gemini only (no Stability provider yet).
- The generation call is synchronous — GIMP will busy-wait ~10–20 s while Google renders. The progress bar keeps moving.
