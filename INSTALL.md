# PackshotForge for GIMP 3 — Install & Quick Start (2 minutes)

## 1. Get your Google Gemini API key (the key itself is free to create)
1. Go to https://aistudio.google.com and sign in with any Google account.
2. Click **Get API key** → **Create API key**. Copy it.
   - Image generation is billed per image on your own key — roughly $0.02–$0.07/image depending on model. There is no free-image allowance for the image-generation models. If you see "Invalid Key", enable billing in Google AI Studio and check that your country is supported: https://ai.google.dev/gemini-api/docs/available-regions

## 2. Install the plug-in

**No pip. No dependencies. Copy one folder.** The plug-in uses only the Python that ships inside GIMP 3.

1. Copy the `gimp/packshotforge/` folder into GIMP's plug-ins folder:
   - **macOS:** `~/Library/Application Support/GIMP/3.2/plug-ins/` (or `3.0` for GIMP 3.0.x)
   - **Linux:** `~/.config/GIMP/3.2/plug-ins/` (Flatpak: `~/.var/app/org.gimp.GIMP/config/GIMP/3.2/plug-ins/`)
   - **Windows:** `C:\Users\<you>\AppData\Roaming\GIMP\3.2\plug-ins\`
   The result must be `plug-ins/packshotforge/packshotforge.py` (folder name = file name — GIMP requires this).
2. macOS/Linux only: make it executable — `chmod +x .../plug-ins/packshotforge/packshotforge.py` (the download usually preserves this already).
3. Restart GIMP. You'll find **Filters > PackshotForge > Generate Scene…** and **Marketplace Export…**.

## 3. First run
1. Open a product photo.
2. **Select the product** — fastest: Fuzzy Select (U) the background, then `Select > Invert`. This selection becomes the **Pixel-Lock** mask: your original product pixels are composited back over the generated scene, so the model can never redraw your label. (No selection? It still works, just without the lock — you'll be warned before anything is billed.)
3. `Filters > PackshotForge > Generate Scene…`, paste your API key (stored locally, file readable only by you), pick a preset, OK.
4. Before the billable call you'll see a confirmation with the estimated cost (~$0.067/image standard, ~$0.039 draft mode). Cancelling costs nothing.
5. The result lands as a layer stack: generated scene + `PSF Product (original)` masked to your selection on top.
6. `Marketplace Export…` saves a correctly-sized listing JPG (Amazon 2000×2000 white / Etsy 3000×2400 / Shopify 2048×2048).

## Current limits
- Single image per run.
- Gemini only.
- The generation call is synchronous — GIMP will busy-wait ~10–20 s while Google renders. The progress bar keeps moving.
