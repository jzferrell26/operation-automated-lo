# Fixed webinar raster font

This directory contains a derivative of the repository's Inter v4.1 variable font for native webinar PNG rendering. The interface's original WOFF2 is unchanged. No font was downloaded or subset for this increment.

The original font's SIL Open Font License permits modification and redistribution. It declares no Reserved Font Name. The complete original license and copyright notice remain unchanged in [the parent LICENSE.txt](../LICENSE.txt), retained in the same source and deployment bundle. This subfolder is not distributed independently. Only the font container and identifying family names changed. The unique family `AutomatedLOWebinarInter` prevents a separately installed Inter face from taking precedence. All glyphs and variable axes remain present.

`derive-font.py` converts the existing `../InterVariable.woff2` with already installed Python 3.13, fontTools 4.63.0 and Brotli. It keeps the source timestamp, emits an uncompressed TTF, changes identifying name records 1, 3, 4, 6, 16, 21 and 25, and derives contiguous supported-codepoint ranges from its cmap. This is a one-time authoring tool, not a runtime dependency. Running it twice reproduced both digests below.

| Asset | Bytes | SHA-256 |
| --- | --- | --- |
| Original InterVariable.woff2 | 352240 | 693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3 |
| AutomatedLOWebinarInter.ttf | 879644 | f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947 |
| glyph-ranges.json | 3364 | 30678790e49b55a9e323cba9d40c184c14ff73449d2a77f288a310f546e9d996 |
| Parent ../LICENSE.txt | 4380 | 262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a |

Recipe 1.0.0 uses Sharp 0.35.5, libvips 8.18.7, Pango 1.58.2, HarfBuzz 14.5.0 and FreeType 2.14.3. The native runtime renders escaped literal text with this absolute verified font path and Pango fallback disabled. Unsupported glyphs refuse output instead of using a system font. The server verifies the font and glyph-manifest digests before rendering. It adds only a white, navy-text lender footer to the original panel, preserves complete identity and disclosures, and encodes PNG without ancillary chunks. Both final PNGs are limited to 2 MiB. Edited Facebook placement words remain separate from the source panel lettering.

Actual PNG digests, dimensions, byte counts and renderer version are frozen per campaign version and compared on every regeneration. Runtime changes that alter bytes refuse an old version. Cross-platform byte equality and production execution require actual deployment qualification; identical package versions alone are not that proof.

The implementation uses native [Sharp text fontfile](https://sharp.pixelplumbing.com/api-constructor/) support and the documented [Pango fallback attribute](https://docs.gtk.org/Pango/pango_markup.html). There is no runtime browser, external URL or font fetch.
