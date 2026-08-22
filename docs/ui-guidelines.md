# UI Guidelines

## Visual Direction

谷布谷 should feel like a premium collectible encyclopedia.

The visual tone should be:

- collectible
- immersive
- polished
- slightly anime-inspired
- structured rather than noisy

The product should not look like:

- a generic admin dashboard
- a plain database browser
- a marketplace centered on payment

## Experience Goals

Users should feel that they are browsing a curated collectible archive, not raw rows of data.

The interface should emphasize:

- visual hierarchy
- collectible object presence
- strong scanability
- rich but controlled atmosphere
- clear routes to action

## Platform Priority

Design priority:

- PC-first

Responsive expectation:

- mobile web must remain usable
- layouts should adapt rather than simply shrink dense desktop compositions
- the primary information hierarchy must survive across breakpoints

## Search First

Search is a leading interaction, not a secondary tool.

Requirements:

- search entry should be visible early on key pages
- filters should feel structured and intentional
- search and filter controls should help users narrow toward SKU quickly

Search UI should feel:

- fast to scan
- stable
- information-dense without clutter

## Public Goods Library

`/search` is the canonical public goods library, not only a keyword-results page.
It must expose every published SKU to signed-out and signed-in visitors, with
search and filters layered on top of the complete catalogue.

Public-library cards, home catalogue previews, IP and series SKU walls,
character sheets, and user cabinet thumbnails share one lighting language:

| State               | Thumbnail                                              | Visible status  | Primary action |
| ------------------- | ------------------------------------------------------ | --------------- | -------------- |
| Not in cabinet      | Grayscale                                              | 未点亮          | 收进谷柜       |
| In cabinet, not lit | Grayscale with a restrained violet cabinet border      | 已入柜 · 待点亮 | 扫描点亮       |
| Lit                 | Full color with the gold mount and red collection seal | 已点亮          | Open details   |

Rules:

- saving a SKU to the cabinet never restores thumbnail color
- only a successful camera recognition and user confirmation can light a SKU
- grayscale thumbnails must remain grayscale on hover; hover may lift the card but must not preview its color
- SKU detail galleries always show the complete full-color, high-resolution catalogue image, regardless of cabinet or lighting state
- state must be communicated with visible text as well as color, border, or the decorative seal
- server-rendered pages must emit the correct dormant or lit state to avoid a flash of unauthorized color
- catalogue grids use two columns at 320/360 widths when space permits, three at intermediate widths, and four on PC catalogue walls

## Encyclopedia Feel

The encyclopedia should communicate quality and discoverability.

Use:

- strong section hierarchy
- structured metadata blocks
- image-led layouts
- intentional empty space
- collector-oriented labeling

Avoid:

- spreadsheet-like first impression
- overly compressed metadata walls
- default table-heavy presentation as the main experience

## Card Direction

Cards should feel like physical collectible pieces.

Desired qualities:

- layered surfaces
- careful border treatment
- subtle lighting or glow accents
- premium spacing
- clear focal point for image and title

Card behavior:

- hover states should feel responsive and refined
- interaction feedback should reinforce collectible value
- density can increase on desktop, but cards should stay readable

Avoid:

- flat utility cards with no hierarchy
- noisy gradients that overpower the content
- toy-like saturation without structure

## Detail Page Direction

SKU detail pages are one of the most important V1 surfaces.

Page priorities:

- primary item imagery first
- structured attributes second
- user actions close to the main content
- community and exchange sections below or alongside the core item block

A good SKU detail page should let the user understand quickly:

- what the item is
- which IP / character / series it belongs to
- whether it is in their cabinet, lit, wanted, or available to exchange
- what other users think about it

## Visual Language

### Color

Use a palette that feels premium and collectible.

Guidance:

- favor depth over bright flatness
- use accent colors with restraint
- keep backgrounds supportive of imagery and card surfaces
- let important actions stand out clearly

### Typography

Typography should balance atmosphere and structure.

Guidance:

- use expressive headings carefully
- keep metadata and labels highly legible
- support dense information on desktop without turning pages into text walls

### Spacing

Spacing should communicate quality.

Guidance:

- give images and cards room to breathe
- use consistent internal spacing for metadata groups
- avoid cramped control clusters

### Motion

Motion should be purposeful and light.

Good uses:

- hover lift or lighting emphasis on cards
- subtle reveal of sections
- clear feedback on collection actions

Avoid:

- constant motion
- decorative animation that slows scanning

## Collection Interactions

Collection actions must feel obvious and satisfying.

Key actions:

- save to or remove from the cabinet
- scan a physical item to light it
- mark wanted
- mark exchange

Interaction guidance:

- place state actions close to the SKU hero area
- make status changes visually clear
- keep cabinet saving and lighting visually and behaviorally distinct
- never expose a normal button that directly marks an unverified SKU as lit
- use a short, one-time seal response after successful lighting; do not animate ordinary cabinet saves as if they were verified

## Character and Series Pages

These pages should combine immersion and utility.

They should:

- anchor users in the world of the IP
- still expose efficient paths to related SKU browsing
- balance atmosphere with dense navigation support

Do not let decorative presentation hide core browse paths.

## Camera Entry UI

The camera flow should feel practical, not magical.

It should communicate:

- framing guidance
- capture clarity
- upload progress
- candidate results
- user confirmation
- whether the current result is eligible to light the SKU

Uploading an image may help identify a SKU, but it does not light a collection.
The lighting action belongs to the camera scan flow and must complete before the
UI presents a full-color thumbnail or “已点亮” state.

The UI should not imply:

- guaranteed exact recognition
- fully automatic identification without user review

## Admin Surfaces

Admin pages can be more utilitarian than consumer-facing pages, but they should still respect the product language.

Guidance:

- keep forms structured and readable
- keep dense data manageable
- prioritize data quality and moderation efficiency
- do not turn the entire product aesthetic into back-office UI

## SKU Share Cards

- Put `分享谷卡` in the SKU title/chip row so it stays visible in the first mobile viewport; do not bury it inside collection or exchange actions.
- Export one fixed 1080 × 1440 light-theme PNG. Use `object-contain` for merchandise art and keep IP/series, item name, at most three compact attributes, SKU code and brand signature readable.
- Do not include a viewer name, cabinet state or a fake `已点亮` seal. Share cards are public SKU artifacts, not proof of ownership.
- Open a native dialog only on demand. Mobile presents it as a bottom sheet; desktop uses a centered two-column preview. The generated `File` is reused for preview and actions.
- Action order is `系统分享 / 下载高清 PNG / 复制 SKU 链接`. Never label a normal Web button as direct WeChat or Douyin publishing.
- If file sharing is unsupported, explain the link/download fallback. Cancellation is neutral feedback, not an error.

## Quality Bar

Every new user-facing screen should be checked against these questions:

- does it feel like a collectible encyclopedia instead of a generic dashboard
- is search or discovery clearly supported
- is SKU treated as the core entity
- is the visual hierarchy strong on desktop
- does the layout still work responsively
- do interactions support a satisfying collecting experience

## Current Implementation Rules

- Brand metaphor: airy anime collectible scrapbook. Warm off-white protects image fidelity; sakura pink, violet and sky blue create atmosphere without becoming neon.
- `--shu` is the primary action color; violet supports discovery, owned uses `--kin`, wanted uses `--want`, and exchange uses `--exchange`.
- Use the system sans stack for headings and body copy. Hierarchy comes from weight, scale and spacing, not serif display type or wide Chinese tracking.
- Consumer cards use 14–24px radii, one subtle border and one soft shadow. Avoid deeply nested panels, glass effects and decorative dashboard statistics.
- Product and user images remain the strongest visual elements. Gradients belong to page atmosphere and primary actions, not every component.
- `.section-kicker` is reserved for section identity. `.lbl` and `.num` stay quiet metadata; collection states keep their semantic colors.
- Chinese labels lead the interface. Original titles may remain when they are the official catalogue name, but raw slugs and enum values must be formatted before display.
- Global consumer navigation is consistently ordered and labelled as `谷库 / 点亮 / 换谷 / 我的`. `谷库` links to `/search`, and `点亮` links to `/recognition`; administration remains contextual and role-gated.
- Search results appear in the first viewport. Desktop filters use a sticky side rail; mobile filters collapse.
- SKU pages show item, specification and collection state before community content. Rating and posting forms remain collapsed until requested.
- Frequent UI feedback uses 120–220ms CSS transitions on explicit properties. Do not use `transition: all`, JavaScript animation libraries, or motion on keyboard navigation.
- Pressable controls use a subtle `scale(.97)` active state and retain visible keyboard focus.
- Hover transforms are limited to fine pointers; `prefers-reduced-motion` removes movement.
