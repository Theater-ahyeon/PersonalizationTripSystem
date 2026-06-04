---
name: Horizon Bound
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#414755'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#904d00'
  on-secondary: '#ffffff'
  secondary-container: '#fd8b00'
  on-secondary-container: '#603100'
  tertiary: '#006b27'
  on-tertiary: '#ffffff'
  tertiary-container: '#008733'
  on-tertiary-container: '#f7fff2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#72fe88'
  tertiary-fixed-dim: '#53e16f'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531c'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

The design system is engineered to evoke the exhilaration of departure and the serenity of arrival. Targeting modern explorers who seek both spontaneity and structure, the brand personality is **vibrant, inspiring, and effortless**. 

The visual style is **Modern/Glassmorphic**, utilizing translucent layers to suggest the clarity of a high-altitude flight or the shimmer of tropical waters. It prioritizes high-quality imagery as the primary narrative driver, framing travel as an immersive experience rather than a logistics problem. The emotional response should be one of "boundless possibility"—where the UI feels as light as a breeze but as reliable as a compass.

## Colors

The palette is rooted in the natural transitions of a traveler's day.
- **Primary (Sky & Sea):** A vibrant, high-saturation blue used for primary actions, navigation states, and core branding elements.
- **Secondary (Sunset):** An energetic orange used for highlights, calls-to-action that require urgency (like "Book Now"), and exploration-themed accents.
- **Tertiary (Nature):** A soft, organic green dedicated to environmental markers, park locations, and "open" status indicators.
- **Neutral (Slate):** A deep, legible slate for high-contrast typography and structural borders.
- **Backgrounds:** Extensive use of clean whites and light grays (`#F8FAFC`) to provide "air" between content-heavy cards.

## Typography

This design system utilizes **Plus Jakarta Sans** for headings to provide a soft, welcoming, and contemporary character that feels approachable yet high-end. **Inter** is used for all functional body text and interface labels to ensure maximum readability during quick scans of itineraries or maps.

Headlines should use tight letter spacing and heavy weights to create a sense of confidence. Body text maintains a generous line height to prevent visual fatigue during long-form reading in travel diaries.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy with a maximum container width for desktop readability. 
- **Desktop:** 12-column grid with 24px gutters and 64px side margins.
- **Tablet:** 8-column grid with 20px gutters and 32px side margins.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.

Spacing is based on an **8px linear scale** to maintain rhythm. Large hero sections and masonry galleries should utilize the `xl` (64px) vertical spacing to emphasize a premium, uncrowded feel. Content should "breathe," using whitespace as a tool to separate different destinations or diary entries.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Ambient Shadows**. 
- **Level 0 (Surface):** The base light gray background.
- **Level 1 (Cards):** White surfaces with a soft, 15% opacity blue-tinted shadow (Blur: 20px, Y: 10px).
- **Level 2 (Overlays/Modals):** A "Frosted Glass" effect using `backdrop-filter: blur(12px)` and a semi-transparent white fill (`rgba(255, 255, 255, 0.7)`). These should have a subtle 1px inner white border to simulate light hitting the edge of glass.
- **Level 3 (Navigation):** Fixed navigation bars use the same frosted glass effect to keep the travel imagery visible as the user scrolls.

## Shapes

The design system employs a **Rounded** shape language to mirror the friendly and organic nature of travel. 
- Standard components (Buttons, Inputs) use a `0.5rem` (8px) radius.
- Feature cards and destination images use `1rem` (16px) to appear more "collectible" and soft.
- Interactive elements like floating action buttons or category chips use the "Pill" (full radius) style to distinguish them from content containers.

## Components

### Hero Sections
Immersive, full-width or large-container imagery with a centered or bottom-left aligned `display-lg` headline. Use a subtle dark-to-transparent gradient overlay at the base to ensure white typography remains legible over diverse photos.

### Destination Cards
Cards should feature a 3:4 or 1:1 aspect ratio image at the top. Ratings should be displayed as a secondary-colored (Orange) star icon in the top-right corner, nestled in a glassmorphic badge. Heat maps for "crowd levels" should be rendered as a thin, multi-colored bar at the bottom of the card.

### Interactive Maps
The map interface should use a custom-styled light "Silver" or "Water" theme (minimalist markers). Route lines are Primary Blue with a subtle pulse animation. Waypoints are white circles with thick Primary Blue borders.

### Masonry Diaries
Travel diaries utilize a masonry layout to accommodate varying photo orientations. Each entry should have a subtle hover lift effect and a small "date" label in `label-sm` styling.

### Inputs & Buttons
- **Primary Button:** Solid Primary Blue with white text, 0.5rem rounding.
- **Secondary Button:** Ghost style with a Primary Blue border or an Energetic Orange fill for "Book" actions.
- **Inputs:** Light gray background with a 1px slate border that turns Primary Blue on focus.