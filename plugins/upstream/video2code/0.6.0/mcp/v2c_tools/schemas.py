"""工具 schema (从上游工具定义移植适配)。

runtime 只注册 deploy_website/get_asset，video server 只注册视频分析工具。
历史导航/截图 schema 仅作为旧配置兼容数据且不会注册；旧录制 schema 已移除，
浏览器录制统一走 ZCode Browser Use SDK。
"""

import json

TOOL_SCHEMAS = json.loads(r"""
{
  "browser_visit": {
    "description": "Load a web page in the browser and return its interactive element list. This is the entry point of browser automation: element indices returned here are what browser_click / browser_input take. Indices are zero-based and change after scrolling. Also use it to refresh a page for updated content. Handles page loading, JavaScript execution and error states automatically.\n\nNeeded on the FIRST visit to a deployed site. After a redeploy the URL stays the same and the browser auto-reloads — go straight to browser_screenshot; a repeat visit returns the identical element list and wastes a round.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "Page URL to load, e.g. 'https://example.com'."
        },
        "viewport_width": {
          "type": "integer",
          "minimum": 200,
          "maximum": 3840,
          "description": "Set page viewport width before loading (persists for later calls and across browser restarts)."
        },
        "viewport_height": {
          "type": "integer",
          "minimum": 200,
          "maximum": 2160,
          "description": "Set page viewport height before loading (persists)."
        },
        "settle_ms": {
          "type": "integer",
          "minimum": 0,
          "maximum": 15000,
          "description": "Wait this long after load before reading title/elements/screenshot — lets load animations (typewriter, hero reveal) finish. Use this instead of a separate shell sleep round."
        },
        "need_screenshot": {
          "type": "boolean",
          "description": "Whether to include a screenshot in the result. Default is False.",
          "default": false
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        }
      },
      "required": [],
      "additionalProperties": false
    }
  },
  "browser_click": {
    "description": "Click an interactive element — either by zero-based index from the latest element list (see browser_visit), or by CSS selector (preferred when elements have no text label: unlabeled icon buttons are ambiguous by index). Waits for page readiness, handles popups/navigation, and returns the updated page state.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "element_index": {
          "type": "number",
          "description": "Zero-based index of the element to click, from the latest element list (browser_visit; scroll to reveal more elements)."
        },
        "selector": {
          "type": "string",
          "description": "CSS selector to click instead of element_index (e.g. '[aria-label=next]', '.testi-next'). Takes precedence."
        },
        "url": {
          "type": "string",
          "description": "Page URL to operate on (optional; defaults to the current page)."
        },
        "need_screenshot": {
          "type": "boolean",
          "description": "Whether to include a screenshot in the result. Default is False.",
          "default": false
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        }
      },
      "additionalProperties": false
    }
  },
  "browser_input": {
    "description": "Type text into a form field (text input, textarea, search box) selected by its zero-based element index from the latest element list (see browser_visit). Waits for page readiness and returns the updated page state.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "element_index": {
          "type": "number",
          "description": "Zero-based index of the input field, from the latest element list (browser_visit; scroll to reveal more elements)."
        },
        "content": {
          "type": "string",
          "description": "The text to enter into the field (letters, numbers, symbols; passwords may be masked in the browser)."
        },
        "url": {
          "type": "string",
          "description": "Page URL to operate on (optional; defaults to the current page)."
        },
        "need_screenshot": {
          "type": "boolean",
          "description": "Whether to include a screenshot in the result. Default is False.",
          "default": false
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        }
      },
      "required": [
        "element_index",
        "content"
      ],
      "additionalProperties": false
    }
  },
  "browser_hover": {
    "description": "Hover the mouse pointer over a target element (by element_index from the latest element list, or by CSS selector — preferred for unlabeled elements) and take a screenshot. Use this to verify :hover / @media (hover:hover) styles such as color shifts, dropdown menus opening, tooltips appearing, etc. Pure click() does NOT trigger hover state, so this is the only way to capture hover visuals.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "element_index": {
          "type": "integer",
          "minimum": 0,
          "description": "Index into the latest element list (returned by browser_visit / browser_click etc.)."
        },
        "selector": {
          "type": "string",
          "description": "CSS selector to hover instead of element_index. Takes precedence."
        },
        "settle_ms": {
          "type": "integer",
          "minimum": 0,
          "maximum": 3000,
          "description": "Wait after hover before screenshot to let CSS transitions finish. Default 300."
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Output path. Default out/screenshot.png"
        }
      }
    }
  },
  "browser_scroll_down": {
    "description": "Scroll the page down by scroll_amount pixels to reveal content below the viewport (long pages, infinite scroll). Waits for the page to stabilize and returns the updated page state; element indices change after scrolling — re-check the element list.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "scroll_amount": {
          "type": "number",
          "description": "Pixels to scroll down (positive integer; typical 300-1000)."
        },
        "url": {
          "type": "string",
          "description": "Page URL to operate on (optional; defaults to the current page)."
        },
        "need_screenshot": {
          "type": "boolean",
          "description": "Whether to include a screenshot in the result. Default is False.",
          "default": false
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        }
      },
      "required": [
        "scroll_amount"
      ],
      "additionalProperties": false
    }
  },
  "browser_scroll_up": {
    "description": "Scroll the page up by scroll_amount pixels to return to content above the viewport (headers, navigation, previously seen sections). Waits for the page to stabilize and returns the updated page state; element indices change after scrolling.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "scroll_amount": {
          "type": "number",
          "description": "Pixels to scroll up (positive integer; typical 300-1000)."
        },
        "url": {
          "type": "string",
          "description": "Page URL to operate on (optional; defaults to the current page)."
        },
        "need_screenshot": {
          "type": "boolean",
          "description": "Whether to include a screenshot in the result. Default is False.",
          "default": false
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        }
      },
      "required": [
        "scroll_amount"
      ],
      "additionalProperties": false
    }
  },
  "browser_find": {
    "description": "Search the current page for text (case-insensitive, partial match; works across nested spans), scroll the match to viewport center, and return a context snippet plus the new scroll position. Does NOT navigate or reload — in-memory SPA state is preserved. Use skip=N to reach the (N+1)-th occurrence. This is the scroll-to-element primitive: prefer it over guessing browser_scroll_down pixel amounts when you know nearby text.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "Text to search for (case-insensitive, partial match)."
        },
        "skip": {
          "type": "number",
          "description": "Skip the first N matches (0 = first occurrence).",
          "default": 0
        },
        "url": {
          "type": "string",
          "description": "Page URL to operate on (optional; defaults to the current page)."
        },
        "need_screenshot": {
          "type": "boolean",
          "description": "Whether to include a screenshot in the result. Default is False.",
          "default": false
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        }
      },
      "required": [
        "keyword"
      ],
      "additionalProperties": false
    }
  },
  "browser_screenshot": {
    "description": "Take screenshot(s) of the current browser page. Supports temporarily changing the viewport (e.g. for responsive verification), waiting out load animations (settle_ms), and capturing multiple frames in sequence (useful for short animations or progressive renders).\n\nSingle frame (default): one screenshot at current viewport.\nMulti-frame: set frames > 1 + interval_ms to capture a sequence (returned as separate files named <stem>_00.png, <stem>_01.png, ...). Use 4-6 frames at 100-200ms when verifying animations; the model will see all frames inlined into the next user turn.\nViewport: set viewport_width / viewport_height to test responsive breakpoints (e.g. 375x812 for iPhone, 768x1024 for iPad).\nSettle: set settle_ms to wait before the (first) capture — use it instead of a separate shell sleep round when the page has a load animation.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "download_screenshot_path": {
          "type": "string",
          "description": "Base output path. If frames>1, becomes <stem>_NN<ext>. Default out/screenshot.png"
        },
        "viewport_width": {
          "type": "integer",
          "minimum": 200,
          "maximum": 3840,
          "description": "Temporarily resize page viewport width before capture (kept for subsequent calls and across browser restarts). Default keeps current (initial: 1280)."
        },
        "viewport_height": {
          "type": "integer",
          "minimum": 200,
          "maximum": 2160,
          "description": "Temporarily resize page viewport height. Default keeps current (initial: 800)."
        },
        "settle_ms": {
          "type": "integer",
          "minimum": 0,
          "maximum": 15000,
          "description": "Wait this long before the (first) capture — lets load/entrance animations settle. Default 0."
        },
        "frames": {
          "type": "integer",
          "minimum": 1,
          "maximum": 12,
          "description": "Number of sequential screenshots. Default 1."
        },
        "interval_ms": {
          "type": "integer",
          "minimum": 50,
          "maximum": 2000,
          "description": "Delay between frames when frames>1. Default 200."
        }
      }
    }
  },
  "screenshot_web_full_page": {
    "description": "Capture a full-page screenshot. Navigates to `url` if given (otherwise captures the page currently loaded), then pre-scrolls through the page so IntersectionObserver / whileInView reveal animations fire before rasterizing.\n\nCaveat: reveals that re-hide when scrolled out of view (viewport once:false) will still capture hidden near the top-of-page rasterization — for such pages use step-scroll browser_screenshot instead.\nTip: for building per-section same-scale composites, call with need_inline=false, then crop sections from the saved PNG offline and Read the crops — one call replaces a step-scroll screenshot chain.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "Page URL to load, e.g. 'https://example.com'."
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Screenshot output path (absolute path recommended); empty = don't save.",
          "default": ""
        },
        "need_inline": {
          "type": "boolean",
          "default": true,
          "description": "Set false to only save the PNG to disk without inlining it (saves a very large image in context). Use false when the capture is source material for offline cropping/composites — you will Read the crops instead."
        }
      },
      "required": [],
      "additionalProperties": false
    }
  },
  "deploy_website": {
    "description": "Deploy or update a static website on a stable local URL. If dist is older than src, the tool runs npm run build first. This tool no longer owns an external browser: after deployment, use ZCode Browser Use on the existing IAB tab to navigate/reload and capture screenshots or recordings.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "local_dir": {
          "type": "string",
          "description": "Absolute path of local directory to deploy. The 'index.html' file must be located directly under this directory as the main website entry point."
        },
        "type": {
          "type": "string",
          "description": "Type of website or application to deploy.",
          "enum": [
            "static"
          ]
        },
        "description": {
          "type": "string",
          "description": "The description of the website or application to deploy."
        },
        "need_screenshot": {
          "type": "boolean",
          "default": false,
          "description": "After redeploy+reload, capture a screenshot from the browser already on the site (no-op on first deploy — browser_visit first)."
        },
        "settle_ms": {
          "type": "integer",
          "minimum": 0,
          "maximum": 15000,
          "description": "Wait before the deploy screenshot — lets load animations finish. Only meaningful with need_screenshot."
        },
        "full_page": {
          "type": "boolean",
          "default": false,
          "description": "With need_screenshot: capture the FULL page (pre-scrolled through so IntersectionObserver/whileInView reveals fire) instead of the viewport. Use on scroll pages whose verify sweep works off the full-page capture. Default output out/deploy_shot_full.png."
        },
        "download_screenshot_path": {
          "type": "string",
          "description": "Deploy screenshot output path. Default out/deploy_shot.png (out/deploy_shot_full.png with full_page)."
        }
      },
      "required": [
        "local_dir",
        "type"
      ],
      "additionalProperties": false
    }
  },
  "get_asset": {
    "description": "Download catalog image(s) (chosen from the asset thumbnail sheet provided in the task input) into the project so you can ship them. Pass refs (array of the ref labels printed on the thumbnails, e.g. [\"a01\",\"a05\"]) — BATCH ALL the assets you have decided to use in one call (one call per page/region beats one call per image); single ref is also accepted. Images are saved under public/assets and the tool returns each local /assets/... path with its true pixel size, alpha transparency, and corner colors (enough to decide dark/light placement — no need to probe the file yourself) AND inlines a low-res preview per image so you can confirm each is the right one — reject a ref whose preview doesn't match (wrong content / too low-res / badly cropped) and pick another or draw a stand-in instead. Reference only the returned local paths in JSX (<img src=\"/assets/...\">), never an external URL. Only the assets on the sheet exist; not every region needs one.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "ref": {
          "type": "string",
          "description": "Single ref label (legacy). Prefer refs for anything more than one image."
        },
        "dest": {
          "type": "string",
          "description": "Optional filename to save as under public/assets (extension auto-filled). Only honored when downloading a single ref."
        },
        "refs": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Ref labels to download in one call, e.g. [\"a01\",\"a05\",\"a09\"]. Preferred over single ref."
        }
      },
      "required": []
    }
  },
  "ingest_video": {
    "description": "Ingest a local screen-recording video to get a WHOLE-VIDEO overview. The tool samples the full duration at a coarse layout-level rate, folds blank/near-duplicate frames away, and inlines timestamped contact-sheet grid(s) — each cell is one frame labelled with its timestamp at the top-left corner; read cells left-to-right, top-to-bottom; a jump between adjacent timestamps means nothing changed in between.\n\n### When to Use\n- The task provides a video file but NO pre-extracted frames / contact sheets: call this ONCE per video as the very first step, before planning or clipping.\n- Unlike clip_video there is no total-duration cap — the whole video is covered in one call, at overview density.\n\n### Important Notes\n- Sampling rate, frame cap and dedup thresholds are fixed by the run configuration — there are no knobs to pass.\n- Idempotent: repeat calls on the same video reuse the previously built sheets (cheap no-op).\n- This is a layout-level overview only. To study any specific moment closely (an animation, an interaction, a transition), call `clip_video` with that time window afterwards.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_path": {
          "type": "string",
          "description": "Path to the source video file (relative to the project directory, or absolute)."
        }
      },
      "required": [
        "video_path"
      ]
    }
  },
  "clip_video": {
    "description": "Look closely at one or more IMPORTANT moments of a local video. For each [start, end] window the tool inlines that moment into the next user message so you can study it — useful for an animation, an interaction, a transition, or any transient UI state you need to reproduce, where uniformly sampled whole-video frames are too sparse.\n\nYou only choose WHICH moments to look at (the segments). HOW they are rendered (frame rate, resolution, per-frame images vs contact-sheet grids, sampling strategy) is fixed by the run configuration — there are no knobs to pass. Depending on the configuration the moment may come back as: a dense sequence of timestamped FRAMES; contact-sheet GRID image(s) whose cells are labelled with their timestamp at the top-left (time order: left-to-right, top-to-bottom) — for localized effects the cells may be CROPPED to the motion region, preceded by a full-page locator image with a red rectangle showing where the crop sits on the page; or a short video clip. Frames may be change-selected rather than evenly spaced, and blank/near-duplicate frames may be folded away — always rely on each frame's/cell's timestamp label, never on an assumed interval; a jump between adjacent timestamps means nothing changed in between.\n\n### Constraints\n- segments: at most 8, each at most 60s, total at most 180s.\n- BATCH the call: pass ALL the windows you currently want to inspect as segments of ONE call — back-to-back clip_video calls with 1-2 segments each return the same information for extra rounds. Split into a second call only when the caps above force it.\n\n### Typical usage\n1. You already attached a source video to the conversation.\n2. You want to see how the motion at e.g. 6-8s and an interaction at 12-14s actually play out.\n3. Call this tool with those segments; the extracted frames/clips are auto-attached to the next turn.\n",
    "inputSchema": {
      "type": "object",
      "properties": {
        "video_path": {
          "type": "string",
          "description": "Path to the source video file (sandbox-virtual path or absolute path)."
        },
        "segments": {
          "type": "array",
          "description": "List of time ranges to extract. Each item must have numeric 'start' and 'end' (in seconds, end > start).",
          "minItems": 1,
          "maxItems": 8,
          "items": {
            "type": "object",
            "properties": {
              "start": {
                "type": "number",
                "minimum": 0,
                "description": "Segment start time in seconds."
              },
              "end": {
                "type": "number",
                "minimum": 0,
                "description": "Segment end time in seconds (must be > start)."
              }
            },
            "required": [
              "start",
              "end"
            ]
          }
        }
      },
      "required": [
        "video_path",
        "segments"
      ]
    }
  },
  "still_crops": {
    "description": "Extract full-resolution still frame(s) from a local video at exact timestamps — optionally cropped to a region and/or scaled up — and get the image(s) BACK INLINE in this same tool result (they are also saved to disk for reuse). This replaces the two-round `Bash still.py` → `Read` pattern with ONE round; prefer it whenever you want to LOOK at specific moments/regions at full resolution.\n\nAlso accepts a static image as source (e.g. a saved screenshot) to crop/zoom it — omit times then.\n\n### Asset mode (save_to)\nPass save_to to write the (cropped) frame as a shipped webapp asset under public/assets/ instead of an inspection still: requires exactly ONE timestamp for video sources, returns a low-res thumb to confirm the region (pass inline:\"none\" to skip), records provenance (source/t/crop) in .v2c/assets_manifest.json, and prints the /assets/... path to reference in JSX. Use for photographic regions per the skill's sourcing rule; batch several regions as parallel calls in one turn.\n\n### Notes\n- crop is in SOURCE pixel coordinates: [x, y, w, h]. scale upscales after cropping (2-3 recommended for logos / small text / thin lines).\n- At most 12 timestamps per call. For studying how a MOTION plays out over a window, use clip_video instead — this tool is for exact-instant, full-resolution inspection.\n- Saved paths are printed in the receipt; reuse them directly as composite_view inputs or verify.jsonl evidence.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "source": {
          "type": "string",
          "description": "Path to the source video (or a static image to crop/zoom). Relative paths resolve against the project directory."
        },
        "times": {
          "type": "array",
          "items": {
            "type": "number"
          },
          "maxItems": 12,
          "description": "Timestamps in seconds (fractional ok). Required when source is a video; ignored for images. Batch every instant you currently want to see into one call."
        },
        "crop": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "minItems": 4,
          "maxItems": 4,
          "description": "Optional [x, y, w, h] crop in source pixel coordinates, applied to every extracted frame."
        },
        "save_to": {
          "type": "string",
          "description": "Asset mode: filename to save the cropped frame as a shipped asset under public/assets/ (basename only; extension defaults to .png). Requires the webapp to be initialized; exactly one timestamp for video sources."
        },
        "inline": {
          "type": "string",
          "enum": ["thumb", "full", "none"],
          "description": "What to inline: full-res frames by default; asset mode defaults to a low-res confirmation thumb — pass \"none\" to skip it."
        },
        "scale": {
          "type": "number",
          "description": "Optional upscale factor applied after cropping (default 1; 2-3 for small elements)."
        },
        "out_dir": {
          "type": "string",
          "description": "Directory to save frames under (default out/stills). Cropped outputs get a _crop suffix and never overwrite same-t full frames."
        },
        "prefix": {
          "type": "string",
          "description": "Filename prefix (default 'still'). Use a distinct prefix per region to keep batches apart."
        }
      },
      "required": [
        "source"
      ]
    }
  },
  "composite_view": {
    "description": "Build the standard Parity evidence artifact — a same-scale SRC|REP composite — and get it BACK INLINE in this same tool result (also saved to disk, default under out/cmp/). It is the default instrument for judging [S#] ids AND for closing [D#] ids with a matched-beat strip.\n\nBoth `source` and `replica` accept an IMAGE or a VIDEO path. Video sides need a timestamp: pass `source_time`/`replica_time` (seconds) for a single-moment composite, or `beats` = [[t_src, t_rep], ...] (1-6 pairs) to build a multi-row matched-beat SRC|REP strip in ONE call — e.g. source = the Phase-2 clip, replica = your ZCode Browser Use recording WebM, beats = the matching moments on each timeline. This is the one-step way to produce the [D] closing evidence; no separate still_crops on each side needed.\n\nThe receipt prints both sides' measured post-crop dimensions and width/height ratios — read the Parity tolerances (±20% etc.) off those numbers directly.\n\nUse crop+scale for a zoomed regional composite when thin lines / small text / 1-2px features can't be judged on the full-frame composite — do NOT write per-pixel measurement scripts instead: a bad crop fails visibly, a bad probe produces plausible-looking wrong numbers.\n\n### Notes\n- crop is in the SOURCE frame's pixel coordinates: [x, y, w, h]; the replica is mapped to the same region proportionally when sizes differ. With beats, crop/replica_crop apply to every row.\n- TALL FULL-PAGE replica: when the replica is a full-page screenshot much taller than the source frame, proportional mapping is WRONG (aspect ratios differ). Pass `replica_crop` = [x, y, w, h] in the REPLICA's own pixel coordinates to slice the matching band directly — one call, no offline PIL slicing. (crop still applies to the source.)\n- ROTATION of a near-symmetric ring/disc: pass `angle_ring: true` to overlay a semi-transparent protractor (0° up, clockwise) on BOTH panels — read the tick each panel's feature aligns to; the difference IS the rotation. Do not chase absolute degrees by re-extracting frames.\n- The saved path is the verify.jsonl `evidence` value for the ids judged from it — name it after the id (e.g. out/cmp/D3_hover.png).\n- One call per composite; for several regions issue several calls in the same message (they are independent).",
    "inputSchema": {
      "type": "object",
      "properties": {
        "source": {
          "type": "string",
          "description": "Path to the source evidence: a video-frame image, or a VIDEO (the input video / a Phase-2 clip) — then give source_time or beats."
        },
        "replica": {
          "type": "string",
          "description": "Path to the replica evidence: a deployed-site screenshot, or a VIDEO (your ZCode Browser Use recording WebM) — then give replica_time or beats."
        },
        "source_time": {
          "type": "number",
          "description": "Timestamp (s) to extract from `source` when it is a video (single-moment mode)."
        },
        "replica_time": {
          "type": "number",
          "description": "Timestamp (s) to extract from `replica` when it is a video (single-moment mode)."
        },
        "beats": {
          "type": "array",
          "items": {
            "type": "array",
            "items": {
              "type": "number"
            },
            "minItems": 2,
            "maxItems": 2
          },
          "minItems": 1,
          "maxItems": 6,
          "description": "Matched beats [[t_src, t_rep], ...] (1-6 pairs, seconds on each side's own timeline). Produces one SRC|REP row per pair, stacked vertically — the standard [D] closing artifact. Requires at least one video side; an image side repeats across rows."
        },
        "out_path": {
          "type": "string",
          "description": "Where to save the composite (default out/cmp/<source>_vs_<replica>.png). Keep it under out/cmp/ and name it after the id it certifies."
        },
        "mode": {
          "type": "string",
          "enum": [
            "h",
            "v"
          ],
          "description": "'h' (default): scale to same height, source left / replica right. 'v': same width, source top / replica bottom."
        },
        "label": {
          "type": "boolean",
          "description": "Stamp SRC/REP corner tags (default true)."
        },
        "crop": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "minItems": 4,
          "maxItems": 4,
          "description": "Optional [x, y, w, h] region in SOURCE pixel coordinates; the replica is cropped to the same (proportionally mapped) region unless replica_crop is given."
        },
        "replica_crop": {
          "type": "array",
          "items": {
            "type": "integer"
          },
          "minItems": 4,
          "maxItems": 4,
          "description": "Optional [x, y, w, h] region in the REPLICA's OWN pixel coordinates, cropped independently of `crop`. Use this to align a source frame against the matching vertical band of a tall full-page screenshot (avoids the broken proportional mapping); the tool warns and asks for it when replica/source aspect ratios differ by >2×."
        },
        "angle_ring": {
          "description": "Optional. `true` (or an object `{step: <deg>}`, default 15°) overlays a semi-transparent angle protractor (0° up, clockwise, 45° labelled) centered on BOTH panels — the instrument for reading rotation of near-rotationally-symmetric rings/discs at a glance instead of re-extracting before/after frames."
        },
        "scale": {
          "type": "number",
          "description": "Optional upscale factor after cropping (2-3 recommended for fine details)."
        }
      },
      "required": [
        "source",
        "replica"
      ]
    }
  }
}
""")
