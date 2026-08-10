#!/usr/bin/env python3
# PackshotForge for GIMP 3 — AI product-photo backgrounds on your own Gemini key.
# Free, MIT. https://github.com/nsjokt/packshotforge
#
# Installation is "copy one folder": this file uses ONLY the Python standard
# library that ships inside GIMP plus GIMP's own gi bindings. Do not add any
# import that would require pip.

import base64
import os
import sys
import tempfile

import gi

gi.require_version("Gimp", "3.0")
from gi.repository import Gimp, Gio, GLib, GObject  # noqa: E402

PSF_GIMP_VERSION = "1.0.0"
PSF_MAX_SEND_PX = 1536
PSF_DRAFT_MAX_SEND_PX = 768
PSF_MODEL = "gemini-3.1-flash-image"
PSF_DRAFT_MODEL = "gemini-3.1-flash-lite-image"

# ---- inlined: psf_core/presets.py ----
# PackshotForge scene presets.
# Ported verbatim from src/core/presets.js — that file is the canonical source;
# keep the two in sync (tests/test_core.py pins the 21/5/5/5/5/1 contract).
# Prompts are written for image-editing models (Gemini flash-image / "Nano Banana"):
# they assume an input product photo and describe the desired scene around the
# unchanged product.

PRESETS = [
    {
        "id": "white-bg",
        "category": "core",
        "label": "Pure White Background (marketplace)",
        "prompt": "Replace the entire background with a seamless pure white background (#FFFFFF) suitable for Amazon and marketplace listings. Add a soft, realistic contact shadow under the product. Even studio lighting, no color cast.",
    },

    {"id": "cosmetics-marble", "category": "cosmetics", "label": "Marble Counter",
     "prompt": "Place the product on a white marble bathroom counter with soft morning window light from the left, subtle reflections on the marble, blurred spa-like background with green plant leaves. Premium skincare advertisement style."},
    {"id": "cosmetics-water", "category": "cosmetics", "label": "Water Splash",
     "prompt": "Place the product standing in shallow rippling water with gentle splash droplets frozen mid-air around it, pastel gradient studio backdrop, crisp commercial beauty lighting, dewy fresh mood."},
    {"id": "cosmetics-silk", "category": "cosmetics", "label": "Silk & Petals",
     "prompt": "Place the product on flowing champagne-colored silk fabric with scattered rose petals, warm golden soft light, shallow depth of field, luxury cosmetics editorial style."},
    {"id": "cosmetics-tropical", "category": "cosmetics", "label": "Tropical Shadow",
     "prompt": "Place the product on a warm beige stone pedestal with hard sunlight casting sharp palm-leaf shadows across the scene, summery premium sunscreen advertisement look."},
    {"id": "cosmetics-clinical", "category": "cosmetics", "label": "Clean Clinical",
     "prompt": "Place the product on a glossy white acrylic surface with a cool light-blue gradient background, precise soft reflections, minimal dermatological laboratory aesthetic."},

    {"id": "jewelry-velvet", "category": "jewelry", "label": "Dark Velvet",
     "prompt": "Place the product on deep navy velvet fabric with a single dramatic spotlight, rich specular sparkle on metal and stones, dark luxurious jewelry-box mood, black vignette background."},
    {"id": "jewelry-stone", "category": "jewelry", "label": "Raw Stone",
     "prompt": "Place the product draped over a rough natural slate stone with soft diffused daylight, neutral gray tones that make the metal glow, organic high-end jewelry editorial style."},
    {"id": "jewelry-macro", "category": "jewelry", "label": "Macro Sparkle",
     "prompt": "Extreme close-up composition of the product on a mirror-black surface, pinpoint star sparkles on facets, shallow depth of field with bokeh light dots in the background, dramatic luxury macro shot."},
    {"id": "jewelry-hand", "category": "jewelry", "label": "Champagne Silk Drape",
     "prompt": "Place the product elegantly arranged on draped ivory silk with pearl accents nearby, soft warm boudoir lighting, romantic bridal jewelry advertisement style."},
    {"id": "jewelry-minimal", "category": "jewelry", "label": "Minimal Pedestal",
     "prompt": "Place the product on a small matte ceramic pedestal against a warm beige seamless background, gentle top-left key light, contemporary minimal gallery presentation."},

    {"id": "apparel-flatlay", "category": "apparel", "label": "Styled Flat Lay",
     "prompt": "Arrange the product as a neat flat lay on a light linen surface, styled with subtle complementary accessories at the edges, soft even overhead daylight, clean fashion catalog look."},
    {"id": "apparel-ghost", "category": "apparel", "label": "Ghost Mannequin",
     "prompt": "Present the garment as an invisible ghost mannequin shot: natural filled 3D shape as if worn, no person visible, pure light-gray studio background, sharp e-commerce fashion lighting."},
    {"id": "apparel-street", "category": "apparel", "label": "Urban Backdrop",
     "prompt": "Place the product against a blurred sunlit city street background with warm golden-hour tones, product in crisp focus, streetwear lookbook advertisement style."},
    {"id": "apparel-hanger", "category": "apparel", "label": "Boutique Rack",
     "prompt": "Show the product hanging on a wooden hanger against a warm boutique interior with soft window light and blurred clothing rack in the background, premium retail presentation."},
    {"id": "apparel-texture", "category": "apparel", "label": "Fabric Detail",
     "prompt": "Close-up composition emphasizing the fabric texture of the product, draped naturally over a neutral surface, raking side light that reveals weave and material quality, tactile editorial style."},

    {"id": "food-rustic", "category": "food", "label": "Rustic Wood",
     "prompt": "Place the product on a rustic dark wooden table with scattered raw ingredients around it, warm side window light, cozy artisanal food photography style with shallow depth of field."},
    {"id": "food-bright", "category": "food", "label": "Bright Cafe",
     "prompt": "Place the product on a white cafe table with bright airy daylight, soft shadows, a blurred pastel cafe interior background, fresh appetizing commercial food look."},
    {"id": "food-dark", "category": "food", "label": "Dark Moody",
     "prompt": "Place the product on dark slate with dramatic low-key chiaroscuro lighting, steam or crumbs as natural styling, moody gourmet restaurant advertisement style."},
    {"id": "food-picnic", "category": "food", "label": "Outdoor Picnic",
     "prompt": "Place the product on a checkered picnic blanket on green grass with soft summer sunlight and blurred park background, cheerful lifestyle food branding."},
    {"id": "food-splash", "category": "food", "label": "Ingredient Splash",
     "prompt": "Dynamic composition of the product with its key ingredients splashing or falling around it mid-air, clean gradient studio background, high-speed commercial food advertisement energy."},
]

# ---- inlined: psf_core/prompt_builder.py ----
# Prompt builder — ported from src/core/promptBuilder.js.


BASE_INSTRUCTIONS = (
    "Edit this product photo. Keep the product itself completely unchanged: "
    "preserve its exact shape, proportions, colors, materials, label text and logo placement. "
    "Only change the environment as instructed. Photorealistic result, correct perspective, "
    "natural shadows and reflections consistent with the new scene."
)

PIXEL_LOCK_INSTRUCTIONS = (
    "Reconstruct ONLY the background/scene. Keep the product in the exact same position, "
    "scale, and orientation as the original photo - do not straighten, move, or resize it. "
    "The product will be composited from the original photo, so background edges must blend "
    "naturally around the subject silhouette."
)


def find_preset(preset_id):
    for preset in PRESETS:
        if preset["id"] == preset_id:
            return preset
    return None


def build_prompt(preset_id, custom_text="", pixel_lock=False):
    parts = [BASE_INSTRUCTIONS]

    if preset_id:
        preset = find_preset(preset_id)
        if preset is None:
            raise ValueError("unknown preset: %s" % preset_id)
        parts.append(preset["prompt"])

    if custom_text:
        parts.append(custom_text)

    if pixel_lock:
        parts.append(PIXEL_LOCK_INSTRUCTIONS)

    return " ".join(parts)

# ---- inlined: psf_core/pricing.py ----
# Pricing — ported from src/core/pricing.js (the canonical price source for the
# whole product; tests/test_pricing.py snapshot-pins these values against drift).
# Verified 2026-07-25 against official pricing pages. USD per output image.

PRICES = {
    "gemini": {
        "gemini-3.1-flash-image":      {"std": 0.067, "batch": 0.034},
        "gemini-3.1-flash-lite-image": {"std": 0.039, "batch": 0.0195},
        "gemini-2.5-flash-image":      {"std": 0.039, "batch": 0.0195},
        "_default":                    {"std": 0.067, "batch": 0.034},
    },
    "stability": {"_default": {"std": 0.08, "batch": 0.08}},
}


def estimate_cost(provider, model, count, is_batch=False):
    table = PRICES.get(provider) or PRICES["gemini"]
    row = table.get(model) or table["_default"]
    unit = row["batch"] if is_batch else row["std"]
    return unit * count


def format_cost(n):
    return "$%.3f" % n if n < 0.1 else "$%.2f" % n

# ---- inlined: psf_core/integrity.py ----
# Pixel-Lock integrity, transparency verification, and batch-report logic.
# Ported from src/core/integrity.js. Pure decision functions, no GIMP imports.


def _is_valid_mask_bounds(mask_bounds):
    if not mask_bounds:
        return False
    if len(mask_bounds) != 4:
        return False
    for v in mask_bounds:
        if not isinstance(v, (int, float)) or v != v:  # v != v catches NaN
            return False
    if mask_bounds[2] <= mask_bounds[0]:
        return False
    if mask_bounds[3] <= mask_bounds[1]:
        return False
    return True


def _clamp(v, lo, hi):
    return max(lo, min(v, hi))


def label_crop_rect(doc_w, doc_h, mask_bounds, pad):
    if not _is_valid_mask_bounds(mask_bounds):
        return {"x": 0, "y": 0, "w": doc_w, "h": doc_h}
    x1 = _clamp(mask_bounds[0] - pad, 0, doc_w)
    y1 = _clamp(mask_bounds[1] - pad, 0, doc_h)
    x2 = _clamp(mask_bounds[2] + pad, 0, doc_w)
    y2 = _clamp(mask_bounds[3] + pad, 0, doc_h)
    return {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1}


def mask_sanity(mask_bounds, doc_w, doc_h):
    if not _is_valid_mask_bounds(mask_bounds):
        return {"ok": False, "reason": "no-selection"}
    area = (mask_bounds[2] - mask_bounds[0]) * (mask_bounds[3] - mask_bounds[1])
    doc_area = doc_w * doc_h
    if doc_area <= 0:
        return {"ok": False, "reason": "no-selection"}
    ratio = area / doc_area
    if ratio < 0.01:
        return {"ok": False, "reason": "too-small"}
    if ratio > 0.98:
        return {"ok": False, "reason": "full-frame"}
    return {"ok": True, "reason": ""}


def alpha_verdict(has_alpha_channel, format_ext):
    ext = (format_ext or "").lower()
    if ext != "png":
        return {"ok": True, "reason": "n/a"}
    if not has_alpha_channel:
        return {"ok": False, "reason": "png-no-alpha"}
    return {"ok": True, "reason": ""}


def build_batch_report(results, pricing_line):
    results = results or []
    total = len(results)
    succeeded = sum(1 for r in results if r["ok"])
    transparency_verified = sum(1 for r in results if r.get("alphaOk") is True)
    failures = [r for r in results if not r["ok"]]

    lines = ["PackshotForge batch report",
             "%d/%d succeeded" % (succeeded, total),
             "transparency verified: %d" % transparency_verified]
    if failures:
        lines.append("FAILED:")
        for f in failures:
            lines.append("- %s (%s): %s" % (f["name"], f["preset"], f["error"]))
    lines.append(pricing_line)
    return "\n".join(lines)

# ---- inlined: psf_core/preflight.py ----
# Pre-commit mask preflight — ported from src/core/preflight.js.
#
# Decide whether to show the user their selection-based Pixel-Lock outcome
# BEFORE spending money on generation, and what to tell them. Checking the
# active selection is free; generation is not, so a bad mask becomes a
# cancellable prompt instead of a wasted charge.
#
# GIMP adaptation: the mask source is the user's active selection (GIMP has no
# Select Subject), so the wording talks about "your selection". The decision
# logic is unchanged from the Photoshop version.



def _preflight_warn_text(reason):
    if reason == "full-frame":
        return "The selection covers almost the whole canvas — there is no background left to replace."
    if reason == "too-small":
        return "The selection covers less than 1% of the canvas — it probably missed the product."
    return ("There is no active selection, so PackshotForge can't lock the product pixels. "
            "(Select the product first — e.g. Fuzzy Select the background, then Select > Invert.)")


def preflight_gate(mask_bounds, doc_w, doc_h, opts=None):
    """mask_bounds: [x1, y1, x2, y2] from the active selection, or None.

    opts: {pixelLock, isBatch, provider, model}
    Returns {action: "skip"|"confirm"|"warn", ok, reason, message}."""
    opts = opts or {}

    if not opts.get("pixelLock"):
        return {"action": "skip", "ok": True, "reason": "pixel-lock-off", "message": ""}
    if opts.get("isBatch"):
        return {"action": "skip", "ok": True, "reason": "batch", "message": ""}

    price = format_cost(estimate_cost(opts.get("provider"), opts.get("model"), 1, False))
    sanity = mask_sanity(mask_bounds, doc_w, doc_h)

    if sanity["ok"]:
        return {
            "action": "confirm",
            "ok": True,
            "reason": "",
            "message": ("Your active selection will be used as the product outline (Pixel-Lock) — "
                        "the original pixels inside it will be composited back over the generated scene.\n\n"
                        "Generating this image costs about " + price + " on your own API key.\n\n"
                        "Proceed?"),
        }

    return {
        "action": "warn",
        "ok": False,
        "reason": sanity["reason"],
        "message": (_preflight_warn_text(sanity["reason"]) + "\n\n"
                    "Pixel-Lock will be off for this image, so the model may redraw labels and edges.\n\n"
                    "Generating anyway costs about " + price + " on your own API key.\n\n"
                    "Proceed?"),
    }

# ---- inlined: psf_core/api_payload.py ----
# Gemini image API payload builder + response parser.
# Ported from src/core/apiPayload.js, reimplemented on json.dumps/json.loads
# (the regex approach existed only because ExtendScript lacks JSON.parse).

import json
import re


def sanitize_token(s):
    """Strip a string pulled out of a remote API response down to a conservative
    allow-list before it is used in a file path or URL, so an odd response body
    can't inject path traversal or shell metacharacters."""
    if s is None:
        return None
    return re.sub(r"[^A-Za-z0-9/_.\-]", "", str(s))


def build_generate_content_payload(prompt, image_base64, mime_type):
    return json.dumps({
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": image_base64}},
            ],
        }],
    })


def _find_image_data(node):
    if isinstance(node, dict):
        for key in ("inline_data", "inlineData", "output_image"):
            child = node.get(key)
            if isinstance(child, dict) and isinstance(child.get("data"), str) and child["data"]:
                return child["data"]
        for value in node.values():
            found = _find_image_data(value)
            if found:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _find_image_data(value)
            if found:
                return found
    return None


def extract_image_base64(response_text):
    """Return the first base64 image payload in a Gemini response, or None.
    Tolerant of camelCase/snake_case and of the interactions output_image shape."""
    if not response_text:
        return None
    try:
        parsed = json.loads(response_text)
    except ValueError:
        return None
    return _find_image_data(parsed)


def extract_error_message(response_text, limit=200):
    """Best-effort human-readable error out of an API error body."""
    if not response_text:
        return None
    try:
        parsed = json.loads(response_text)
        error = parsed.get("error") if isinstance(parsed, dict) else None
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])[:limit]
    except ValueError:
        pass
    m = re.search(r'"message"\s*:\s*"([^"]{1,200})"', response_text)
    return m.group(1) if m else None

# ---- inlined: psf_core/export_specs.py ----
# Marketplace export specs — ported from src/core/exportSpecs.js.
# Amazon main image requires pure white background, min 1000px (2000px
# recommended for zoom); Etsy recommends 3000x2400 (5:4); Shopify 2048x2048.

EXPORT_SPECS = {
    "amazon":  {"width": 2000, "height": 2000, "background": "#FFFFFF", "format": "jpg", "quality": 90},
    "etsy":    {"width": 3000, "height": 2400, "background": None,      "format": "jpg", "quality": 90},
    "shopify": {"width": 2048, "height": 2048, "background": None,      "format": "jpg", "quality": 90},
}


def get_export_spec(marketplace):
    return EXPORT_SPECS.get(marketplace)

# ---- inlined: psf_core/config_store.py ----
# Config persistence — same key=value line format as the Photoshop build
# (src/jsx/io.jsx psfLoadConfig/psfSaveConfig), stored in GIMP's own directory.
#
# The Photoshop config (~/Library/Application Support/PackshotForge/config.txt)
# is read ONCE as an apiKey fallback so a PS-build user doesn't retype the key,
# but is never written: the two builds' schemas must be free to drift.

import os
import stat

ALLOWED_KEYS = ("apiKey", "model", "lastPreset", "preflight")

DEFAULTS = {
    "apiKey": "",
    "model": "gemini-3.1-flash-image",
    "lastPreset": "white-bg",
    "preflight": "on",
}


def parse_config(text):
    cfg = dict(DEFAULTS)
    for line in (text or "").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key in ALLOWED_KEYS:
            cfg[key] = value.strip()
    return cfg


def serialize_config(cfg):
    # Always write every allowed key: dropping one (e.g. preflight) would
    # silently erase a user's explicit preflight=off on the next save.
    merged = dict(DEFAULTS)
    for key in ALLOWED_KEYS:
        if key in (cfg or {}):
            merged[key] = cfg[key]
    return "".join("%s=%s\n" % (key, merged[key]) for key in ALLOWED_KEYS)


def load_config(path, ps_config_path=None):
    cfg = dict(DEFAULTS)
    if path and os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            cfg = parse_config(f.read())
    elif ps_config_path and os.path.isfile(ps_config_path):
        with open(ps_config_path, "r", encoding="utf-8") as f:
            ps_cfg = parse_config(f.read())
        cfg["apiKey"] = ps_cfg.get("apiKey", "")
    return cfg


def save_config(path, cfg):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(serialize_config(cfg))
    os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)  # 0o600 — the file holds an API key

# ---- inlined: psf_core/gemini_client.py ----
# Gemini REST client — stdlib only (urllib), no pip dependencies.
# The whole point of this build is that installation is "copy one folder":
# do NOT import anything that isn't in the Python standard library.

import urllib.error
import urllib.request


GENERATE_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
DEFAULT_TIMEOUT_S = 180


class GeminiError(Exception):
    pass


def generate_url(model):
    return GENERATE_ENDPOINT_BASE + model + ":generateContent"


def post_generate(api_key, model, payload_str, timeout=DEFAULT_TIMEOUT_S, opener=None):
    """POST a generateContent payload; return the raw response body text.
    `opener` is injectable for tests (defaults to urllib's global opener)."""
    request = urllib.request.Request(
        generate_url(model),
        data=payload_str.encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    open_fn = opener.open if opener is not None else urllib.request.urlopen
    try:
        with open_fn(request, timeout=timeout) as response:
            return response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        message = extract_error_message(body) or ("HTTP %d" % e.code)
        raise GeminiError("Gemini API error: %s" % message) from e
    except urllib.error.URLError as e:
        raise GeminiError("Network error reaching Gemini API: %s" % e.reason) from e


def generate_image_b64(api_key, model, payload_str, timeout=DEFAULT_TIMEOUT_S, opener=None):
    """Full call: POST, then pull the base64 image out of the response.
    Raises GeminiError with the API's own message when no image comes back."""
    body = post_generate(api_key, model, payload_str, timeout=timeout, opener=opener)
    image_b64 = extract_image_base64(body)
    if not image_b64:
        message = extract_error_message(body) or "no image in response"
        raise GeminiError("Gemini returned no image: %s" % message)
    return image_b64



def _config_path():
    return os.path.join(Gimp.directory(), "packshotforge.config.txt")


def _ps_config_path():
    if sys.platform == "darwin":
        return os.path.expanduser("~/Library/Application Support/PackshotForge/config.txt")
    if os.name == "nt":
        return os.path.join(os.environ.get("APPDATA", ""), "PackshotForge", "config.txt")
    return None


def _selection_bounds(image):
    """Active selection as [x1, y1, x2, y2] px, or None when empty."""
    try:
        result = Gimp.Selection.bounds(image)
    except Exception:
        return None
    values = list(result) if isinstance(result, (tuple, list)) else [result]
    if not values or not values[0] or len(values) < 5:
        return None
    return [float(values[1]), float(values[2]), float(values[3]), float(values[4])]


def _export_jpeg_for_api(image, max_px):
    """Flattened, size-capped JPEG of the image, written to a temp file.
    Returns (path, cleanup_paths)."""
    dup = image.duplicate()
    try:
        dup.flatten()
        w, h = dup.get_width(), dup.get_height()
        long_side = max(w, h)
        if long_side > max_px:
            ratio = max_px / float(long_side)
            dup.scale(max(1, int(w * ratio)), max(1, int(h * ratio)))
        fd, path = tempfile.mkstemp(prefix="psf-input-", suffix=".jpg")
        os.close(fd)
        Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, dup, Gio.File.new_for_path(path), None)
        return path
    finally:
        dup.delete()


def _confirm_dialog(message):
    gi.require_version("Gtk", "3.0")
    from gi.repository import Gtk
    dialog = Gtk.MessageDialog(message_type=Gtk.MessageType.QUESTION,
                               buttons=Gtk.ButtonsType.YES_NO, text="PackshotForge")
    dialog.format_secondary_text(message)
    response = dialog.run()
    dialog.destroy()
    return response == Gtk.ResponseType.YES


def _run_generate_pipeline(image, preset_id, custom_text, pixel_lock, draft_mode,
                           api_key, interactive):
    """The billable path. Returns (status, message). Raises nothing billable
    before the preflight confirm."""
    model = PSF_DRAFT_MODEL if draft_mode else PSF_MODEL
    max_px = PSF_DRAFT_MAX_SEND_PX if draft_mode else PSF_MAX_SEND_PX

    cfg = load_config(_config_path(), ps_config_path=_ps_config_path())
    if not api_key:
        api_key = cfg.get("apiKey", "")
    if not api_key:
        return ("error", "No Gemini API key. Get one at aistudio.google.com and paste it "
                         "into the API key field (it is stored locally, key file readable only by you).")

    bounds = _selection_bounds(image)
    sanity = mask_sanity(bounds, image.get_width(), image.get_height())

    # Preflight: free check before the billable call; cancelling costs nothing.
    if cfg.get("preflight", "on") != "off":
        gate = preflight_gate(bounds, image.get_width(), image.get_height(),
                              {"pixelLock": pixel_lock, "isBatch": not interactive,
                               "provider": "gemini", "model": model})
        if gate["action"] in ("confirm", "warn") and interactive:
            if not _confirm_dialog(gate["message"]):
                return ("cancel", "")

    prompt = build_prompt(preset_id or None, custom_text=custom_text or "",
                          pixel_lock=pixel_lock and sanity["ok"])

    Gimp.progress_init("PackshotForge: preparing image…")
    input_jpg = _export_jpeg_for_api(image, max_px)
    result_png = None
    try:
        with open(input_jpg, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("ascii")

        payload = build_generate_content_payload(prompt, image_b64, "image/jpeg")
        Gimp.progress_set_text("PackshotForge: generating (%s, ~%s)…"
                               % (model, format_cost(estimate_cost("gemini", model, 1, False))))
        Gimp.progress_pulse()
        out_b64 = generate_image_b64(api_key, model, payload)

        fd, result_png = tempfile.mkstemp(prefix="psf-result-", suffix=".png")
        os.close(fd)
        with open(result_png, "wb") as f:
            f.write(base64.b64decode(out_b64))

        Gimp.progress_set_text("PackshotForge: placing result…")
        layers_before = image.get_layers()
        base_layer = layers_before[-1] if layers_before else None

        preset = find_preset(preset_id) if preset_id else None
        gen_layer = Gimp.file_load_layer(Gimp.RunMode.NONINTERACTIVE, image,
                                         Gio.File.new_for_path(result_png))
        image.insert_layer(gen_layer, None, 0)
        gen_layer.set_name("PackshotForge — %s" % (preset["label"] if preset else "custom scene"))
        if (gen_layer.get_width(), gen_layer.get_height()) != (image.get_width(), image.get_height()):
            gen_layer.scale(image.get_width(), image.get_height(), False)
        gen_layer.set_offsets(0, 0)

        locked = False
        if pixel_lock and sanity["ok"] and base_layer is not None:
            lock_layer = Gimp.Layer.new_from_drawable(base_layer, image)
            image.insert_layer(lock_layer, None, 0)
            lock_layer.set_offsets(0, 0)
            lock_layer.set_name("PSF Product (original)")
            mask = lock_layer.create_mask(Gimp.AddMaskType.SELECTION)
            lock_layer.add_mask(mask)
            locked = True

        cfg["apiKey"] = api_key
        if preset_id:
            cfg["lastPreset"] = preset_id
        save_config(_config_path(), cfg)

        Gimp.progress_end()
        Gimp.displays_flush()
        status_line = "PackshotForge: done — PIXEL-LOCKED ✓" if locked else \
            "PackshotForge: done (no Pixel-Lock: %s)" % (sanity["reason"] or "off")
        return ("ok", status_line)
    finally:
        for path in (input_jpg, result_png):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


def _run_export_pipeline(image, marketplace, output_dir):
    spec = get_export_spec(marketplace)
    if spec is None:
        return ("error", "Unknown marketplace: %r" % marketplace)

    if not output_dir:
        f = image.get_file()
        output_dir = os.path.dirname(f.get_path()) if f and f.get_path() else tempfile.gettempdir()
    os.makedirs(output_dir, exist_ok=True)

    f = image.get_file()
    base = os.path.splitext(f.get_basename())[0] if f and f.get_basename() else "packshot"
    out_path = os.path.join(output_dir, "%s-%s.jpg" % (base, marketplace))

    dup = image.duplicate()
    try:
        flat = dup.flatten()
        ratio = min(spec["width"] / float(flat.get_width()),
                    spec["height"] / float(flat.get_height()))
        new_w = max(1, int(flat.get_width() * ratio))
        new_h = max(1, int(flat.get_height() * ratio))
        dup.scale(new_w, new_h)

        off_x = (spec["width"] - new_w) // 2
        off_y = (spec["height"] - new_h) // 2
        dup.resize(spec["width"], spec["height"], off_x, off_y)

        # Deterministic background fill (Amazon requires pure white) without
        # touching the user's context colors: a white layer under everything.
        bg = Gimp.Layer.new(dup, "psf-bg", spec["width"], spec["height"],
                            Gimp.ImageType.RGB_IMAGE, 100.0, Gimp.LayerMode.NORMAL)
        image_layers = dup.get_layers()
        dup.insert_layer(bg, None, len(image_layers))
        bg.fill(Gimp.FillType.WHITE)
        dup.flatten()

        Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, dup, Gio.File.new_for_path(out_path), None)
        return ("ok", "Exported %s (%dx%d): %s" % (marketplace, spec["width"], spec["height"], out_path))
    finally:
        dup.delete()


class PackshotForge(Gimp.PlugIn):
    def do_query_procedures(self):
        return ["plug-in-packshotforge", "plug-in-packshotforge-export"]

    def do_set_i18n(self, name):
        return False

    def do_create_procedure(self, name):
        if name == "plug-in-packshotforge":
            procedure = Gimp.ImageProcedure.new(self, name, Gimp.PDBProcType.PLUGIN,
                                                self.run_generate, None)
            procedure.set_menu_label("Generate Scene…")
            procedure.set_documentation(
                "AI product-photo background on your own Gemini API key",
                "Rebuilds the background of a product photo with Google's Gemini image model "
                "and inserts the result as a layer. With an active selection of the product, "
                "Pixel-Lock composites the original product pixels back on top so labels stay "
                "byte-identical. Costs ~%s per image on your own key."
                % format_cost(estimate_cost("gemini", PSF_MODEL, 1, False)),
                name)

            choice = Gimp.Choice.new()
            for i, preset in enumerate(PRESETS):
                choice.add(preset["id"], i, "%s [%s]" % (preset["label"], preset["category"]), "")
            procedure.add_choice_argument("preset", "Scene preset", None, choice,
                                          "white-bg", GObject.ParamFlags.READWRITE)
            procedure.add_string_argument("custom-text", "Extra instructions", None, "",
                                          GObject.ParamFlags.READWRITE)
            procedure.add_boolean_argument("pixel-lock",
                                           "Pixel-Lock (needs a selection of the product)",
                                           None, True, GObject.ParamFlags.READWRITE)
            procedure.add_boolean_argument("draft-mode", "Draft mode (cheaper lite model)",
                                           None, False, GObject.ParamFlags.READWRITE)
            procedure.add_string_argument("api-key", "Gemini API key (stored locally)",
                                          None, "", GObject.ParamFlags.READWRITE)
        else:
            procedure = Gimp.ImageProcedure.new(self, name, Gimp.PDBProcType.PLUGIN,
                                                self.run_export, None)
            procedure.set_menu_label("Marketplace Export…")
            procedure.set_documentation(
                "Export the current image at marketplace listing sizes",
                "Amazon 2000x2000 (white), Etsy 3000x2400, Shopify 2048x2048.", name)
            choice = Gimp.Choice.new()
            for i, marketplace in enumerate(EXPORT_SPECS):
                spec = EXPORT_SPECS[marketplace]
                choice.add(marketplace, i, "%s (%dx%d)" % (marketplace, spec["width"], spec["height"]), "")
            procedure.add_choice_argument("marketplace", "Marketplace", None, choice,
                                          "amazon", GObject.ParamFlags.READWRITE)
            procedure.add_string_argument("output-dir", "Output folder (blank = image's folder)",
                                          None, "", GObject.ParamFlags.READWRITE)

        procedure.set_image_types("*")
        procedure.set_sensitivity_mask(Gimp.ProcedureSensitivityMask.DRAWABLE)
        procedure.add_menu_path("<Image>/Filters/PackshotForge/")
        procedure.set_attribution("nsjokt", "MIT", "2026")
        return procedure

    def _show_dialog(self, procedure, config, title):
        gi.require_version("GimpUi", "3.0")
        from gi.repository import GimpUi
        GimpUi.init("packshotforge")
        dialog = GimpUi.ProcedureDialog.new(procedure, config, title)
        dialog.fill(None)
        ok = dialog.run()
        dialog.destroy()
        return ok

    def run_generate(self, procedure, run_mode, image, drawables, config, data):
        interactive = run_mode == Gimp.RunMode.INTERACTIVE
        if interactive and not self._show_dialog(procedure, config, "PackshotForge — Generate Scene"):
            return procedure.new_return_values(Gimp.PDBStatusType.CANCEL, GLib.Error())
        try:
            status, message = _run_generate_pipeline(
                image,
                config.get_property("preset"),
                config.get_property("custom-text"),
                config.get_property("pixel-lock"),
                config.get_property("draft-mode"),
                config.get_property("api-key"),
                interactive,
            )
        except GeminiError as e:
            status, message = "error", str(e)
        except Exception as e:  # surface anything unexpected instead of a silent fail
            status, message = "error", "%s: %s" % (type(e).__name__, e)

        if status == "cancel":
            return procedure.new_return_values(Gimp.PDBStatusType.CANCEL, GLib.Error())
        if status == "error":
            if interactive:
                Gimp.message("PackshotForge: %s" % message)
            return procedure.new_return_values(Gimp.PDBStatusType.EXECUTION_ERROR,
                                               GLib.Error(message))
        if interactive:
            Gimp.message(message)
        return procedure.new_return_values(Gimp.PDBStatusType.SUCCESS, GLib.Error())

    def run_export(self, procedure, run_mode, image, drawables, config, data):
        interactive = run_mode == Gimp.RunMode.INTERACTIVE
        if interactive and not self._show_dialog(procedure, config, "PackshotForge — Marketplace Export"):
            return procedure.new_return_values(Gimp.PDBStatusType.CANCEL, GLib.Error())
        try:
            status, message = _run_export_pipeline(
                image,
                config.get_property("marketplace"),
                config.get_property("output-dir"),
            )
        except Exception as e:
            status, message = "error", "%s: %s" % (type(e).__name__, e)

        if status == "error":
            if interactive:
                Gimp.message("PackshotForge: %s" % message)
            return procedure.new_return_values(Gimp.PDBStatusType.EXECUTION_ERROR,
                                               GLib.Error(message))
        if interactive:
            Gimp.message(message)
        return procedure.new_return_values(Gimp.PDBStatusType.SUCCESS, GLib.Error())


Gimp.main(PackshotForge.__gtype__, sys.argv)
