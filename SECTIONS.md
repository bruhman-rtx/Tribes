# Tribes — UI Section Map

Every distinct piece of the UI is its own numbered section. Reference any one by its name or ID (e.g. *"S1.4 — fix the Active Indicator"*, *"H2 — Spotlight Tile padding"*, *"C5 — Hero Card padding"*).

---

## S — Shell (the app frame)

### S1 — Sidebar
The flush-left navigation rail. Sticky, 232px wide, full viewport height. Collapses to 64px icon-only at ≤720px.
- **CSS:** `.sidebar`
- **File:** `index.html` line ~16, `styles.css` (Sidebar section)

### S2 — Page
The main content column to the right of the Sidebar. Hosts whichever view is active. Has 32px top, 24px horizontal, 96px bottom padding.
- **CSS:** `.page`

### S3 — Toast
Bottom-center transient confirmation chip ("Liked", "Connected with Maya"). Shows for ~1.5s.
- **CSS:** `.toast`

---

## S1.x — Sidebar parts

### S1.1 — Brand Mark
"Tribes" wordmark + a 9px ice-blue square dot. Top-most item in the Sidebar. Clicking it goes Home.
- **CSS:** `.sidebar-brand`, `.brand-dot`

### S1.2 — Nav Button
Each row in the primary nav (Home / Search / Explore / Swipe / Messages / Notifications). Has icon + label + optional kbd hint or unread dot.
- **CSS:** `.sidebar-btn`

### S1.3 — Nav Icon
The Phosphor icon inside each Nav Button.
- **CSS:** `.sidebar-btn i`

### S1.4 — Active Indicator
The 3px ice-blue bar that appears on the left edge of the currently active Nav Button.
- **CSS:** `.sidebar-btn.active::before`

### S1.5 — DM Unread Dot
Tiny ice-blue dot that appears on the Messages Nav Button when threads are unread.
- **CSS:** `.dm-dot` / `.dm-dot.on`

### S1.6 — Search Kbd Hint
The "⌘K" pill on the Search Nav Button.
- **CSS:** `.side-kbd`

### S1.7 — Profile Button
Sidebar footer row: monogram + "Profile". Opens the Me Panel.
- **CSS:** `.sidebar-btn[data-nav="me"]`

### S1.8 — Theme Toggle
Sidebar footer row: sun/moon icon + "Light"/"Dark" label. Persists choice in localStorage.
- **CSS:** `.theme-toggle` (`#theme-toggle`)

### S1.9 — New Post CTA
The filled ice-blue button at the bottom of the Sidebar.
- **CSS:** `.sidebar-btn.create-cta`

### S1.10 — Sidebar Footer
The container holding S1.7 + S1.8 + S1.9, with a hairline divider above it.
- **CSS:** `.sidebar-footer`

---

## H — Home View (Bento Dashboard)

### H0 — Dash Head
The greeting block above the bento. "Welcome back" eyebrow + "Hey, Neil." headline on the left, today's date on the right.
- **CSS:** `.dash-head`

### H1 — Bento Grid
The 4-column grid container holding all 5 dashboard tiles.
- **CSS:** `.bento`

### H2 — Spotlight Tile
Big featured-post hero (3 cols × 2 rows). Ice-blue radial gradient backdrop. Shows: tribe label, big quote text, author + stats.
- **CSS:** `.tile.tile-spotlight`
- **Sub-parts:** Spot Tribe (`.spot-tribe`) · Spot Body (`.spot-body`) · Spot Foot (`.spot-foot`) · Spot Meta (`.spot-meta`) · Spot Stats (`.spot-stats`)

### H3 — Your Tribes Tile
Vertical list of joined tribes (1 col × 2 rows).
- **CSS:** `.tile.tile-tribes`
- **Sub-part:** Mini Tribe Row (H3a)

### H3a — Mini Tribe Row
Each row inside H3: small monogram + tribe name + member count.
- **CSS:** `.mini-tribe`

### H4 — Up Next Tile
Next swipe candidate preview (2 cols × 1 row): monogram + name + bio + inline Connect button.
- **CSS:** `.tile.tile-swipe`

### H4a — Swipe Mini CTA
The inline ice-blue Connect button inside H4.
- **CSS:** `.swipe-mini-cta`

### H5 — Online Tile
Overlapping monogram stack of online people (1 col × 1 row), with a pulsing "Live" dot in the title.
- **CSS:** `.tile.tile-pulse`
- **Sub-parts:** Pulse Stack (`.pulse-stack`) · Pulse Mini (`.pulse-mini`) · Pulse Mini Dot (`.pulse-mini-dot`)

### H5a — Live Dot
The animated ice-blue ping dot in the Online Tile's title row.
- **CSS:** `.live-dot`

### H6 — Messages Tile
Top 3 most recent conversations (2 cols × 1 row).
- **CSS:** `.tile.tile-dms`
- **Sub-part:** Mini DM Row (H6a)

### H6a — Mini DM Row
Each row inside H6: small monogram + name + preview.
- **CSS:** `.mini-dm`

### Hx — Tile Head
Generic tile header (used by H3/H4/H5/H6): title on left, link or arrow on right.
- **CSS:** `.tile-head`, `.tile-title`, `.tile-meta`, `.tile-go`, `.tile-link`, `.tile-label`

---

## P — Panels (sub-views)

### P1 — Search Panel
Search bar + Filter Card + Tabs (Tribes / People).
- **View id:** `#view-search`

### P2 — Explore Panel
Full list of all tribes.
- **View id:** `#view-explore`

### P3 — Category Panel
Tribe detail page. Hero Card on top, then Tab Strip with Members / Posts / About.
- **View id:** `#view-category`

### P4 — Profile Panel
Someone else's profile (with Follow + Message buttons).
- **View id:** `#view-profile`

### P5 — Me Panel
Your own profile (no action buttons).
- **View id:** `#view-me`

### P6 — Swipe Panel
Centered tinder-style card stack with Pass/Connect buttons.
- **View id:** `#view-swipe`

### P7 — DMs Panel
Two-column messaging view. Contains C9 + C10.
- **View id:** `#view-dms`

### P8 — Notifications Panel
Activity list of recent events.
- **View id:** `#view-notifications`

### P9 — Create Panel
Post composer with textarea + tools + Post button.
- **View id:** `#view-create`

### Px — Panel Head
Generic header used by panels (h1 + lede).
- **CSS:** `.panel-head`

### Py — Back Button
"← Back" link at the top of every panel.
- **CSS:** `.back-btn`

---

## C — Reusable Cards

### C1 — Tribe Card
Row in any tribe list (Search Panel, Explore Panel). Monogram + name + desc + member count + Join button.
- **CSS:** `.cat-card`

### C2 — Person Card
Row in any people list. Monogram + name + handle/loc + bio + Follow button.
- **CSS:** `.person-card`

### C3 — Hero Card
Big banner inside the Category Panel. Large monogram + tribe name + description + stats + Join button.
- **CSS:** `.cat-hero`

### C4 — Profile Card
Container around all profile content (avatar block + bio + Tribes section + actions).
- **CSS:** `.profile`

### C5 — Filter Card
The boxed filter group inside the Search Panel (vibe / age / where chips).
- **CSS:** `.filters`

### C6 — Create Card
Box around the post composer in the Create Panel.
- **CSS:** `.create-card`

### C7 — Swipe Card
The full profile card stacked in the Swipe Stage.
- **CSS:** `.swipe-card`

### C8 — Tile (generic)
Base style applied to every bento dashboard card.
- **CSS:** `.tile`

### C9 — DM Sidebar Card
The 320px conversation list panel inside DMs Panel.
- **CSS:** `.dm-sidebar`

### C10 — DM Thread Card
The right pane inside DMs Panel: header + bubbles + Compose Bar.
- **CSS:** `.dm-thread`

---

## I — Inputs / Controls

### I1 — Search Bar
Pill-ish text input with magnifier icon + Clear button.
- **CSS:** `.search-bar`

### I2 — Filter Chip
Round pill toggle inside the Filter Card. Active = filled ice blue.
- **CSS:** `.chip` / `.chip.active`

### I3 — Tab Strip
Underline tabs (Tribes/People, Members/Posts/About).
- **CSS:** `.tabs`, `.tab`, `.tab.active`

### I4 — Primary Button
Filled ice-blue action button (Join, Connect, Post, Send).
- **CSS:** `.btn-primary`

### I5 — Ghost Button
Bordered neutral action (Pass, Share).
- **CSS:** `.btn-ghost`

### I6 — Ghost-SM Button
Tiny text-only action ("Clear", "All").
- **CSS:** `.btn-ghost-sm`

### I7 — Icon Button
Square hover-tint button for icons (paperclip, pencil, etc.).
- **CSS:** `.icon-btn`

### I8 — Compose Input
The text input inside the Compose Bar (DMs).
- **CSS:** `.dm-compose input`

### I9 — Send Button
The square ice-blue send button at the end of the Compose Bar.
- **CSS:** `.dm-send`

### I10 — Create Textarea
The big textarea inside the Create Card.
- **CSS:** `.create-row textarea`

---

## D — Identity Bits

### D1 — Monogram
Squircle tile with a single uppercase letter. 5 sizes (xs/sm/md/lg/xl) and 5 tones (sky / lavender / mint / peach / blush).
- **CSS:** `.monogram`, `.monogram-{xs|sm|md|lg|xl}`, `[data-tone="{1-5}"]`

### D2 — Tag Mono
Tiny inline monogram next to a tribe name in tag/pill form.
- **CSS:** `.tag-mono`

### D3 — Eyebrow
Tiny ice-blue label above headlines ("Welcome back", "Tribe", "Discover People").
- **CSS:** `.eyebrow`

### D4 — Tag
Pill-shaped tribe tag (used inside Profile Card and Swipe Card).
- **CSS:** `.tag`

### D5 — Profile Tribe Pill
Bordered squircle pill listing one of your tribes/connections.
- **CSS:** `.profile-tribe`

---

## M — Messaging Specifics

### M1 — DM List Item
Each conversation row in the DM Sidebar. Has active state (left bar) and unread state (blue dot).
- **CSS:** `.dm-item`

### M2 — DM Head
Top bar of the DM Thread (avatar + name + handle).
- **CSS:** `.dm-head`

### M3 — DM Messages Area
Scrollable bubble area between DM Head and Compose Bar.
- **CSS:** `.dm-messages`

### M4 — Day Separator
"Today" centered tiny label between bubble groups.
- **CSS:** `.dm-day-sep`

### M5 — Bubble (Them)
Left-aligned message bubble with cream fill.
- **CSS:** `.bubble.them`

### M6 — Bubble (Me)
Right-aligned ice-blue filled bubble for your messages.
- **CSS:** `.bubble.me`

### M7 — Compose Bar
Bottom row of the DM Thread: paperclip + I8 + I9.
- **CSS:** `.dm-compose`

### M8 — DM Sidebar Head
Top of C9: "MESSAGES" label + new-message icon button.
- **CSS:** `.dm-sidebar-head`

### M9 — DM Search
The cream search input inside C9.
- **CSS:** `.dm-search`

---

## N — Misc

### N1 — Notification Row
One row in the Notifications Panel.
- **CSS:** `.notif`

### N2 — Empty State
Centered muted text when a list has no items ("No tribes match.").
- **CSS:** `.empty`

### N3 — Swipe Stage
The 380×520 stack container that holds Swipe Cards.
- **CSS:** `.swipe-stage`

### N4 — Swipe Actions
Row of Pass + Connect buttons under the Swipe Stage.
- **CSS:** `.swipe-actions`

### N5 — Swipe Hint
Small "1 of 14" / "← pass · connect →" under the Swipe Actions.
- **CSS:** `.swipe-hint`

### N6 — Cat Hero Stats
Members / online / vibe meta row inside C3.
- **CSS:** `.cat-hero-stats`

### N7 — Cat Hero Actions
Join + Share buttons under C3.
- **CSS:** `.cat-hero-actions`

---

## T — Tokens (color)

### T1 — Page background (cream)
`--bg`

### T2 — Surface (white)
`--surface`

### T3 — Soft fill / wash
`--fill-subtle`

### T4 — Hairline border
`--line` / `--line-strong`

### T5 — Ink (text)
`--ink` / `--ink-muted` / `--ink-soft`

### T6 — Ice blue scale
`--ice-50` / `-100` / `-200` / `-400` / `-500` / `-600`

### T7 — Monogram tones
`--tone-{1-5}-bg` / `-fg`  (sky / lavender / mint / peach / blush)

### T8 — Live / online accent
`--accent-online` (= ice blue)

### T9 — Coral accent
`--accent-coral` (= ice blue, kept for legacy)

---

## How to call out a fix

> *"S1.4 — Active Indicator should be 4px not 3px"*
> *"H2 — Spotlight Tile padding feels excessive on mobile"*
> *"C1 — Tribe Card hover ring is too bright"*
> *"M6 — Bubble (Me) looks washed out, increase contrast"*
> *"I4 — Primary Button text is hard to read in dark mode"*
> *"T6 — bump --ice-500 a notch deeper"*

Pointing at the section ID is enough.
