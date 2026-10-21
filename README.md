# Computer Use Agent v2

A production-grade browser automation agent — **LangGraph `createReactAgent`** + **Playwright stealth** — that can navigate, click, type, and complete multi-step tasks on any website on your behalf.

## What's new in v2 (26 improvements)

| # | Fix | Where |
|---|-----|--------|
| 1 | iframe support — switch into payment/login frames | `switch_frame` tool |
| 2 | New tab / popup tracking | `switch_tab` tool, browserManager |
| 3 | Dialog auto-handler (alert/confirm/prompt) | browserManager + `handle_dialog` |
| 4 | Replaced deprecated `page.accessibility.snapshot()` | accessibility.tool.ts |
| 5 | Scroll-into-view before every click | click.tool.ts |
| 6 | Overlay/modal auto-dismisser | `dismiss_overlays` tool |
| 7 | Hover tool (mega-menus, tooltips, swatches) | `hover` tool |
| 8 | Custom dropdown support via keyboard nav | click + press_key pattern |
| 9 | JavaScript eval escape hatch | `run_javascript` tool |
| 10 | CAPTCHA detection + human-in-the-loop pause | `detect_captcha` tool |
| 11 | Autocomplete dismissal (Escape / ArrowDown+Enter) | type_text `dismissAutocomplete` param |
| 12 | Retry with exponential backoff on all tools | `withRetry()` utility |
| 13 | Max-steps guard (`recursionLimit`) | agent config |
| 14 | SPA navigation detection (URL stabilize + waitForURL) | navigate + wait_for_element |
| 15 | Live URL logged on every agent step | agent/index.ts |
| 16 | Atomic `fill_form` tool (whole form in one call) | `fill_form` tool |
| 17 | Canvas fingerprint noise patch | browserManager initScript |
| 18 | WebGL + AudioContext fingerprint spoofing | browserManager initScript |
| 19 | Screen dimensions match viewport (not 0×0) | browserManager initScript |
| 20 | Real mouse position tracking (Bezier starts from last pos) | humanBehavior + browserManager |
| 21 | Random idle micro-movements between actions | browserManager interval |
| 22 | Task timeout via AbortController | agent/index.ts |
| 23 | Structured `TaskResult` output (`success`, `data`, `errors`) | agent/index.ts |
| 24 | Human-in-the-loop confirm before sensitive actions | `CONFIRM_KEYWORDS` env var |
| 25 | Token usage + cost tracking per run | tokenTracker.ts |
| 26 | `urlContains` in wait_for_element for SPA routes | pageInfo.tool.ts |

---

## Architecture

```
User Task
   │
   ▼
createReactAgent (LangGraph)
   ├── LLM: Claude claude-opus-4-5
   ├── Memory: MemorySaver (multi-turn threads)
   ├── recursionLimit: 40 steps max
   ├── AbortController: 5min timeout
   └── Tools (25):
        │
        ├── DOM (free, always first)
        │     ├── get_accessibility_tree  ← live DOM tree (not deprecated a11y API)
        │     ├── get_page_info
        │     ├── get_page_text
        │     └── get_links
        │
        ├── Navigation
        │     ├── navigate               ← SPA URL stabilization
        │     ├── dismiss_overlays       ← auto-dismiss cookie/modal banners
        │     └── wait_for_element       ← urlContains for SPA routes
        │
        ├── Interactions
        │     ├── click                  ← 5-strategy + scroll-into-view + retry
        │     ├── hover                  ← mega-menus, tooltips
        │     ├── type_text              ← autocomplete handling
        │     ├── fill_form              ← atomic multi-field fill
        │     ├── press_key
        │     ├── scroll
        │     └── select_option
        │
        ├── Context Switching
        │     ├── switch_frame           ← iframes (payment, login)
        │     ├── switch_to_main_frame
        │     └── switch_tab             ← new tabs/popups
        │
        ├── Escape Hatches
        │     ├── run_javascript         ← data-attrs, script state
        │     ├── handle_dialog          ← alert/confirm/prompt
        │     └── detect_captcha         ← HITL pause
        │
        └── Vision (fallback only)
              ├── take_screenshot
              ├── analyze_screenshot
              └── find_element_with_vision

Browser: playwright-extra + puppeteer-extra-plugin-stealth
  ├── WebDriver flag removed
  ├── Canvas noise patch (per-session, 1-bit noise)
  ├── WebGL vendor/renderer spoofed (Intel Iris)
  ├── AudioContext noise patch
  ├── Screen dimensions match viewport
  ├── Random Chrome 131 UA + viewport
  ├── Bezier mouse movement from real tracked position
  ├── Per-character typing with random delays
  ├── Random idle micro-movements (8–20s interval)
  ├── Session persistence (cookies between runs)
  └── Request header cleanup
```

---

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env    # add your ANTHROPIC_API_KEY
```

## Run

```bash
# Interactive REPL
npm run dev

# Single task
npm run dev:task "Go to amazon.com, search for USB-C cables, add the cheapest to cart"

# Named session (login state persists between runs)
SESSION_NAME=amazon npm run dev
```

## Interactive commands

```
Task > Go to amazon.com             ← run a task
Task > now add it to cart           ← continue same thread (memory preserved)
Task > new                          ← start a fresh conversation thread
Task > screenshot                   ← manual screenshot
Task > quit                         ← save session & close
```

## Structured output

Every `runTask()` returns:

```typescript
{
  success: boolean,
  summary: string,           // agent's final explanation
  finalUrl: string,          // current page URL
  data: Record<string,any>,  // extracted structured data (prices, order IDs, etc.)
  steps: number,             // how many agent steps were taken
  tokenUsage: string,        // "In: 12,400 | Out: 3,200 | Vision calls: 2 | Est. cost: $0.0023"
  errors: string[]           // any errors encountered
}
```

## Human-in-the-loop

Set `CONFIRM_KEYWORDS` in `.env` to pause before sensitive actions:

```env
CONFIRM_KEYWORDS=checkout,place-order,buy,submit-payment,confirm-order
```

The agent will print `⚠️ SENSITIVE ACTION: ...` and wait for `y/n` before proceeding.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | required | Your Anthropic key |
| `AGENT_MODEL` | `claude-opus-4-5` | Agent reasoning model |
| `VISION_MODEL` | `claude-opus-4-5` | Vision analysis model |
| `HEADLESS` | `false` | `true` = no visible window |
| `SLOW_MO` | `50` | ms delay between actions |
| `BROWSER_TIMEOUT` | `30000` | Page timeout (ms) |
| `SCREENSHOTS_DIR` | `./screenshots` | Screenshot storage |
| `SESSION_DIR` | `./sessions` | Cookie/session storage |
| `SESSION_NAME` | `default` | Session name (one per account) |
| `CONFIRM_KEYWORDS` | `checkout,...` | Comma-separated HITL triggers |

## Project structure

```
src/
├── index.ts                    # CLI entry + structured result display
├── agent/
│   ├── index.ts                # createReactAgent + runTask() + TaskResult
│   └── prompts.ts              # System prompt with tool priority rules
├── browser/
│   └── browserManager.ts       # Stealth singleton + session + dialog + tab + iframe
├── tools/
│   ├── index.ts                # All 25 tools exported
│   ├── accessibility.tool.ts   # Live DOM tree (replaces deprecated API)
│   ├── navigate.tool.ts        # SPA-aware navigation
│   ├── click.tool.ts           # 5-strategy + scroll-into-view + retry
│   ├── hover.tool.ts           # NEW: hover for menus/tooltips
│   ├── type.tool.ts            # Autocomplete handling
│   ├── fillForm.tool.ts        # NEW: atomic form fill
│   ├── keyboard.tool.ts
│   ├── scroll.tool.ts
│   ├── select.tool.ts
│   ├── pageInfo.tool.ts        # wait_for_element + urlContains
│   ├── screenshot.tool.ts
│   ├── vision.tool.ts          # Token-tracked vision calls
│   ├── iframe.tool.ts          # NEW: switch_frame, switch_tab
│   ├── overlay.tool.ts         # NEW: dismiss_overlays
│   ├── javascript.tool.ts      # NEW: run_javascript
│   ├── dialog.tool.ts          # NEW: handle_dialog
│   └── captcha.tool.ts         # NEW: detect_captcha + HITL
└── utils/
    ├── humanBehavior.ts        # Bezier mouse (real pos tracking), human typing
    ├── retry.ts                # NEW: exponential backoff wrapper
    └── tokenTracker.ts         # NEW: cost/token tracking
```
