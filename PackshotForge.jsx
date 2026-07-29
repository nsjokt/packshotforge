/* PackshotForge — AI product photos in Photoshop.
 * Free script, bring-your-own Google Gemini API key.
 * Works with the Gemini image models ("Nano Banana" family).
 *
 * Install: copy this file into Photoshop's Presets/Scripts folder (or run via
 * File > Scripts > Browse). Requires: internet, curl (built into macOS and
 * Windows 10+), a Gemini API key from aistudio.google.com.
 */

/* ===== inlined: core/presets.js ===== */
/* PackshotForge scene presets.
 * ES3-compatible: consumed by Photoshop ExtendScript via #include and by Node via module.exports guard.
 * Prompts are written for image-editing models (Gemini flash-image / "Nano Banana" family):
 * they assume an input product photo and describe the desired scene around the unchanged product.
 */
var PSF_PRESETS = [
  {
    id: "white-bg",
    category: "core",
    label: "Pure White Background (marketplace)",
    prompt: "Replace the entire background with a seamless pure white background (#FFFFFF) suitable for Amazon and marketplace listings. Add a soft, realistic contact shadow under the product. Even studio lighting, no color cast."
  },

  { id: "cosmetics-marble", category: "cosmetics", label: "Marble Counter",
    prompt: "Place the product on a white marble bathroom counter with soft morning window light from the left, subtle reflections on the marble, blurred spa-like background with green plant leaves. Premium skincare advertisement style." },
  { id: "cosmetics-water", category: "cosmetics", label: "Water Splash",
    prompt: "Place the product standing in shallow rippling water with gentle splash droplets frozen mid-air around it, pastel gradient studio backdrop, crisp commercial beauty lighting, dewy fresh mood." },
  { id: "cosmetics-silk", category: "cosmetics", label: "Silk & Petals",
    prompt: "Place the product on flowing champagne-colored silk fabric with scattered rose petals, warm golden soft light, shallow depth of field, luxury cosmetics editorial style." },
  { id: "cosmetics-tropical", category: "cosmetics", label: "Tropical Shadow",
    prompt: "Place the product on a warm beige stone pedestal with hard sunlight casting sharp palm-leaf shadows across the scene, summery premium sunscreen advertisement look." },
  { id: "cosmetics-clinical", category: "cosmetics", label: "Clean Clinical",
    prompt: "Place the product on a glossy white acrylic surface with a cool light-blue gradient background, precise soft reflections, minimal dermatological laboratory aesthetic." },

  { id: "jewelry-velvet", category: "jewelry", label: "Dark Velvet",
    prompt: "Place the product on deep navy velvet fabric with a single dramatic spotlight, rich specular sparkle on metal and stones, dark luxurious jewelry-box mood, black vignette background." },
  { id: "jewelry-stone", category: "jewelry", label: "Raw Stone",
    prompt: "Place the product draped over a rough natural slate stone with soft diffused daylight, neutral gray tones that make the metal glow, organic high-end jewelry editorial style." },
  { id: "jewelry-macro", category: "jewelry", label: "Macro Sparkle",
    prompt: "Extreme close-up composition of the product on a mirror-black surface, pinpoint star sparkles on facets, shallow depth of field with bokeh light dots in the background, dramatic luxury macro shot." },
  { id: "jewelry-hand", category: "jewelry", label: "Champagne Silk Drape",
    prompt: "Place the product elegantly arranged on draped ivory silk with pearl accents nearby, soft warm boudoir lighting, romantic bridal jewelry advertisement style." },
  { id: "jewelry-minimal", category: "jewelry", label: "Minimal Pedestal",
    prompt: "Place the product on a small matte ceramic pedestal against a warm beige seamless background, gentle top-left key light, contemporary minimal gallery presentation." },

  { id: "apparel-flatlay", category: "apparel", label: "Styled Flat Lay",
    prompt: "Arrange the product as a neat flat lay on a light linen surface, styled with subtle complementary accessories at the edges, soft even overhead daylight, clean fashion catalog look." },
  { id: "apparel-ghost", category: "apparel", label: "Ghost Mannequin",
    prompt: "Present the garment as an invisible ghost mannequin shot: natural filled 3D shape as if worn, no person visible, pure light-gray studio background, sharp e-commerce fashion lighting." },
  { id: "apparel-street", category: "apparel", label: "Urban Backdrop",
    prompt: "Place the product against a blurred sunlit city street background with warm golden-hour tones, product in crisp focus, streetwear lookbook advertisement style." },
  { id: "apparel-hanger", category: "apparel", label: "Boutique Rack",
    prompt: "Show the product hanging on a wooden hanger against a warm boutique interior with soft window light and blurred clothing rack in the background, premium retail presentation." },
  { id: "apparel-texture", category: "apparel", label: "Fabric Detail",
    prompt: "Close-up composition emphasizing the fabric texture of the product, draped naturally over a neutral surface, raking side light that reveals weave and material quality, tactile editorial style." },

  { id: "food-rustic", category: "food", label: "Rustic Wood",
    prompt: "Place the product on a rustic dark wooden table with scattered raw ingredients around it, warm side window light, cozy artisanal food photography style with shallow depth of field." },
  { id: "food-bright", category: "food", label: "Bright Cafe",
    prompt: "Place the product on a white cafe table with bright airy daylight, soft shadows, a blurred pastel cafe interior background, fresh appetizing commercial food look." },
  { id: "food-dark", category: "food", label: "Dark Moody",
    prompt: "Place the product on dark slate with dramatic low-key chiaroscuro lighting, steam or crumbs as natural styling, moody gourmet restaurant advertisement style." },
  { id: "food-picnic", category: "food", label: "Outdoor Picnic",
    prompt: "Place the product on a checkered picnic blanket on green grass with soft summer sunlight and blurred park background, cheerful lifestyle food branding." },
  { id: "food-splash", category: "food", label: "Ingredient Splash",
    prompt: "Dynamic composition of the product with its key ingredients splashing or falling around it mid-air, clean gradient studio background, high-speed commercial food advertisement energy." }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PRESETS: PSF_PRESETS };
}

/* ===== inlined: core/promptBuilder.js ===== */
/* Prompt builder — shared between ExtendScript (#include) and Node.
 * ES3-compatible: no arrow functions, no template literals, no let/const.
 * In ExtendScript, PSF_PRESETS is provided by including presets.js first.
 */

var PSF_BASE_INSTRUCTIONS =
  "Edit this product photo. Keep the product itself completely unchanged: " +
  "preserve its exact shape, proportions, colors, materials, label text and logo placement. " +
  "Only change the environment as instructed. Photorealistic result, correct perspective, " +
  "natural shadows and reflections consistent with the new scene.";

function psfFindPreset(presetId) {
  var list = (typeof PSF_PRESETS !== "undefined") ? PSF_PRESETS : require("./presets.js").PRESETS;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === presetId) return list[i];
  }
  return null;
}

function buildPrompt(presetId, opts) {
  opts = opts || {};
  var parts = [PSF_BASE_INSTRUCTIONS];

  if (presetId !== null && presetId !== undefined && presetId !== "") {
    var preset = psfFindPreset(presetId);
    if (!preset) {
      throw new Error("unknown preset: " + presetId);
    }
    parts[parts.length] = preset.prompt;
  }

  if (opts.customText && opts.customText !== "") {
    parts[parts.length] = opts.customText;
  }

  if (opts.pixelLock) {
    parts[parts.length] = "Reconstruct ONLY the background/scene. Keep the product in the exact same position, scale, and orientation as the original photo - do not straighten, move, or resize it. The product will be composited from the original photo, so background edges must blend naturally around the subject silhouette.";
  }

  return parts.join(" ");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildPrompt: buildPrompt, BASE_INSTRUCTIONS: PSF_BASE_INSTRUCTIONS };
}

/* ===== inlined: core/exportSpecs.js ===== */
/* Marketplace export specs — shared between ExtendScript (#include) and Node.
 * ES3-compatible.
 * Sizes: Amazon main image requires pure white background, min 1000px (2000px recommended
 * for zoom); Etsy recommends 3000x2400 (5:4); Shopify recommends 2048x2048 square.
 */

var PSF_EXPORT_SPECS = {
  amazon:  { width: 2000, height: 2000, background: "#FFFFFF", format: "jpg", quality: 90 },
  etsy:    { width: 3000, height: 2400, background: null,      format: "jpg", quality: 90 },
  shopify: { width: 2048, height: 2048, background: null,      format: "jpg", quality: 90 }
};

function getExportSpec(marketplace) {
  if (PSF_EXPORT_SPECS.hasOwnProperty(marketplace)) {
    return PSF_EXPORT_SPECS[marketplace];
  }
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { EXPORT_SPECS: PSF_EXPORT_SPECS, getExportSpec: getExportSpec };
}

/* ===== inlined: core/apiPayload.js ===== */
/* Gemini image API payload builder + response parser.
 * ES3-compatible, shared between ExtendScript and Node.
 * Two wire formats are supported because the API surface is in transition:
 *  - "interactions" (documented current): POST /v1beta/interactions
 *  - "generateContent" (legacy): POST /v1beta/models/{model}:generateContent
 * The smoke harness (tools/api-smoke.mjs) decides at runtime which one the
 * account/model actually accepts; the JSX ships with the verified one.
 */

function psfJsonEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
}

/* Sanitize a string pulled out of a remote API response (regex-captured
 * job id / job name / batch item key) before it is used to build a shell
 * command (curl URL via app.system) or an output file path. Strips
 * everything except a conservative allow-list, so a compromised/odd
 * response body can't inject shell metacharacters or path traversal
 * sequences. ES3-safe. */
function psfSanitizeToken(s) {
  if (s === null || s === undefined) return s;
  return String(s).replace(/[^A-Za-z0-9\/_.\-]/g, "");
}

function buildInteractionsPayload(model, prompt, imageBase64, mimeType) {
  return '{"model":"' + psfJsonEscape(model) + '",' +
    '"input":[' +
    '{"type":"text","text":"' + psfJsonEscape(prompt) + '"},' +
    '{"type":"image","mime_type":"' + psfJsonEscape(mimeType) + '","data":"' + imageBase64 + '"}' +
    "]}";
}

function buildGenerateContentPayload(prompt, imageBase64, mimeType) {
  return '{"contents":[{"parts":[' +
    '{"text":"' + psfJsonEscape(prompt) + '"},' +
    '{"inline_data":{"mime_type":"' + psfJsonEscape(mimeType) + '","data":"' + imageBase64 + '"}}' +
    "]}]}";
}

/* Extract a base64 image from a response JSON string without a JSON parser
 * (ExtendScript has no JSON.parse in old versions). Regex-based, tolerant of
 * camelCase and snake_case, and of the interactions output_image shape. */
function extractImageBase64(responseText) {
  if (!responseText) return null;
  var m;
  m = responseText.match(/"inline_?[dD]ata"\s*:\s*\{[^{}]*"data"\s*:\s*"([A-Za-z0-9+\/=]+)"/);
  if (m) return m[1];
  m = responseText.match(/"output_image"\s*:\s*\{[^{}]*"data"\s*:\s*"([A-Za-z0-9+\/=]+)"/);
  if (m) return m[1];
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    psfJsonEscape: psfJsonEscape,
    psfSanitizeToken: psfSanitizeToken,
    buildInteractionsPayload: buildInteractionsPayload,
    buildGenerateContentPayload: buildGenerateContentPayload,
    extractImageBase64: extractImageBase64
  };
}

/* ===== inlined: core/providers.js ===== */
/* Provider adapters: build outbound requests and parse responses for the
 * two supported image-edit backends (Gemini JSON, Stability multipart+poll).
 * ES3-compatible, shared between ExtendScript and Node.
 *
 * Bundle include order requirement: this file MUST be inlined AFTER
 * core/apiPayload.js (see src/PackshotForge.jsx //@include list) so that
 * buildGenerateContentPayload / extractImageBase64 are already defined as
 * globals by the time this file runs in ExtendScript.
 */

if (typeof require !== "undefined") {
  var _api = require("./apiPayload.js");
  var buildGenerateContentPayload = _api.buildGenerateContentPayload;
  var extractImageBase64 = _api.extractImageBase64;
  var psfSanitizeToken = _api.psfSanitizeToken;
}

var PSF_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
var PSF_STABILITY_SUBMIT_URL = "https://api.stability.ai/v2beta/stable-image/edit/replace-background-and-relight";
var PSF_STABILITY_POLL_BASE_URL = "https://api.stability.ai/v2beta/results/";

function buildRequest(provider, cfg, prompt, imgB64OrPath) {
  if (provider === "gemini") {
    return {
      kind: "json",
      url: PSF_GEMINI_BASE_URL + cfg.model + ":generateContent",
      authHeader: "x-goog-api-key: " + cfg.apiKey,
      payload: buildGenerateContentPayload(prompt, imgB64OrPath, "image/png")
    };
  }
  if (provider === "stability") {
    return {
      kind: "multipart",
      url: PSF_STABILITY_SUBMIT_URL,
      authHeader: "authorization: Bearer " + cfg.apiKey,
      fields: {
        subject_image: "@" + imgB64OrPath,
        background_prompt: prompt,
        preserve_original_subject: "1.0",
        output_format: "png"
      }
    };
  }
  return null;
}

/* Pull an error message out of a response body without a JSON parser.
 * Tries "errors" array first, then "message", then "name". */
function psfExtractError(responseText) {
  if (!responseText) return null;
  var m;
  m = responseText.match(/"errors"\s*:\s*\[([^\]]*)\]/);
  if (m) return m[1].replace(/^\s*"|"\s*$/g, "");
  m = responseText.match(/"message"\s*:\s*"([^"]*)"/);
  if (m) return m[1];
  m = responseText.match(/"name"\s*:\s*"([^"]*)"/);
  if (m) return m[1];
  return null;
}

function parseSubmitResponse(provider, respText) {
  if (provider === "gemini") {
    var img = extractImageBase64(respText);
    if (img) return { imageB64: img };
    var err = psfExtractError(respText);
    if (err) return { error: err };
    return {};
  }
  if (provider === "stability") {
    /* Error check runs FIRST: Stability error bodies also carry an "id"
     * field (e.g. {"id":"abc","name":"unauthorized","errors":[...]}), so
     * checking for "id" before checking for errors would misroute a failed
     * submit into the polling path. */
    var serr = psfExtractError(respText);
    if (serr) return { error: serr };
    var m = respText.match(/"id"\s*:\s*"([^"]+)"/);
    if (m) return { pollUrl: PSF_STABILITY_POLL_BASE_URL + psfSanitizeToken(m[1]) };
    return {};
  }
  return {};
}

function buildPollRequest(provider, cfg, pollUrl) {
  return {
    url: pollUrl,
    authHeader: "authorization: Bearer " + cfg.apiKey
  };
}

function parsePollResponse(provider, respText) {
  if (!respText) return { done: false };
  if (/"status"\s*:\s*"in-progress"/.test(respText)) {
    return { done: false };
  }
  var m = respText.match(/"image"\s*:\s*"([A-Za-z0-9+\/=]+)"/);
  if (m) return { done: true, imageB64: m[1] };
  var err = psfExtractError(respText);
  if (err) return { done: true, error: err };
  return { done: false };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildRequest: buildRequest,
    parseSubmitResponse: parseSubmitResponse,
    buildPollRequest: buildPollRequest,
    parsePollResponse: parsePollResponse
  };
}

/* ===== inlined: core/integrity.js ===== */
/* Pixel-Lock integrity, transparency verification, and batch-report logic.
 * Pure decision functions, no ExtendScript/DOM dependencies. ES3-compatible,
 * shared between ExtendScript and Node (dependency-free — no require guard
 * needed for other core modules). Consumed by JSX tasks 6-7 (not wired into
 * the bundle include chain here).
 */

function _isValidMaskBounds(maskBounds) {
  if (!maskBounds) return false;
  if (maskBounds.length !== 4) return false;
  var i;
  for (i = 0; i < 4; i++) {
    var v = maskBounds[i];
    if (typeof v !== "number" || isNaN(v)) return false;
  }
  if (maskBounds[2] <= maskBounds[0]) return false;
  if (maskBounds[3] <= maskBounds[1]) return false;
  return true;
}

function _clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function labelCropRect(docW, docH, maskBounds, pad) {
  if (!_isValidMaskBounds(maskBounds)) {
    return { x: 0, y: 0, w: docW, h: docH };
  }
  var x1 = _clamp(maskBounds[0] - pad, 0, docW);
  var y1 = _clamp(maskBounds[1] - pad, 0, docH);
  var x2 = _clamp(maskBounds[2] + pad, 0, docW);
  var y2 = _clamp(maskBounds[3] + pad, 0, docH);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function maskSanity(maskBounds, docW, docH) {
  if (!_isValidMaskBounds(maskBounds)) {
    return { ok: false, reason: "no-selection" };
  }
  var area = (maskBounds[2] - maskBounds[0]) * (maskBounds[3] - maskBounds[1]);
  var docArea = docW * docH;
  if (docArea <= 0) {
    return { ok: false, reason: "no-selection" };
  }
  var ratio = area / docArea;
  if (ratio < 0.01) {
    return { ok: false, reason: "too-small" };
  }
  if (ratio > 0.98) {
    return { ok: false, reason: "full-frame" };
  }
  return { ok: true, reason: "" };
}

function alphaVerdict(hasAlphaChannel, formatExt) {
  var ext = (formatExt || "").toLowerCase();
  if (ext !== "png") {
    return { ok: true, reason: "n/a" };
  }
  if (!hasAlphaChannel) {
    return { ok: false, reason: "png-no-alpha" };
  }
  return { ok: true, reason: "" };
}

function buildBatchReport(results, pricingLine) {
  results = results || [];
  var total = results.length;
  var succeeded = 0;
  var transparencyVerified = 0;
  var failures = [];
  var i;
  for (i = 0; i < total; i++) {
    var r = results[i];
    if (r.ok) succeeded++;
    if (r.alphaOk === true) transparencyVerified++;
    if (!r.ok) failures.push(r);
  }

  var lines = [];
  lines.push("PackshotForge batch report");
  lines.push(succeeded + "/" + total + " succeeded");
  lines.push("transparency verified: " + transparencyVerified);
  if (failures.length > 0) {
    lines.push("FAILED:");
    for (i = 0; i < failures.length; i++) {
      var f = failures[i];
      lines.push("- " + f.name + " (" + f.preset + "): " + f.error);
    }
  }
  lines.push(pricingLine);
  return lines.join("\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    labelCropRect: labelCropRect,
    maskSanity: maskSanity,
    alphaVerdict: alphaVerdict,
    buildBatchReport: buildBatchReport
  };
}

/* ===== inlined: core/pricing.js ===== */
/* Verified 2026-07-25 against official pricing pages. USD per output image. */
var PSF_PRICES = {
  gemini: {
    "gemini-3.1-flash-image":      { std: 0.067,  batch: 0.034 },
    "gemini-3.1-flash-lite-image": { std: 0.039,  batch: 0.0195 },
    "gemini-2.5-flash-image":      { std: 0.039,  batch: 0.0195 },
    _default:                      { std: 0.067,  batch: 0.034 }
  },
  stability: { _default: { std: 0.08, batch: 0.08 } }
};
function estimateCost(provider, model, count, isBatch) {
  var p = PSF_PRICES[provider] || PSF_PRICES.gemini;
  var row = p[model] || p._default;
  var unit = isBatch ? row.batch : row.std;
  return unit * count;
}
function formatCost(n) {
  var rounded = (n < 0.1) ? Math.round(n * 1000) / 1000 : Math.round(n * 100) / 100;
  var s = (n < 0.1) ? rounded.toFixed(3) : rounded.toFixed(2);
  return "$" + s;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PSF_PRICES: PSF_PRICES, estimateCost: estimateCost, formatCost: formatCost };
}

/* ===== inlined: core/batchPayload.js ===== */
/* Gemini Batch API (batchGenerateContent) payload builder + response parser.
 * ES3-compatible, shared between ExtendScript and Node.
 * Used to submit many image-edit requests at once for 50% cost via the
 * async batches endpoint. Not wired into the bundle include chain yet
 * (that happens in a later JSX-facing task) — this module only builds the
 * request body / parses status+results strings.
 *
 * Bundle include order requirement (future task): this file must be inlined
 * AFTER core/apiPayload.js so that psfJsonEscape is already defined as a
 * global by the time this file runs in ExtendScript.
 */

if (typeof require !== "undefined") {
  var _api = require("./apiPayload.js");
  var psfJsonEscape = _api.psfJsonEscape;
}

var PSF_GEMINI_BATCH_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

function batchSubmitUrl(model) {
  return PSF_GEMINI_BATCH_BASE_URL + model + ":batchGenerateContent";
}

function buildBatchSubmitPayload(model, items) {
  var reqStrs = [];
  var i;
  for (i = 0; i < items.length; i++) {
    var it = items[i];
    reqStrs.push(
      '{"request":{"contents":[{"parts":[' +
        '{"text":"' + psfJsonEscape(it.prompt) + '"},' +
        '{"inline_data":{"mime_type":"' + psfJsonEscape(it.mime) + '","data":"' + it.imgB64 + '"}}' +
        ']}],' +
        '"generationConfig":{"responseModalities":["TEXT","IMAGE"]}},' +
        '"metadata":{"key":"' + psfJsonEscape(it.key) + '"}}'
    );
  }
  return '{"batch":{"display_name":"psf_batch","input_config":{"requests":{"requests":[' +
    reqStrs.join(",") +
    ']}}}}';
}

/* Terminal-but-unsuccessful batch states: the job is DONE (no more polling
 * needed) but it will never produce results. Distinct from
 * BATCH_STATE_SUCCEEDED (done + has results) and from the various
 * in-progress states (not done). */
var PSF_BATCH_FAILED_STATES = {
  "BATCH_STATE_FAILED": true,
  "BATCH_STATE_CANCELLED": true,
  "BATCH_STATE_EXPIRED": true
};

/* Parse the batch operation status. State lives at "state":"<...>" (the
 * operation metadata). No JSON.parse dependency (ExtendScript-safe).
 * Returns {state, done, failed}: done is true for BOTH the success state
 * (BATCH_STATE_SUCCEEDED) and the terminal failure states above — a caller
 * must check `failed` to tell them apart. Non-terminal states (PENDING,
 * RUNNING, ...) are done:false, failed:false. */
function parseBatchStatus(respText) {
  if (!respText) return { state: "", done: false, failed: false };
  var m = respText.match(/"state"\s*:\s*"([^"]*)"/);
  if (m) {
    var state = m[1];
    var isFailed = !!PSF_BATCH_FAILED_STATES[state];
    var isDone = isFailed || (state === "BATCH_STATE_SUCCEEDED");
    return { state: state, done: isDone, failed: isFailed };
  }
  if (respText.indexOf('"inlinedResponses"') !== -1) {
    return { state: "BATCH_STATE_SUCCEEDED", done: true, failed: false };
  }
  return { state: "", done: false, failed: false };
}

/* Extract {key, imageB64} pairs from a batch results response, in order.
 * Scans for each "key":"<k>" metadata occurrence and pairs it with a
 * "data":"<base64>" occurrence found only WITHIN that item's own segment —
 * the text between this key and the next key occurrence (or end of string
 * for the last one). This prevents a failed item (key present, no data,
 * e.g. an error object instead of a response) from stealing the following
 * item's image, which an unbounded "nearest following data" scan would do
 * and which would also shift every subsequent pairing. ES3-safe (no lookahead
 * needed — plain index bookkeeping). */
function extractBatchImages(respText) {
  var out = [];
  if (!respText) return out;
  var keyRe = /"key"\s*:\s*"([^"]*)"/g;
  var keys = [];
  var km;
  while ((km = keyRe.exec(respText))) {
    keys.push({ key: km[1], matchStart: km.index, segStart: keyRe.lastIndex });
  }
  var dataPattern = /"data"\s*:\s*"([A-Za-z0-9+\/=]+)"/;
  for (var i = 0; i < keys.length; i++) {
    var segEnd = (i + 1 < keys.length) ? keys[i + 1].matchStart : respText.length;
    var segment = respText.substring(keys[i].segStart, segEnd);
    var dm = segment.match(dataPattern);
    if (dm) {
      out.push({ key: keys[i].key, imageB64: dm[1] });
    }
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    batchSubmitUrl: batchSubmitUrl,
    buildBatchSubmitPayload: buildBatchSubmitPayload,
    parseBatchStatus: parseBatchStatus,
    extractBatchImages: extractBatchImages,
    PSF_BATCH_FAILED_STATES: PSF_BATCH_FAILED_STATES
  };
}

/* ===== inlined: core/bridge.js ===== */
/* Subscription Bridge mode: pure logic for the manual gemini.google.com flow.
 * The user pastes clipboard text we prepare into the web UI, attaches the
 * product photo themselves, then downloads the result — this module builds
 * that clipboard text and picks the matching downloaded file.
 * ES3-compatible, shared between ExtendScript and Node.
 *
 * Bundle include order requirement: this file MUST be inlined AFTER
 * core/promptBuilder.js (see src/PackshotForge.jsx //@include list) so that
 * buildPrompt is already defined as a global by the time this file runs in
 * ExtendScript.
 */

if (typeof require !== "undefined") {
  var _promptBuilder = require("./promptBuilder.js");
  var buildPrompt = _promptBuilder.buildPrompt;
}

var PSF_BRIDGE_PREFIX = "Edit the attached product photo: ";
var PSF_BRIDGE_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

function buildBridgeClipboard(presetId, opts) {
  return PSF_BRIDGE_PREFIX + buildPrompt(presetId, opts);
}

function psfHasImageExt(name) {
  var lower = name.toLowerCase();
  for (var i = 0; i < PSF_BRIDGE_IMAGE_EXTS.length; i++) {
    var ext = PSF_BRIDGE_IMAGE_EXTS[i];
    var start = lower.length - ext.length;
    if (start >= 0 && lower.indexOf(ext, start) === start) {
      return true;
    }
  }
  return false;
}

function pickBridgeResult(fileList, sinceEpochMs) {
  if (!fileList || !fileList.length) return null;

  var best = null;
  for (var i = 0; i < fileList.length; i++) {
    var entry = fileList[i];
    if (!entry || !entry.name) continue;
    if (!(entry.mtimeMs > sinceEpochMs)) continue;
    if (!psfHasImageExt(entry.name)) continue;
    if (best === null || entry.mtimeMs > best.mtimeMs) {
      best = entry;
    }
  }
  return best;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildBridgeClipboard: buildBridgeClipboard,
    pickBridgeResult: pickBridgeResult
  };
}

/* ===== inlined: jsx/io.jsx ===== */
/* PackshotForge — file/shell helpers for ExtendScript (ES3).
 * Included by PackshotForge.jsx. No Node here.
 */

var PSF_IS_MAC = ($.os.toLowerCase().indexOf("mac") !== -1);

function psfTempDir() {
  var d = new Folder(Folder.temp.fsName + "/PackshotForge");
  if (!d.exists) d.create();
  return d.fsName;
}

function psfConfigFile() {
  var d = new Folder(Folder.userData.fsName + "/PackshotForge");
  if (!d.exists) d.create();
  return new File(d.fsName + "/config.txt");
}

/* config: simple key=value lines (no JSON parser dependency).
 * provider/stabilityKey were added in v1.1 — missing lines (old config
 * files) fall back to the defaults below, so upgrades stay backward
 * compatible. */
function psfLoadConfig() {
  var f = psfConfigFile();
  var cfg = { apiKey: "", model: "gemini-3.1-flash-image", lastPreset: "white-bg", provider: "gemini", stabilityKey: "" };
  if (f.exists && f.open("r")) {
    while (!f.eof) {
      var line = f.readln();
      var eq = line.indexOf("=");
      if (eq > 0) {
        var k = line.substring(0, eq);
        var v = line.substring(eq + 1);
        if (k === "apiKey" || k === "model" || k === "lastPreset" || k === "provider" || k === "stabilityKey") cfg[k] = v;
      }
    }
    f.close();
  }
  return cfg;
}

function psfSaveConfig(cfg) {
  var f = psfConfigFile();
  if (f.open("w")) {
    f.writeln("apiKey=" + cfg.apiKey);
    f.writeln("model=" + cfg.model);
    f.writeln("lastPreset=" + cfg.lastPreset);
    f.writeln("provider=" + (cfg.provider || "gemini"));
    f.writeln("stabilityKey=" + (cfg.stabilityKey || ""));
    f.close();
  }
}

function psfReadTextFile(path) {
  var f = new File(path);
  if (!f.exists) return null;
  f.encoding = "UTF-8";
  if (!f.open("r")) return null;
  var s = f.read();
  f.close();
  return s;
}

function psfWriteTextFile(path, text) {
  var f = new File(path);
  f.encoding = "UTF-8";
  if (!f.open("w")) throw new Error("cannot write " + path);
  f.write(text);
  f.close();
}

/* Run a shell command synchronously. On Windows app.system uses cmd.exe. */
function psfShell(cmd) {
  return app.system(cmd);
}

/* "yyyymmdd-hhmmss" from the current local time — used to make async batch
 * job filenames unique per submit (see psfBatchSubmitAsync) so a second
 * submit to the same output folder can't overwrite/orphan the first
 * already-billed job's file. ES3-safe manual formatting (no Date#toISOString
 * reliance on locale/timezone quirks in older ExtendScript engines). */
function psfTimestampSuffix() {
  var d = new Date();
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}

/* base64-encode a file via OS tools (fast; avoids slow ES3 loops).
 * Output: single-line base64 in outPath. */
function psfBase64EncodeFile(inPath, outPath) {
  if (PSF_IS_MAC) {
    psfShell('base64 -i "' + inPath + '" -o "' + outPath + '"');
  } else {
    /* certutil wraps lines and adds header/footer; strip below */
    psfShell('certutil -encode "' + inPath + '" "' + outPath + '.tmp" >NUL');
    var raw = psfReadTextFile(outPath + ".tmp") || "";
    var lines = raw.split(/\r?\n/);
    var buf = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf("-----") === 0 || lines[i] === "") continue;
      buf[buf.length] = lines[i];
    }
    psfWriteTextFile(outPath, buf.join(""));
    new File(outPath + ".tmp").remove();
  }
  var f = new File(outPath);
  if (!f.exists) throw new Error("base64 encode failed");
}

/* decode a single-line base64 file into a binary file via OS tools */
function psfBase64DecodeFile(inPath, outPath) {
  if (PSF_IS_MAC) {
    psfShell('base64 -D -i "' + inPath + '" -o "' + outPath + '"');
  } else {
    psfShell('certutil -decode "' + inPath + '" "' + outPath + '" >NUL');
  }
  var f = new File(outPath);
  if (!f.exists) throw new Error("base64 decode failed");
}

function psfCurlPost(url, apiKey, payloadPath, responsePath) {
  var cmd = 'curl -s -X POST "' + url + '"' +
    ' -H "Content-Type: application/json"' +
    ' -H "x-goog-api-key: ' + apiKey + '"' +
    ' -d @"' + payloadPath + '"' +
    ' --max-time 180' +
    ' -o "' + responsePath + '"';
  if (PSF_IS_MAC) cmd += " 2>/dev/null";
  psfShell(cmd);
  return psfReadTextFile(responsePath);
}

/* GET variant of psfCurlPost (no payload) — used for batch job status polls
 * and (with authHeaderOverride) Stability result polling. When
 * authHeaderOverride is given, it replaces the default x-goog-api-key header
 * and an "accept: application/json" header is added; existing Gemini call
 * sites that omit it are unaffected. */
function psfCurlGet(url, apiKey, responsePath, authHeaderOverride) {
  var cmd = 'curl -s -X GET "' + url + '"';
  if (authHeaderOverride) {
    cmd += ' -H "' + authHeaderOverride + '"' + ' -H "accept: application/json"';
  } else {
    cmd += ' -H "x-goog-api-key: ' + apiKey + '"';
  }
  cmd += ' --max-time 60' +
    ' -o "' + responsePath + '"';
  if (PSF_IS_MAC) cmd += " 2>/dev/null";
  psfShell(cmd);
  return psfReadTextFile(responsePath);
}

/* multipart/form-data POST (Stability's edit endpoints require -F fields,
 * not a JSON body). fields is a plain object of {name: value}; a value
 * beginning with "@" follows curl's own @path-upload convention, so field
 * values from providers.js (e.g. subject_image: "@/tmp/x.jpg") pass straight
 * through to -F unmodified. */
function psfCurlPostMultipart(url, authHeader, fields, responsePath) {
  var cmd = 'curl -s -X POST "' + url + '"' +
    ' -H "accept: application/json"' +
    ' -H "' + authHeader + '"';
  for (var k in fields) {
    if (!fields.hasOwnProperty(k)) continue;
    cmd += ' -F "' + k + '=' + psfShellEscapeDQ(fields[k]) + '"';
  }
  cmd += ' --max-time 180' +
    ' -o "' + responsePath + '"';
  if (PSF_IS_MAC) cmd += " 2>/dev/null";
  psfShell(cmd);
  return psfReadTextFile(responsePath);
}

/* Escape text for safe embedding inside a double-quoted POSIX shell string
 * (backslash, double-quote, $, and backtick — the characters double quotes
 * do NOT neutralize). Used by psfSetClipboard. */
function psfShellEscapeDQ(s) {
  s = s || "";
  s = s.replace(/\\/g, "\\\\");
  s = s.replace(/"/g, '\\"');
  s = s.replace(/\$/g, "\\$");
  s = s.replace(/`/g, "\\`");
  return s;
}

/* Copy text to the OS clipboard for the Subscription Bridge flow. Mac-only
 * (matches this file's platform posture — several helpers above are also
 * mac/win-branched, but clipboard access has no existing Windows path here);
 * on Windows this alerts and returns false so callers can bail gracefully. */
function psfSetClipboard(text) {
  if (!PSF_IS_MAC) {
    alert("Subscription Bridge clipboard copy is currently mac-only.");
    return false;
  }
  psfShell('printf %s "' + psfShellEscapeDQ(text) + '" | pbcopy');
  return true;
}


var PSF_VERSION = "1.1.0";
var PSF_ENDPOINT_GENERATE = "https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent";
var PSF_MODELS = ["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image", "gemini-2.5-flash-image"];
var PSF_MAX_SEND_PX = 1536; /* long edge sent to the API; model re-renders anyway */
var PSF_DRAFT_MAX_SEND_PX = 768; /* long edge cap when Draft mode is on */
var PSF_DRAFT_MODEL = "gemini-3.1-flash-lite-image";
var PSF_BATCH_STATUS_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/";

/* ---------- pipeline ---------- */

function psfExportDocForApi(doc, jpgPath, maxPx) {
  var cap = maxPx || PSF_MAX_SEND_PX;
  var dupe = doc.duplicate("psf_tmp", true); /* flattened duplicate */
  try {
    var w = dupe.width.as("px");
    var h = dupe.height.as("px");
    var longEdge = Math.max(w, h);
    if (longEdge > cap) {
      var scale = cap / longEdge;
      dupe.resizeImage(UnitValue(Math.round(w * scale), "px"), UnitValue(Math.round(h * scale), "px"), null, ResampleMethod.BICUBIC);
    }
    var opts = new JPEGSaveOptions();
    opts.quality = 10;
    opts.embedColorProfile = false;
    dupe.saveAs(new File(jpgPath), opts, true, Extension.LOWERCASE);
  } finally {
    dupe.close(SaveOptions.DONOTSAVECHANGES);
  }
}

function psfGenerate(doc, cfg, prompt, statusFn) {
  if (cfg.provider === "stability") {
    return psfGenerateStability(doc, cfg, prompt, statusFn);
  }
  var tmp = psfTempDir();
  var jpgPath = tmp + "/input.jpg";
  var b64Path = tmp + "/input.b64";
  var payloadPath = tmp + "/payload.json";
  var respPath = tmp + "/response.json";
  var outB64Path = tmp + "/output.b64";
  var outImgPath = tmp + "/output.png";

  statusFn("Exporting document...");
  psfExportDocForApi(doc, jpgPath, cfg.draftMode ? PSF_DRAFT_MAX_SEND_PX : PSF_MAX_SEND_PX);

  statusFn("Encoding...");
  psfBase64EncodeFile(jpgPath, b64Path);
  var imgB64 = psfReadTextFile(b64Path);
  if (!imgB64) throw new Error("encode failed");
  imgB64 = imgB64.replace(/[\r\n]/g, "");

  statusFn("Building request...");
  var payload = buildGenerateContentPayload(prompt, imgB64, "image/jpeg");
  psfWriteTextFile(payloadPath, payload);

  statusFn("Calling Gemini (" + cfg.model + ")...");
  var url = PSF_ENDPOINT_GENERATE.replace("{MODEL}", cfg.model);
  var resp = psfCurlPost(url, cfg.apiKey, payloadPath, respPath);
  if (!resp) throw new Error("no response from API (check internet/curl)");

  var outB64 = extractImageBase64(resp);
  if (!outB64) {
    var em = resp.match(/"message"\s*:\s*"([^"]{0,200})/);
    throw new Error(em ? ("API error: " + em[1]) : ("no image in response: " + resp.substring(0, 160)));
  }

  statusFn("Decoding result...");
  psfWriteTextFile(outB64Path, outB64);
  psfBase64DecodeFile(outB64Path, outImgPath);
  return outImgPath;
}

/* Stability provider path (buildRequest/parseSubmitResponse/buildPollRequest/
 * parsePollResponse — see core/providers.js). Multipart submit, then poll up
 * to 24x5s = 2min for the async job to finish. Same contract as the Gemini
 * path above: returns the decoded output image path, or throws. */
function psfGenerateStability(doc, cfg, prompt, statusFn) {
  var tmp = psfTempDir();
  var jpgPath = tmp + "/input.jpg";
  var respPath = tmp + "/response.json";
  var outB64Path = tmp + "/output.b64";
  var outImgPath = tmp + "/output.png";

  statusFn("Exporting document...");
  psfExportDocForApi(doc, jpgPath, cfg.draftMode ? PSF_DRAFT_MAX_SEND_PX : PSF_MAX_SEND_PX);

  statusFn("Building request...");
  var req = buildRequest("stability", { apiKey: cfg.stabilityKey }, prompt, jpgPath);

  statusFn("Calling Stability...");
  var resp = psfCurlPostMultipart(req.url, req.authHeader, req.fields, respPath);
  if (!resp) throw new Error("Stability: no response from API (check internet/curl)");

  var parsed = parseSubmitResponse("stability", resp);
  if (parsed.error) throw new Error("Stability error: " + parsed.error);

  var imageB64 = parsed.imageB64;
  if (!imageB64 && parsed.pollUrl) {
    var pollReq = buildPollRequest("stability", { apiKey: cfg.stabilityKey }, parsed.pollUrl);
    var pollResult = { done: false };
    var attempts = 0;
    while (attempts < 24) {
      $.sleep(5000);
      attempts++;
      statusFn("Waiting for Stability result (" + attempts + "/24)...");
      var pollResp = psfCurlGet(pollReq.url, cfg.stabilityKey, respPath, pollReq.authHeader);
      pollResult = parsePollResponse("stability", pollResp);
      if (pollResult.done) break;
    }
    if (!pollResult.done) throw new Error("Stability: timed out waiting for result");
    if (pollResult.error) throw new Error("Stability error: " + pollResult.error);
    imageB64 = pollResult.imageB64;
  }
  if (!imageB64) throw new Error("Stability: no image in response: " + resp.substring(0, 160));

  statusFn("Decoding result...");
  psfWriteTextFile(outB64Path, imageB64);
  psfBase64DecodeFile(outB64Path, outImgPath);
  return outImgPath;
}

function psfPlaceAsLayer(targetDoc, imgPath, layerName) {
  var gen = app.open(new File(imgPath));
  gen.selection.selectAll();
  gen.selection.copy();
  gen.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument = targetDoc;
  var layer = targetDoc.paste();
  layer.name = layerName;
  return layer;
}

/* Reads pixel dimensions off an image file by opening/closing it — used to
 * report Subscription Bridge import size vs marketplace spec. Returns
 * {width, height} or null on any failure. */
function psfImageDimensionsPx(path) {
  try {
    var g = app.open(new File(path));
    var dims = { width: Math.round(g.width.as("px")), height: Math.round(g.height.as("px")) };
    g.close(SaveOptions.DONOTSAVECHANGES);
    return dims;
  } catch (e) {
    return null;
  }
}

/* Run Photoshop's Select Subject (autoCutout) on the currently active layer
 * of doc. Returns the selection bounds as a plain [x1,y1,x2,y2] px array, or
 * null on any failure (e.g. Select Subject unavailable, empty selection). */
function psfSelectSubject(doc) {
  try {
    var d = new ActionDescriptor();
    d.putBoolean(stringIDToTypeID("sampleAllLayers"), false);
    executeAction(stringIDToTypeID("autoCutout"), d, DialogModes.NO);
    var b = doc.selection.bounds;
    return [b[0].as("px"), b[1].as("px"), b[2].as("px"), b[3].as("px")];
  } catch (e) {
    try { doc.selection.deselect(); } catch (e2) {}
    return null;
  }
}

/* Composite the ORIGINAL product pixels back on top of the AI-generated
 * layer (genLayer), masked to the subject silhouette, so the shipped
 * product photo never differs from the source at the pixel level.
 * Returns {ok:true, bounds:[...]} on success, {ok:false, reason:"..."} on
 * failure — caller falls back to keeping genLayer as-is. */
function psfApplyPixelLock(doc, genLayer) {
  try {
    genLayer.visible = false;
    doc.activeLayer = doc.layers[doc.layers.length - 1];
    var bounds = psfSelectSubject(doc);
    var sanity = maskSanity(bounds, doc.width.as("px"), doc.height.as("px"));
    if (!sanity.ok) {
      try { doc.selection.deselect(); } catch (e1) {}
      genLayer.visible = true;
      return { ok: false, reason: sanity.reason };
    }

    var dup = doc.layers[doc.layers.length - 1].duplicate(doc.layers[0], ElementPlacement.PLACEBEFORE);
    dup.name = "PSF Product (original)";
    doc.activeLayer = dup;

    var m = new ActionDescriptor();
    m.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
    var r = new ActionReference();
    r.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
    m.putReference(charIDToTypeID("At  "), r);
    m.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("RvlS"));
    executeAction(charIDToTypeID("Mk  "), m, DialogModes.NO);

    genLayer.visible = true;
    try { doc.selection.deselect(); } catch (e2) {}
    return { ok: true, bounds: bounds };
  } catch (e) {
    try { doc.selection.deselect(); } catch (e3) {}
    genLayer.visible = true;
    return { ok: false, reason: e.message };
  }
}

function psfExportForMarketplace(doc, marketplace, outFolder, baseName) {
  var spec = getExportSpec(marketplace);
  if (!spec) return null;
  var dupe = doc.duplicate("psf_export", true);
  try {
    /* fit inside spec box, then pad canvas to exact size */
    var w = dupe.width.as("px");
    var h = dupe.height.as("px");
    var scale = Math.min(spec.width / w, spec.height / h);
    dupe.resizeImage(UnitValue(Math.round(w * scale), "px"), UnitValue(Math.round(h * scale), "px"), null, ResampleMethod.BICUBIC);
    var bg = spec.background ? psfHexToColor(spec.background) : psfHexToColor("#FFFFFF");
    app.backgroundColor = bg;
    dupe.resizeCanvas(UnitValue(spec.width, "px"), UnitValue(spec.height, "px"), AnchorPosition.MIDDLECENTER);
    var opts = new JPEGSaveOptions();
    opts.quality = Math.round(spec.quality / 100 * 12);
    var outPath = outFolder + "/" + baseName + "-" + marketplace + ".jpg";
    dupe.saveAs(new File(outPath), opts, true, Extension.LOWERCASE);
    return outPath;
  } finally {
    dupe.close(SaveOptions.DONOTSAVECHANGES);
  }
}

/* Exports a transparent PNG "cutout" of just the pixel-locked product: a
 * flatten=NO duplicate with every layer removed except the named
 * Pixel-Lock layer (which carries the original-pixel mask), so its alpha
 * channel is the subject silhouette. Closes the dupe (no save) and returns
 * the written file path. Throws if the named layer isn't found in the dupe
 * (caller should check for it in the live doc first). */
function psfExportCutoutPng(doc, keepLayerName) {
  var dupe = doc.duplicate("psf_cutout", false); /* false = keep layers, don't flatten */
  try {
    for (var i = dupe.layers.length - 1; i >= 0; i--) {
      if (dupe.layers[i].name !== keepLayerName) {
        dupe.layers[i].remove();
      }
    }
    try {
      if (dupe.backgroundLayer) dupe.backgroundLayer.isBackgroundLayer = false;
    } catch (eBg) {}

    var base = doc.name.replace(/\.[^.]+$/, "");
    var outFolderPath;
    try {
      outFolderPath = doc.path.fsName;
    } catch (ePath) {
      outFolderPath = Folder.desktop.fsName;
    }
    var outPath = outFolderPath + "/" + base + "-cutout.png";

    /* SaveForWeb은 PS 2026에서 DialogModes.NO일 때 "기능 사용 불가"로 죽는 레거시 —
     * 다른 내보내기와 동일하게 saveAs를 쓴다. 배경 레이어를 위에서 해제했으므로
     * PNG 알파(제품 실루엣)는 보존된다. */
    var o = new PNGSaveOptions();
    o.compression = 4;
    o.interlaced = false;
    dupe.saveAs(new File(outPath), o, true, Extension.LOWERCASE);
    return outPath;
  } finally {
    dupe.close(SaveOptions.DONOTSAVECHANGES);
  }
}

function psfHexToColor(hex) {
  var c = new SolidColor();
  c.rgb.red = parseInt(hex.substring(1, 3), 16);
  c.rgb.green = parseInt(hex.substring(3, 5), 16);
  c.rgb.blue = parseInt(hex.substring(5, 7), 16);
  return c;
}

/* ---------- batch ---------- */

/* Runs every image in inFolder through every preset in presets (M images x N
 * presets). Wires in Pixel-Lock (cfg.pixelLock) and PNG transparency
 * verification per item — neither failure blocks the rest of the batch.
 * Returns { results, done, failed, total } where results[] matches the
 * buildBatchReport contract: {name, preset, ok, alphaOk, error}, plus a
 * non-blocking informational "pixelLock" field. */
function psfBatch(cfg, presets, customText, marketplace, inFolder, outFolder, statusFn) {
  var files = inFolder.getFiles(/\.(jpg|jpeg|png)$/i);
  if (files.length === 0) throw new Error("no jpg/png files in input folder");
  /* 저장 오류가 모달로 뜨면 배치 전체가 멈춘다(2026-07-27 읽기전용 폴더 실증).
   * NO로 강제해 예외로 흐르게 한다 — 항목별 try/catch가 받아서 배치는 계속된다. */
  var prevDialogs = app.displayDialogs;
  app.displayDialogs = DialogModes.NO;
  var results = [];
  var done = 0, failed = 0;
  var total = files.length * presets.length;
  var completed = 0;
  /* apiCalls counts only items that actually reached (and got a successful
   * return from) psfGenerate — the billable event. Items that error out
   * before/without a successful generate (e.g. doc open failure, pixel-lock
   * or export errors don't apply here since generate already ran) must not
   * be billed. This must NOT use `completed`, which counts attempted items
   * regardless of outcome. */
  var apiCalls = 0;

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var base = decodeURI(f.name).replace(/\.[^.]+$/, "");

    for (var j = 0; j < presets.length; j++) {
      var preset = presets[j];
      completed++;
      var costSoFar = estimateCost(cfg.provider, cfg.model, apiCalls, false);
      statusFn("[" + completed + "/" + total + "] " + decodeURI(f.name) + " — " + preset.label +
        " — est. cost so far " + formatCost(costSoFar));

      var rec = { name: decodeURI(f.name), preset: preset.label, ok: false, alphaOk: null, error: null, pixelLock: "n/a" };
      var doc = null;
      try {
        var prompt = buildPrompt(preset.id, { customText: customText, pixelLock: cfg.pixelLock });
        doc = app.open(f);
        try {
          var imgPath = psfGenerate(doc, cfg, prompt, statusFn);
          apiCalls++; /* billable event: psfGenerate returned successfully (API was called and charged) */
          var genLayer = psfPlaceAsLayer(doc, imgPath, "PackshotForge — " + preset.label);

          if (cfg.pixelLock) {
            var lockResult = psfApplyPixelLock(doc, genLayer);
            rec.pixelLock = lockResult.ok ? "true" : ("false(" + lockResult.reason + ")");
          }

          var spec = marketplace ? getExportSpec(marketplace) : null;
          var format = spec ? spec.format : "jpg";
          if (format === "png") {
            var hasAlpha = true;
            try { hasAlpha = !doc.backgroundLayer; } catch (eAlpha) { hasAlpha = true; }
            var av = alphaVerdict(hasAlpha, format);
            rec.alphaOk = av.ok;
          }

          if (marketplace) {
            /* qualify with preset.id so N presets don't overwrite each other's
             * marketplace export under the same base filename (mirrors the
             * layer-only branch below, which already includes preset.id) */
            psfExportForMarketplace(doc, marketplace, outFolder.fsName, base + "-" + preset.id);
          } else {
            var flat = doc.duplicate("psf_flat", true);
            var opts = new JPEGSaveOptions(); opts.quality = 11;
            flat.saveAs(new File(outFolder.fsName + "/" + base + "-" + preset.id + "-forge.jpg"), opts, true, Extension.LOWERCASE);
            flat.close(SaveOptions.DONOTSAVECHANGES);
          }

          rec.ok = true;
          done++;
        } finally {
          doc.close(SaveOptions.DONOTSAVECHANGES);
        }
      } catch (e) {
        failed++;
        rec.ok = false;
        rec.error = e.message;
        $.writeln("PackshotForge batch error on " + f.name + " [" + preset.label + "]: " + e.message);
      }
      results[results.length] = rec;
    }
  }

  app.displayDialogs = prevDialogs;
  return { results: results, done: done, failed: failed, total: total, apiCalls: apiCalls };
}

/* Prepares every (image x preset) pair as a batch item — exporting/encoding
 * each doc same as the interactive path, but WITHOUT calling the API — then
 * submits ONE batchGenerateContent request for the whole set (Gemini's async
 * 50%-off batch mode). Saves the returned job name + outFolder + model to
 * "<outFolder>/psf_batch_job-<yyyymmdd-hhmmss>.txt" (timestamped so a second
 * submit to the same folder can't overwrite/orphan the first job's file) so
 * "Fetch batch results..." can find it later. Also forces pixelLock:false in
 * every item's prompt regardless of the UI checkbox, since there is no live
 * Photoshop document at fetch time to composite Pixel-Lock into — see the
 * inline comment at the prompt-building loop below.
 * Returns { jobName, itemCount, jobFile }. */
function psfBatchSubmitAsync(cfg, presets, customText, inFolder, outFolder, statusFn) {
  var files = inFolder.getFiles(/\.(jpg|jpeg|png)$/i);
  if (files.length === 0) throw new Error("no jpg/png files in input folder");
  var tmp = psfTempDir();
  var maxPx = cfg.draftMode ? PSF_DRAFT_MAX_SEND_PX : PSF_MAX_SEND_PX;
  var items = [];
  var total = files.length * presets.length;
  var n = 0;

  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var base = decodeURI(f.name).replace(/\.[^.]+$/, "");
    var doc = app.open(f);
    try {
      var jpgPath = tmp + "/psf_batch_src_" + i + ".jpg";
      var b64Path = tmp + "/psf_batch_src_" + i + ".b64";
      statusFn("[" + (n + 1) + "/" + total + "] preparing " + decodeURI(f.name) + "...");
      psfExportDocForApi(doc, jpgPath, maxPx);
      psfBase64EncodeFile(jpgPath, b64Path);
      var imgB64 = psfReadTextFile(b64Path);
      if (!imgB64) throw new Error("encode failed for " + f.name);
      imgB64 = imgB64.replace(/[\r\n]/g, "");

      for (var j = 0; j < presets.length; j++) {
        var preset = presets[j];
        n++;
        /* Async batch results are raw PNGs saved straight to disk — there is
         * no Photoshop document open at fetch time to composite the original
         * product pixels into (psfApplyPixelLock needs a live doc + layers).
         * So the prompt must ask the model for a COMPLETE image, not a
         * background expecting a Pixel-Lock composite it will never get —
         * forcing pixelLock:false here regardless of the UI checkbox. */
        var prompt = buildPrompt(preset.id, { customText: customText, pixelLock: false });
        items[items.length] = { key: base + "-" + preset.id, prompt: prompt, imgB64: imgB64, mime: "image/jpeg" };
      }
    } finally {
      doc.close(SaveOptions.DONOTSAVECHANGES);
    }
  }

  statusFn("Submitting batch job (" + items.length + " items)...");
  var payload = buildBatchSubmitPayload(cfg.model, items);
  var payloadPath = tmp + "/psf_batch_payload.json";
  var respPath = tmp + "/psf_batch_submit_response.json";
  psfWriteTextFile(payloadPath, payload);
  var url = batchSubmitUrl(cfg.model);
  var resp = psfCurlPost(url, cfg.apiKey, payloadPath, respPath);
  if (!resp) throw new Error("no response from API (check internet/curl)");

  var nm = resp.match(/"name"\s*:\s*"(batches\/[^"]+)"/);
  if (!nm) {
    var em = resp.match(/"message"\s*:\s*"([^"]{0,200})/);
    throw new Error(em ? ("API error: " + em[1]) : ("no batch job name in response: " + resp.substring(0, 160)));
  }
  var jobName = psfSanitizeToken(nm[1]);

  /* Unique filename per submit (timestamp suffix): a fixed "psf_batch_job.txt"
   * would get overwritten by a second submit to the same output folder,
   * orphaning the first job's (already-billed) reference. */
  var jobFile = outFolder.fsName + "/psf_batch_job-" + psfTimestampSuffix() + ".txt";
  psfWriteTextFile(jobFile,
    "jobName=" + jobName + "\n" +
    "outFolder=" + outFolder.fsName + "\n" +
    "model=" + cfg.model + "\n");

  return { jobName: jobName, itemCount: items.length, jobFile: jobFile };
}

/* Reads a psf_batch_job*.txt job file, polls the batch job's status ONCE,
 * and — if it has finished successfully — decodes each returned image to
 * "<outFolder>/<key>-batch.png" (the key is sanitized before it touches the
 * filesystem — see psfSanitizeToken). A terminal-but-unsuccessful state
 * (FAILED/CANCELLED/EXPIRED) is reported back as done:true, failed:true
 * instead of being treated as "not finished yet". Placing results as layers
 * is NOT part of this flow; files on disk are the deliverable (the job's
 * source document is not open in Photoshop at fetch time, often not even on
 * this machine run).
 * Returns a summary object for the caller to alert(); never throws for a
 * not-yet-done job (that's a normal, expected state). */
function psfFetchBatchResults(cfg, jobFile, statusFn) {
  var text = psfReadTextFile(jobFile.fsName);
  if (!text) throw new Error("could not read job file: " + jobFile.fsName);
  var jm = text.match(/jobName=([^\r\n]+)/);
  var om = text.match(/outFolder=([^\r\n]+)/);
  if (!jm) throw new Error("job file is missing jobName: " + jobFile.fsName);
  var jobName = jm[1];
  var outFolder = om ? om[1] : jobFile.parent.fsName;

  statusFn("Checking batch job status...");
  var tmp = psfTempDir();
  var respPath = tmp + "/psf_batch_status_response.json";
  var url = PSF_BATCH_STATUS_BASE_URL + jobName;
  var resp = psfCurlGet(url, cfg.apiKey, respPath);
  if (!resp) throw new Error("no response from API (check internet/curl)");

  var status = parseBatchStatus(resp);
  if (!status.done) {
    return { done: false, failed: false, jobName: jobName, state: status.state || "unknown" };
  }
  if (status.failed) {
    /* Terminal but unsuccessful (FAILED/CANCELLED/EXPIRED) — this job will
     * never produce results. Return immediately instead of trying to
     * extract images from a response that has none. */
    return { done: true, failed: true, jobName: jobName, state: status.state };
  }

  var images = extractBatchImages(resp);
  var saved = 0;
  for (var i = 0; i < images.length; i++) {
    try {
      /* The "key" comes back from the remote API response (regex-captured,
       * not JSON-parsed) and is used to build an output file path below —
       * sanitize it first so a compromised/unexpected response body can't
       * inject path-traversal or shell-meaningful characters. */
      var safeKey = psfSanitizeToken(images[i].key);
      var b64Path = tmp + "/psf_batch_fetch_" + i + ".b64";
      psfWriteTextFile(b64Path, images[i].imageB64);
      var outPath = outFolder + "/" + safeKey + "-batch.png";
      psfBase64DecodeFile(b64Path, outPath);
      saved++;
    } catch (eSave) {
      $.writeln("PackshotForge batch fetch: failed to save " + images[i].key + ": " + eSave.message);
    }
  }

  return { done: true, failed: false, jobName: jobName, outFolder: outFolder, found: images.length, saved: saved };
}

/* ---------- UI ---------- */

function psfBuildPresetList() {
  var items = [];
  for (var i = 0; i < PSF_PRESETS.length; i++) {
    items[items.length] = PSF_PRESETS[i].label + "  [" + PSF_PRESETS[i].category + "]";
  }
  return items;
}

/* Completion dialog for single-document runs: shows the status line(s) and
 * lets the user toggle the generated layer on/off to compare against the
 * original document underneath before flattening/exporting. */
function psfShowResultDialog(doc, genLayer, statusText) {
  var rdlg = new Window("dialog", "PackshotForge — Result");
  rdlg.orientation = "column";
  rdlg.alignChildren = "fill";

  var msg = rdlg.add("statictext", undefined, statusText, { multiline: true });
  msg.characters = 60;

  var diffRow = rdlg.add("group");
  var showOrigBtn = diffRow.add("button", undefined, "Show original");
  var showResultBtn = diffRow.add("button", undefined, "Show result");
  showOrigBtn.onClick = function () {
    genLayer.visible = false;
    app.refresh();
  };
  showResultBtn.onClick = function () {
    genLayer.visible = true;
    app.refresh();
  };

  var cutoutRow = rdlg.add("group");
  var cutoutBtn = cutoutRow.add("button", undefined, "Export transparent PNG (cutout)");
  cutoutBtn.onClick = function () {
    var lockLayerName = "PSF Product (original)";
    var hasLock = false;
    for (var li = 0; li < doc.layers.length; li++) {
      if (doc.layers[li].name === lockLayerName) { hasLock = true; break; }
    }
    if (!hasLock) { alert("Run with Pixel-Lock ON first."); return; }
    try {
      var outPath = psfExportCutoutPng(doc, lockLayerName);

      /* Real verification: reopen the file we just wrote and check whether
       * it actually has an alpha channel, instead of assuming success.
       * Mirrors the same `!d.backgroundLayer` idiom used in the batch path
       * (psfBatch) — a PNG with transparency opens without a background
       * layer. */
      var verifyMsg;
      try {
        var checkDoc = app.open(new File(outPath));
        var hasAlpha = true;
        try { hasAlpha = !checkDoc.backgroundLayer; } catch (eAlpha) { hasAlpha = true; }
        checkDoc.close(SaveOptions.DONOTSAVECHANGES);
        var verdict = alphaVerdict(hasAlpha, "png");
        verifyMsg = verdict.ok ? "transparency verified ✓" : "⚠ exported PNG has no alpha channel";
      } catch (eVerify) {
        verifyMsg = "could not verify (" + eVerify.message + ")";
      }

      alert("Exported transparent PNG (cutout):\n" + outPath + "\n\n" + verifyMsg);
    } catch (e) {
      alert("PackshotForge cutout export error: " + e.message);
    }
  };

  var okRow = rdlg.add("group");
  okRow.alignment = "right";
  var okBtn = okRow.add("button", undefined, "OK", { name: "ok" });
  okBtn.onClick = function () { rdlg.close(); };

  rdlg.show();
}

/* Scrollable, read-only report dialog shown after a batch run finishes. */
function psfShowBatchReportDialog(reportText) {
  var rdlg = new Window("dialog", "PackshotForge — Batch Report");
  rdlg.orientation = "column";
  rdlg.alignChildren = "fill";

  var txt = rdlg.add("edittext", undefined, reportText, { multiline: true, scrolling: true, readonly: true });
  txt.preferredSize = [500, 300];

  var okRow = rdlg.add("group");
  okRow.alignment = "right";
  var okBtn = okRow.add("button", undefined, "OK", { name: "ok" });
  okBtn.onClick = function () { rdlg.close(); };

  rdlg.show();
}

/* Subscription Bridge instruction/import dialog. The clipboard/Finder/URL
 * prep and the initial `since` timestamp happen in the caller (bridgeBtn's
 * onClick) — this dialog is purely the human-in-the-loop step: it never
 * touches gemini.google.com itself, it only watches ~/Downloads for a file
 * the human downloaded there and offers to import it. Import can be clicked
 * more than once (e.g. "not there yet, try again after downloading"). */
function psfShowBridgeDialog(doc, pixelLockOn, preset, since, marketplace) {
  var bdlg = new Window("dialog", "PackshotForge — Subscription Bridge");
  bdlg.orientation = "column";
  bdlg.alignChildren = "fill";

  var steps = "1) Drag the highlighted image into Gemini\n" +
    "2) Cmd+V to paste the prompt (already copied)\n" +
    "3) Send\n" +
    "4) Download the result\n" +
    "5) Click Import below.";
  var msg = bdlg.add("statictext", undefined, steps, { multiline: true });
  msg.characters = 60;

  var btnRow = bdlg.add("group");
  btnRow.alignment = "right";
  var cancelBtn = btnRow.add("button", undefined, "Cancel", { name: "cancel" });
  var importBtn = btnRow.add("button", undefined, "Import result from Downloads");

  cancelBtn.onClick = function () { bdlg.close(); };

  importBtn.onClick = function () {
    try {
      var dlFolder = new Folder("~/Downloads");
      var rawFiles = dlFolder.getFiles();
      var list = [];
      for (var i = 0; i < rawFiles.length; i++) {
        var rf = rawFiles[i];
        if (rf instanceof File) {
          if (!rf.modified) continue;
          list[list.length] = { name: rf.name, mtimeMs: rf.modified.getTime(), _file: rf };
        }
      }
      var best = pickBridgeResult(list, since);
      if (!best) {
        alert("No new image found in Downloads yet. Finish the Gemini steps, download the result, then click Import again.");
        return;
      }

      var dims = psfImageDimensionsPx(best._file.fsName);
      var genLayer = psfPlaceAsLayer(doc, best._file.fsName, "PackshotForge — " + preset.label + " (bridge)");

      var resultLines = ["Imported from Subscription Bridge."];
      if (pixelLockOn) {
        var lockResult = psfApplyPixelLock(doc, genLayer);
        resultLines.push(lockResult.ok ?
          "PIXEL-LOCKED ✓" :
          "VISUAL CHECK ⚠ (" + lockResult.reason + ") — compare before flattening");
      }

      if (dims) {
        var spec = marketplace ? getExportSpec(marketplace) : null;
        if (spec) {
          if (dims.width < spec.width || dims.height < spec.height) {
            resultLines.push("Imported " + dims.width + "×" + dims.height + " — below " + marketplace +
              " " + spec.width + "px, consider upscale.");
          } else {
            resultLines.push("Imported " + dims.width + "×" + dims.height + " — meets " + marketplace + " spec.");
          }
        } else {
          resultLines.push("Imported " + dims.width + "×" + dims.height + ".");
        }
      }

      bdlg.close();
      psfShowResultDialog(doc, genLayer, resultLines.join("\n"));
    } catch (e) {
      alert("PackshotForge bridge import error: " + e.message);
    }
  };

  bdlg.show();
}

function psfMain() {
  var cfg = psfLoadConfig();

  var dlg = new Window("dialog", "PackshotForge v" + PSF_VERSION);
  dlg.orientation = "column";
  dlg.alignChildren = "fill";

  var keyGroup = dlg.add("panel", undefined, "Google Gemini API key (aistudio.google.com — stays on your machine)");
  keyGroup.alignChildren = "fill";
  var keyRow = keyGroup.add("group");
  var keyInput = keyRow.add("edittext", undefined, cfg.apiKey, { properties: {} });
  keyInput.characters = 42;
  var modelDrop = keyRow.add("dropdownlist", undefined, PSF_MODELS);
  modelDrop.selection = 0;
  for (var mi = 0; mi < PSF_MODELS.length; mi++) {
    if (PSF_MODELS[mi] === cfg.model) modelDrop.selection = mi;
  }

  var providerIds = ["gemini", "stability"];
  var providerRow = keyGroup.add("group");
  providerRow.add("statictext", undefined, "Provider:");
  var providerDrop = providerRow.add("dropdownlist", undefined,
    ["Gemini (default)", "Stability ($0.08/img, native subject preserve)"]);
  providerDrop.selection = (cfg.provider === "stability") ? 1 : 0;

  var stabilityKeyRow = keyGroup.add("group");
  stabilityKeyRow.add("statictext", undefined, "Stability API key:");
  var stabilityKeyInput = stabilityKeyRow.add("edittext", undefined, cfg.stabilityKey || "");
  stabilityKeyInput.characters = 42;
  stabilityKeyRow.visible = (cfg.provider === "stability");

  providerDrop.onChange = function () {
    stabilityKeyRow.visible = (providerDrop.selection.index === 1);
    dlg.layout.layout(true);
  };

  var scenePanel = dlg.add("panel", undefined, "Scene");
  scenePanel.alignChildren = "fill";
  var presetDrop = scenePanel.add("dropdownlist", undefined, psfBuildPresetList());
  presetDrop.selection = 0;
  for (var pi = 0; pi < PSF_PRESETS.length; pi++) {
    if (PSF_PRESETS[pi].id === cfg.lastPreset) presetDrop.selection = pi;
  }
  var customRow = scenePanel.add("group");
  customRow.add("statictext", undefined, "Extra instructions:");
  var customInput = customRow.add("edittext", undefined, "");
  customInput.characters = 40;

  var pixelLockCb = scenePanel.add("checkbox", undefined, "Pixel-Lock (keep original product pixels)");
  pixelLockCb.value = true;

  var draftCb = scenePanel.add("checkbox", undefined, "Draft mode (Experimental — lite model, low-res)");
  draftCb.value = false;

  var presetListLabel = scenePanel.add("statictext", undefined, "Batch folder mode — presets to apply (select one or more):");
  var presetList = scenePanel.add("listbox", undefined, psfBuildPresetList(), { multiselect: true });
  presetList.preferredSize = [350, 90];
  presetListLabel.visible = false;
  presetList.visible = false;

  var asyncCb = scenePanel.add("checkbox", undefined, "Batch API (50% off, async — results later)");
  asyncCb.value = false;
  asyncCb.visible = false;

  var outPanel = dlg.add("panel", undefined, "Output");
  outPanel.alignChildren = "left";
  var marketDrop = outPanel.add("dropdownlist", undefined, ["layer only", "amazon (2000×2000 white)", "etsy (3000×2400)", "shopify (2048×2048)"]);
  marketDrop.selection = 0;
  var marketIds = [null, "amazon", "etsy", "shopify"];

  var modePanel = dlg.add("panel", undefined, "Mode");
  modePanel.orientation = "row";
  var modeDoc = modePanel.add("radiobutton", undefined, "Active document");
  var modeBatch = modePanel.add("radiobutton", undefined, "Batch folder");
  modeDoc.value = true;

  modeDoc.onClick = function () {
    presetListLabel.visible = false;
    presetList.visible = false;
    asyncCb.visible = false;
    dlg.layout.layout(true);
  };
  modeBatch.onClick = function () {
    presetListLabel.visible = true;
    presetList.visible = true;
    asyncCb.visible = true;
    dlg.layout.layout(true);
  };

  var status = dlg.add("statictext", undefined, "Ready.");
  status.characters = 60;

  var btnRow = dlg.add("group");
  btnRow.alignment = "right";
  var bridgeBtn = btnRow.add("button", undefined, "Subscription Bridge (no API key)…");
  var fetchBtn = btnRow.add("button", undefined, "Fetch batch results…");
  var cancelBtn = btnRow.add("button", undefined, "Cancel", { name: "cancel" });
  var runBtn = btnRow.add("button", undefined, "Generate", { name: "ok" });

  var lastBatchOutFolder = null; /* in-session only: prefills the Fetch dialog's start folder */

  function setStatus(s) { status.text = s; dlg.update(); }

  runBtn.onClick = function () {
    cfg.provider = providerIds[providerDrop.selection.index];
    var apiKey = keyInput.text.replace(/^\s+|\s+$/g, "");
    var stabilityKey = stabilityKeyInput.text.replace(/^\s+|\s+$/g, "");
    cfg.stabilityKey = stabilityKey;
    if (cfg.provider === "stability") {
      if (!stabilityKey) { alert("Please paste your Stability API key (platform.stability.ai)."); return; }
    } else {
      if (!apiKey) { alert("Please paste your Gemini API key (free at aistudio.google.com)."); return; }
    }
    cfg.apiKey = apiKey;
    cfg.model = PSF_MODELS[modelDrop.selection.index];
    var preset = PSF_PRESETS[presetDrop.selection.index];
    cfg.lastPreset = preset.id;
    cfg.pixelLock = pixelLockCb.value;
    psfSaveConfig(cfg); /* persist the user's real dropdown choice, BEFORE the draft override below */

    cfg.draftMode = draftCb.value;
    if (cfg.draftMode && cfg.provider === "gemini") cfg.model = PSF_DRAFT_MODEL; /* this run only — not saved to config */

    if (cfg.provider === "stability" && (cfg.draftMode || (modeBatch.value && asyncCb.value))) {
      alert("Gemini-only feature — switch provider");
      return;
    }

    var marketplace = marketIds[marketDrop.selection.index];

    try {
      if (modeBatch.value) {
        var selectedPresets = [];
        var sel = presetList.selection;
        if (sel) {
          if (sel.length === undefined) sel = [sel]; /* single selection can come back as a bare item */
          for (var si = 0; si < sel.length; si++) {
            selectedPresets[selectedPresets.length] = PSF_PRESETS[sel[si].index];
          }
        }
        if (selectedPresets.length === 0) selectedPresets = [preset]; /* fallback: dropdown's preset */

        var inFolder = Folder.selectDialog("Choose the INPUT folder (jpg/png product photos)");
        if (!inFolder) return;
        var outFolder = Folder.selectDialog("Choose the OUTPUT folder");
        if (!outFolder) return;
        lastBatchOutFolder = outFolder;

        if (asyncCb.value) {
          var sub = psfBatchSubmitAsync(cfg, selectedPresets, customInput.text, inFolder, outFolder, setStatus);
          var estCost = estimateCost("gemini", cfg.model, sub.itemCount, true);
          var subLines = [
            "Batch job submitted.",
            "",
            "Job: " + sub.jobName,
            "Items: " + sub.itemCount,
            "Estimated cost (50% batch rate): " + formatCost(estCost),
            "Job file: " + sub.jobFile,
            "",
            "Batches can take up to 24h (often just minutes-to-tens-of-minutes). " +
              "Use \"Fetch batch results…\" once it's ready.",
            "",
            "Batch API results are raw PNGs — no Pixel-Lock compositing and no marketplace export. " +
              "Use interactive mode if you need those."
          ];
          if (cfg.draftMode) subLines.push("", "Draft — uncheck Draft mode and re-run to finalize at full quality.");
          setStatus("Batch job submitted.");
          alert(subLines.join("\n"));
        } else {
          var r = psfBatch(cfg, selectedPresets, customInput.text, marketplace, inFolder, outFolder, setStatus);
          var totalCost = estimateCost(cfg.provider, cfg.model, r.apiCalls, false);
          var reportText = buildBatchReport(r.results, "estimated cost: " + formatCost(totalCost));
          if (cfg.draftMode) reportText += "\n\nDraft — uncheck Draft mode and re-run to finalize at full quality.";
          /* The dialog is the run's only cost record if the write below
           * fails (e.g. a read-only output folder) — it must not be
           * swallowed along with the write error. */
          try {
            psfWriteTextFile(outFolder.fsName + "/psf_batch_report.txt", reportText);
          } catch (eReportWrite) {
            reportText += "\n\n(could not write psf_batch_report.txt: " + eReportWrite.message + ")";
          }
          psfShowBatchReportDialog(reportText);
        }
      } else {
        var prompt = buildPrompt(preset.id, { customText: customInput.text, pixelLock: cfg.pixelLock });
        if (app.documents.length === 0) { alert("Open a product photo first."); return; }
        var doc = app.activeDocument;
        var imgPath = psfGenerate(doc, cfg, prompt, setStatus);
        var genLayer = psfPlaceAsLayer(doc, imgPath, "PackshotForge — " + preset.label);

        var resultLines = ["Done."];
        if (cfg.provider === "stability") resultLines.push("Stability: native subject preserve");
        if (cfg.pixelLock) {
          setStatus("Applying pixel-lock...");
          var lockResult = psfApplyPixelLock(doc, genLayer);
          resultLines.push(lockResult.ok ?
            "PIXEL-LOCKED ✓" :
            "VISUAL CHECK ⚠ (" + lockResult.reason + ") — compare before flattening");
        }

        if (marketplace) {
          var outFolder2 = Folder.selectDialog("Choose the OUTPUT folder for the " + marketplace + " export");
          if (outFolder2) {
            var base2 = doc.name.replace(/\.[^.]+$/, "");
            psfExportForMarketplace(doc, marketplace, outFolder2.fsName, base2);
          }
        }
        if (cfg.draftMode) resultLines.push("Draft — uncheck Draft mode and re-run to finalize at full quality.");
        setStatus("Done.");
        psfShowResultDialog(doc, genLayer, resultLines.join("\n"));
      }
      dlg.close();
    } catch (e) {
      alert("PackshotForge error: " + e.message);
      setStatus("Error: " + e.message);
    }
  };

  fetchBtn.onClick = function () {
    var apiKey = keyInput.text.replace(/^\s+|\s+$/g, "");
    if (!apiKey) { alert("Please paste your Gemini API key (free at aistudio.google.com)."); return; }
    cfg.apiKey = apiKey;

    /* Default-list the last batch output folder so the user picks from
     * where the timestamped psf_batch_job-<yyyymmdd-hhmmss>.txt files
     * actually landed, instead of hunting for the right one. */
    if (lastBatchOutFolder) Folder.current = lastBatchOutFolder;
    var jobFile = File.openDialog("Choose the psf_batch_job*.txt file for the job to fetch", "*.txt");
    if (!jobFile) return;

    try {
      setStatus("Fetching batch status...");
      var result = psfFetchBatchResults(cfg, jobFile, setStatus);
      if (!result.done) {
        setStatus("Batch job not finished yet.");
        alert("Batch job not finished yet.\n\nJob: " + result.jobName + "\nState: " + result.state +
          "\n\nTry \"Fetch batch results…\" again later (jobs can take up to 24h).");
      } else if (result.failed) {
        setStatus("Batch job ended with state " + result.state + " — no results.");
        alert("This batch job ended with state " + result.state + " — it will not produce results.\n\n" +
          "Job: " + result.jobName);
      } else {
        setStatus("Fetched " + result.saved + " image(s).");
        alert("Batch results fetched.\n\n" + result.saved + " of " + result.found + " image(s) saved to:\n" +
          result.outFolder +
          "\n\nFiles are saved to disk as PNGs — placing them as layers is not part of this flow; " +
          "the files on disk are the deliverable." +
          "\n\nBatch API results are raw PNGs — no Pixel-Lock compositing and no marketplace export. " +
          "Use interactive mode if you need those.");
      }
    } catch (e) {
      alert("PackshotForge error: " + e.message);
      setStatus("Error: " + e.message);
    }
  };

  /* Subscription Bridge: no API key, no Gemini automation. We only prep a
   * clipboard + a Finder/URL nudge, then watch ~/Downloads for the file the
   * human downloads themselves — the actual gemini.google.com steps are
   * entirely manual (drag image in, paste, send, download). */
  bridgeBtn.onClick = function () {
    if (app.documents.length === 0) { alert("Open a product photo first."); return; }
    var doc = app.activeDocument;
    var preset = PSF_PRESETS[presetDrop.selection.index];
    var marketplace = marketIds[marketDrop.selection.index];
    try {
      setStatus("Preparing Subscription Bridge...");
      var tmp = psfTempDir();
      var tmpJpg = tmp + "/bridge_input.jpg";
      psfExportDocForApi(doc, tmpJpg, PSF_MAX_SEND_PX);

      var clipText = buildBridgeClipboard(preset.id, { customText: customInput.text, pixelLock: pixelLockCb.value });
      psfSetClipboard(clipText);

      var since = new Date().getTime();
      if (PSF_IS_MAC) {
        psfShell('open -R "' + tmpJpg + '"');
        psfShell('open "https://gemini.google.com"');
      } else {
        alert("Subscription Bridge: please manually open the highlighted file's location (" +
          tmpJpg + ") and go to https://gemini.google.com to continue.");
      }

      setStatus("Waiting for Subscription Bridge import...");
      psfShowBridgeDialog(doc, pixelLockCb.value, preset, since, marketplace);
      setStatus("Ready.");
    } catch (e) {
      alert("PackshotForge bridge error: " + e.message);
      setStatus("Error: " + e.message);
    }
  };

  dlg.show();
}

/* PSF_NO_UI: 스모크 하니스 등이 함수 정의만 필요할 때 UI 진입을 막는 가드 */
if (typeof PSF_NO_UI === "undefined" || !PSF_NO_UI) {
  psfMain();
}
