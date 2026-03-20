# Product Requirements Document

## Product Summary

Gooods Dex is a web-first guzi encyclopedia platform for anime, game, and IP merchandise.

The product exists to help collectors:

- browse structured merchandise data
- find items quickly through search and filters
- track owned, wanted, and exchange states
- view rich SKU detail pages
- participate through comments, ratings, and photos
- enter items through a camera-style recognition workflow

This is a PC-first product with responsive support for mobile web. Future native clients should remain thin clients over the same backend capabilities.

## Problem Statement

Collectors often rely on fragmented sources:

- social posts
- shop listings
- spreadsheets
- screenshots
- fan-maintained lists with inconsistent structure

These sources are weak at the combination of:

- consistent SKU-level structure
- fast search
- collection tracking
- visual browsing
- lightweight community context

Gooods Dex should solve this by making structured merchandise discovery and collection workflows feel premium and easy to use.

## Product Goals

V1 goals:

- create a clear encyclopedia for IP, character, series, and SKU
- make search immediately useful and visible
- let users mark SKU-level states: `owned`, `wanted`, `exchange`
- support collection lighting and progress visibility
- present SKU detail pages with strong images and structured data
- support lightweight community participation through comments, ratings, and photos
- support lightweight exchange intent
- provide a camera-style entry point that returns candidate matches for user confirmation
- provide basic admin capability to keep encyclopedia data accurate

## Non-Goals

V1 is not trying to become:

- a payment marketplace
- an escrow platform
- a deposit or settlement system
- an arbitration product
- a heavy social feed
- a complex event voting platform
- a self-trained computer vision platform

The recognition feature is intentionally bounded:

- it is a recognition entry plus candidate matching flow
- it is not a heavy automated CV system

## Target Users

Primary users:

- anime and game merchandise collectors
- users who want a reliable SKU encyclopedia
- users who want to track what they own or want

Secondary users:

- users discovering goods through character or series browsing
- users sharing collection photos and lightweight opinions
- users signaling exchange intent without requiring transaction infrastructure

## Core Product Pillars

### 1. Encyclopedia Quality

The platform must provide structured and trustworthy item data.

Why it matters:

- poor data quality breaks search
- poor data quality breaks collection trust
- poor data quality makes community content less useful

### 2. Search and Filtering

Search should be visible early and remain central to the experience.

Why it matters:

- users often arrive with incomplete information
- collectors think in terms of IP, character, series, item type, and partial names

### 3. Collection State and Lighting

Users must be able to mark SKU-level states clearly.

Required V1 states:

- `owned`
- `wanted`
- `exchange`

The product should also expose completion and lighting patterns that make collecting feel satisfying.

### 4. Rich SKU Detail

SKU pages should combine:

- strong image presentation
- structured attributes
- collection actions
- community signals
- exchange entry points

### 5. Lightweight Community

V1 community is intentionally light.

Included:

- comments
- ratings
- user-uploaded photos

Excluded:

- heavy feed mechanics
- deep social graph features

### 6. Camera Entry

The camera flow should reduce friction when users do not know the exact item name.

V1 flow:

- open camera
- show framing overlay
- capture image
- upload image
- receive ranked candidates
- let the user confirm the final SKU

## Functional Scope

### Encyclopedia

Must support:

- IP pages
- character pages
- series pages
- SKU pages
- structured relationships between these levels

### Search and Filters

Must support:

- prominent search entry
- structured filtering based on encyclopedia data
- filtering that helps narrow to SKU

### Collection States

Must support:

- marking `owned`
- marking `wanted`
- marking `exchange`
- showing progress or collection lighting in relevant contexts

### SKU Detail Page

Must support:

- primary image focus
- structured item metadata
- collection actions
- comments
- ratings
- user photos
- lightweight exchange intent

### Exchange

Must support:

- low-friction exchange intent or listing
- association to SKU
- simple status or availability note

Must not support:

- transaction completion
- funds handling

### Admin

Must support:

- basic content management for encyclopedia entities
- data quality maintenance
- groundwork for moderation of user-contributed content

### Recognition Entry

Must support:

- browser camera access
- framing UI
- capture flow
- upload flow
- candidate matching integration point
- confirmation UI

## UX Priorities

- search should be visible immediately
- the encyclopedia should feel richer than a plain database
- detail pages should emphasize images and structured attributes
- collection actions should be obvious and satisfying
- PC layouts should be the primary design target
- mobile web should adapt without collapsing the information hierarchy

## Success Criteria for V1

V1 is successful if it enables:

- trustworthy SKU-level encyclopedia browsing
- efficient search and filter usage
- clear and satisfying collection state interaction
- meaningful SKU detail pages
- lightweight but useful community contribution
- a practical camera-assisted entry flow without overpromising recognition quality

## Delivery Constraints

Implementation constraints:

- use Next.js App Router and TypeScript
- keep code strongly typed
- prefer Server Components by default
- use Client Components only where interaction requires it
- validate inputs with Zod
- keep the codebase maintainable for long-term solo iteration
- keep schema work migration-driven

Scope constraints:

- implement one task at a time
- do not expand beyond confirmed V1 boundaries without explicit direction
