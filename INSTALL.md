# PackshotForge — Install & Quick Start (2 minutes)

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
