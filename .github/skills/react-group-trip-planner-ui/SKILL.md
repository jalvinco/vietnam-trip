---
name: react-group-trip-planner-ui
description: Design and build a modern, responsive React web application for a group travel planner (Vietnam trip) featuring Airbnb accommodation galleries, flight cards, interactive day-by-day itineraries, and real-time group expense splitting.
---

# Skill: Responsive React Group Travel & Expense App (2026 UI/UX Standards)

## 1. App Architecture & Responsive Navigation
- **Mobile-First Thumb-Zone Navigation:**
  - On mobile (`< 768px`), render a fixed bottom navigation bar (`height: 64px`, `padding-bottom: env(safe-area-inset-bottom)`) with 4 clear tabs: **Overview/Itinerary**, **Stays (Airbnb)**, **Flights**, and **Expenses**.
  - On desktop (`>= 768px`), transition into a collapsible left navigation rail or clean sticky top pill-bar with a max-width centered workspace (`max-width: 1200px`).
- **Dynamic Viewport Handling:** Always use `min-h-dvh` instead of `min-h-screen` (`100vh`) so mobile browser address bars never clip bottom nav items or floating "Add Expense" buttons.
- **Persistent Trip Header:** Compact glassmorphic sticky header (`backdrop-filter: blur(12px)`) showing Trip Title (e.g., *Vietnam 2026*), date range, quick member avatar stack, and a currency toggle (**VND ₫ ↔ PHP ₱ / USD $**).

---

## 2. Visual System & Aesthetics (Modern Travel Editorial)
- **Theme & Palette:** Warm, airy editorial light mode as default (`#FAFAF9` warm alabaster canvas, `#FFFFFF` elevated cards, `#0F172A` slate ink text) paired with vibrant Vietnam-inspired accents (e.g., emerald/jade `#059669` for settled/confirmed states, terracotta/amber `#D97706` for pending balances). Support semantic CSS variables for dark mode readiness.
- **Bento Grid & Card Hierarchy:**
  - Use `16px–20px` border radii, `1px solid rgba(15, 23, 42, 0.08)` hairline borders, and subtle elevation instead of heavy drop shadows.
  - Scale typography and spacing smoothly with `clamp()` so headers and cards never overflow narrow screens (`360px` wide).

---

## 3. Feature-Specific Responsive Patterns

### A. Accommodations (Airbnb Stays with Photo Galleries)
- **Responsive Photo Bento / Carousel:**
  - **Desktop:** Airbnb-style 5-photo asymmetric Bento grid (1 large hero image on the left + 2×2 thumbnail grid on the right) with a "View all photos" modal trigger.
  - **Mobile:** Edge-to-edge swipeable horizontal image carousel (`scroll-snap-type: x mandatory`) with a floating photo counter pill (`1 / 8`).
- **Stay Card Metadata:** Show city/neighborhood tag (e.g., *Hanoi Old Quarter*, *Hoi An*, *Da Nang*), check-in/check-out dates, Wi-Fi/amenity badges, direct Airbnb link button, tap-to-copy address, and cost-per-night / total stay split badge.
- **Image Optimization:** Enforce explicit `aspect-ratio: 16 / 10` or `4 / 3` on image containers with skeleton shimmer placeholders to guarantee zero Cumulative Layout Shift (CLS).

### B. Flight Details (Boarding-Pass Cards)
- **Structured Route Visual:** Render each flight leg (outbound, domestic hops like HAN → DAD, return) as a clean ticket/boarding-pass card featuring:
  - Airline badge & flight number, departure/arrival IATA codes (`MNL` → `HAN`), local times, duration, and terminal/gate info.
  - Interactive status/reference pills (Booking Reference / PNR with one-tap copy, baggage allowance tags, and per-person passenger assignment).
- **Container-Adaptive Layout:** Use CSS `@container` queries so flight cards stack vertically in narrow columns and expand horizontally with a dashed route-line graphic when wider.

### C. Interactive Day-by-Day Itinerary
- **Sticky Day Selector:** Horizontal scrollable day pills (`Day 1 · Hanoi`, `Day 2 · Ha Long`, etc.) pinned below the main header on mobile for rapid jumping.
- **Timeline Cards:** Vertical timeline with time blocks, category icons (Food, Sightseeing, Transit, Chill), Google Maps location link, notes, and expandable checklist/voting toggles so friends can mark activities as *Confirmed*, *Optional*, or *Done*.

### D. Interactive Group Expense & Payment Splitter
- **Top Summary Bento (At-a-Glance Balances):**
  - Display **Total Trip Spend**, **Your Share / Per-Person Average**, and a **"Who Owes Whom" Settlement Card** using a simplified debt-minimization algorithm (fewest transfers needed to settle up).
- **Interactive Controls & Micro-Interactions:**
  - Floating Action Button (`+ Add Expense`) on mobile (`>= 48px × 48px` touch target) opening a smooth bottom-sheet drawer on mobile or centered modal on desktop.
  - **Expense Form:** Amount input (with quick VND ↔ local currency conversion), Description, Category, **"Paid By"** single-select avatar pills, and **"Split Between"** multi-select friend checkboxes (supporting *Equal Split*, *Exact Amounts*, or *Percentages*).
  - **Interactive Settlement Toggles:** Allow clicking a "Mark as Paid" pill on individual debts with immediate optimistic UI feedback and badge updates.
- **Responsive Ledger Table:**
  - **Desktop:** Clean multi-column table showing Date, Item, Category, Paid By, Split With, and Amount.
  - **Mobile:** Compact tappable list rows that expand inline or open a detail sheet to edit/delete/re-assign payers without horizontal table scrolling.

---

## 4. Technical & Code Quality Guardrails
- **Component Modularity:** Break UI into clean, typed React components (`StayGalleryCard`, `FlightTicketCard`, `ItineraryTimeline`, `ExpenseSummaryBento`, `AddExpenseSheet`).
- **Touch & Accessibility:** Minimum `44px × 44px` hit targets for all checkboxes, avatar toggles, and tabs; visible `:focus-visible` states; `prefers-reduced-motion` respected for drawer/carousel transitions.
- **State Persistence:** Structure state cleanly (e.g., React Context / Zustand + `localStorage` fallback or backend-ready hooks) so adding an expense or toggling a payer updates all member balances immediately.
