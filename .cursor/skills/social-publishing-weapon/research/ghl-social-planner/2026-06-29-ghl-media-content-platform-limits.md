---
source_url: https://help.gohighlevel.com/support/solutions/articles/48001210585-social-planner-image-video-content-and-api-limitations
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: ghl-media-limits
weapon: social-publishing-weapon
---

# GHL Social Planner: per-platform media, content, and rate limits

## Summary
The official GHL support article enumerating per-platform media format/size limits, character limits, and posting rate limits. This is entirely NEW material the arsenal weapon did not have - the arsenal documented the media-ARRAY requirement (422 if omitted) but not the per-platform CONSTRAINTS that cause downstream publish failures. weapon-forge should turn this into a media-attachment reference table.

## Key quotations / statistics
- Image limits (format / max size / max count):
  - Facebook: JPEG/PNG/GIF, 10 MB, up to 10 images.
  - Instagram: JPEG/PNG, 8 MB, aspect ratio 4:5 to 1.91:1, max 10.
  - LinkedIn: JPEG/PNG/GIF, 8 MB, max 6012x6012px, 9 max.
  - Pinterest: JPEG/PNG/BMP/TIFF/WEBP, 10 MB, 1 image.
  - Threads: JPEG/PNG, 8 MB, up to 20 images.
  - Bluesky: JPEG/PNG, 1 MB per image (tightest).
- Video limits:
  - Facebook Reel: 1 GB, 3-90 sec.
  - Instagram Reel: 300 MB, 3 sec-15 min, thumbnail supported.
  - LinkedIn: MOV/MP4, 500 MB, 3 sec-30 min, 9 max.
  - TikTok Business: MOV/MP4/WebM, 1 GB, 3-600 sec.
  - Bluesky: MP4/MOV, 50 MB, up to 3 min.
- Character limits: Facebook 62,000; Instagram 2,200; LinkedIn 3,000; TikTok 2,200; Pinterest title 100 / content 500; Bluesky 300.
- Posting rate limits: Facebook 200/hr; Instagram 25/24hr; TikTok 15/24hr; LinkedIn 200/24hr; Pinterest 25/5min.

## Annotations for weapon-forge
- NEW REFERENCE TABLE: the arsenal had nothing on per-platform limits. Build a media-attachment guide table from this so a fan-out post does not silently fail on the strictest platform (e.g. Bluesky's 1 MB image / 300 char caps are far tighter than Facebook's 10 MB / 62,000 chars). When one POST targets multiple accountIds, the post must satisfy the MOST RESTRICTIVE target's limits.
- CONNECTS TO THE MEDIA-BY-URL FOOTGUN: GHL fetches the image from the public URL; if that image exceeds a platform's size cap, the post can fail at publish time even though the create returned 201. This is another reason the arsenal's read-back-to-verify rule matters - a 201 create does not guarantee a successful publish given these limits.
- CHARACTER-LIMIT FAN-OUT GOTCHA: a single `summary` sent to multiple accountIds must fit Bluesky's 300 chars if Bluesky is a target, or the per-channel-custom-copy multi-call mode (from the create-post doc) is required. weapon-forge should document the "lowest common denominator vs per-channel custom" decision.
- The 24hr posting rate limits matter for the idempotency/throttle design (a bulk fan-out across many accounts can hit Instagram's 25/24hr or TikTok's 15/24hr caps).
