# PackshotForge

A **GIMP 3 plug-in** that rebuilds the background of a product photo with an image model — and then composites your **original product pixels** back on top, so the model can't redraw your label.

Free. No account, no subscription, no credit meter. It runs on your own Google Gemini API key, and generation is billed to you by the provider directly.

- [⬇ Download gimp/packshotforge/packshotforge.py](../../raw/main/gimp/packshotforge/packshotforge.py) — **no pip, no dependencies**: copy one folder into GIMP's plug-ins directory. Uses only the Python that ships inside GIMP 3.

Then follow [INSTALL.md](INSTALL.md) (about two minutes).

> **The Photoshop script is no longer distributed** (removed 17 November 2026). This repository now holds the GIMP 3 plug-in only.

---

## What it does

Open a raw photo of your product in GIMP, select the product, run the plug-in, pick a scene. The image model reconstructs the background around your product, and the result arrives **as layers in your document** — mask it, retouch it, export it your way.

- **Scene presets** for e-commerce product photos, including a pure white marketplace background
- **Marketplace export sizes built in** — Amazon 2000×2000 white, Etsy 3000×2400, Shopify 2048×2048

## Pixel-Lock

The usual failure of AI product photos is subtle: the model redraws your label. Text drifts into text-shaped noise, a logo becomes a logo-shaped smudge.

Pixel-Lock doesn't ask the model to behave. After generation, the plug-in masks your **original** product with your active selection and composites it back over the generated scene. Generated pixels only survive where the product isn't. Select the product before running — Fuzzy Select the background, then `Select > Invert`, is the fast path.

## What it costs

The plug-in is free. Image generation is billed by the provider on your own key — **there is no free tier for image generation**.

| Mode | Approx. per image |
|---|---|
| Standard | $0.067 |
| Draft mode | $0.039 |

You see the estimated cost and confirm before every billable call. Your photos go from your machine to the provider's API; nothing passes through me.

## Requirements

- GIMP 3.0 or newer (macOS, Linux, Windows) — nothing else; the plug-in is standard-library-only Python
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com) — the key is free to create, generation is not

## Known limits

- Single image per run, Gemini only.
- Windows and Linux have not been tested on real hardware; the paths are standard but I only run macOS.
- Presets are prompts. A weak prompt erases half a background — if you write your own, describe the surface, the light, the background, and the style.

## Bugs and requests

Open an issue.

**Not affiliated with Google or the GIMP project.** "Gemini" is Google's model name, used descriptively.
