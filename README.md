# PackshotForge

A **Photoshop script + GIMP 3 plug-in** that rebuilds the background of a product photo with an image model — and then composites your **original product pixels** back on top, so the model can't redraw your label.

Free. No account, no subscription, no credit meter. It runs on your own Google Gemini (or Stability) API key, and generation is billed to you by the provider directly.

- **Photoshop:** [⬇ Download PackshotForge.jsx](../../raw/main/PackshotForge.jsx) — one file, no signup.
- **GIMP 3:** [⬇ Download gimp/packshotforge/packshotforge.py](../../raw/main/gimp/packshotforge/packshotforge.py) — **no pip, no dependencies**: copy one folder into GIMP's plug-ins directory. Uses only the Python that ships inside GIMP.

Then follow [INSTALL.md](INSTALL.md) (about two minutes either way).

---

## What it does

Open a raw photo of your product in Photoshop, run the script, pick a scene. The image model reconstructs the background around your product, and the result arrives **as a layer in your document** — mask it, retouch it, combine scenes. You are not downloading a flat JPEG from someone else's server.

- **21 e-commerce scene presets** — pure white marketplace background, cosmetics (marble counter, silk & petals, water splash, clinical), jewelry (dark velvet, macro sparkle, raw stone), apparel (ghost mannequin, styled flat lay), food (rustic wood, dark moody)
- **Marketplace export sizes built in** — Amazon 2000×2000 white, Etsy 3000×2400, Shopify 2048×2048
- **Batch mode** — a folder of raw photos in, finished listing images out, every photo × every selected preset, with a report
- **Transparent product cutout** — one click, with verified alpha

## Pixel-Lock

The usual failure of AI product photos is subtle: the model redraws your label. Text drifts into text-shaped noise, a logo becomes a logo-shaped smudge. Prompting the model to preserve the product helps, but it does not guarantee anything.

Pixel-Lock (on by default) doesn't ask. After generation, the script masks your **original** product and composites it back over the generated scene. Generated pixels only survive where the product isn't, so label text, logo, and surface texture are byte-identical to what you shot. The result dialog shows `PIXEL-LOCKED ✓` with an original/result toggle.

The mask source differs per app: **Photoshop** runs Select Subject automatically; **GIMP** uses your active selection (select the product before running — Fuzzy Select the background then `Select > Invert` is the fast path). Either way you see the outline and the exact cost *before* anything is billed, and cancelling costs nothing.

One thing that matters: the prompt pins the product to the exact same position, scale, and orientation. Without that, the generated copy of the product peeks out from behind the composited layer as a ghost.

## What it costs

The script is free. Image generation is billed by the provider on your own key — **there is no free tier for image generation**, and anyone telling you otherwise (including an earlier version of my own launch post) is wrong.

| Mode | Approx. per image |
|---|---|
| Standard (`gemini-3.1-flash-image`) | $0.067 |
| Batch API (async, ~half price) | $0.034 |
| Draft mode (experimental, lite model) | $0.020–0.039 |
| Stability (native subject preserve) | $0.080 flat |

A ten-image listing shoot lands well under a dollar. Your photos go from your machine to the provider's API; nothing passes through me.

## Requirements

- **Photoshop build:** Photoshop CC 2015 or newer (macOS or Windows 10+), `curl` (built into macOS and Windows 10+)
- **GIMP build:** GIMP 3.0 or newer (macOS, Linux, Windows) — nothing else; the plug-in is standard-library-only Python
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com) — the key is free to create, generation is not

## Known limits

- **Select Subject decides what counts as "the product"** (Photoshop build). It is weak on transparent and wispy subjects — glass bottles, chiffon, loose hair. Those need a manual mask. The GIMP build sidesteps this: the mask is whatever you selected.
- **GIMP build is v1.0:** single image per run, Gemini only. Batch folder mode and the Stability provider exist in the Photoshop build and are on the GIMP roadmap.
- **Batch mode is where the time savings are, and it is the least battle-tested path.** Start with a small folder.
- Windows has not been tested on real hardware; the paths are standard but I only run macOS.
- Presets are prompts. A weak prompt erases half a background — if you write your own, describe the surface, the light, the background, and the style.

## Bugs and requests

Open an issue. Which scene presets you'd actually use is the feedback I want most.

**Not affiliated with Google or Adobe.** "Gemini" and "Nano Banana" are Google's model names, used descriptively.
