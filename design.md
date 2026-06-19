---
name: stalld
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#37393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c5c6cd'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8f9097'
  outline-variant: '#44474d'
  surface-tint: '#b9c7e4'
  primary: '#b9c7e4'
  on-primary: '#233148'
  primary-container: '#0a192f'
  on-primary-container: '#74829d'
  inverse-primary: '#515f78'
  secondary: '#b7c8e1'
  on-secondary: '#213145'
  secondary-container: '#3a4a5f'
  on-secondary-container: '#a9bad3'
  tertiary: '#e7bf99'
  on-tertiary: '#432b10'
  tertiary-container: '#281400'
  on-tertiary-container: '#9d7b5a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b9c7e4'
  on-primary-fixed: '#0d1c32'
  on-primary-fixed-variant: '#39475f'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#e7bf99'
  on-tertiary-fixed: '#2b1701'
  on-tertiary-fixed-variant: '#5d4124'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1200px
---

## Brand & Style

The design system is engineered for high-stakes productivity, targeting users who require a disciplined environment to overcome procrastination. The aesthetic is rooted in **Minimalism** with a **Corporate/Modern** backbone, emphasizing task-oriented clarity over decorative elements.

The visual narrative focuses on "Deep Work." By using a dark, immersive foundation, the design system minimizes peripheral distractions and directs the user's cognitive load toward active tasks. The interface should feel like a high-performance instrument—precise, reliable, and authoritative—to instill a sense of urgency and professional accountability.

## Colors

The color palette is designed to create a focused, low-glare environment. The primary foundation is built on a deep navy blue (#0A192F), which serves as a canvas for high-contrast neutral-white text and slate gray secondary information.

The primary color (Deep Navy) defines the container and surface space, while the secondary Slate Gray (#64748B) is utilized for borders, icons, and non-essential metadata to maintain a clear hierarchy. This palette ensures that content remains the focus, using dark-mode optimization to reduce eye strain during long working sessions. For high-stakes moments (deadlines or completed milestones), semantic colors for error and success should be used sparingly to maintain the serious, professional tone.

## Typography

This design system utilizes a multi-font strategy to balance technical authority with functional clarity.

**Space Grotesk** is used for headlines and display text, providing a geometric, modern character that feels precise and architectural. **Inter** is the primary body font, chosen for its exceptional legibility in dark-mode interfaces and its neutral, "invisible" quality that facilitates reading flow. **Geist** is retained for labels and metadata, offering a technical, monospaced-influenced feel for secondary information.

Headlines use tighter letter spacing and heavier weights to feel impactful and commanding. Body text maintains generous line height for long-term comfort during deep work sessions. Label styles, particularly `label-sm`, utilize uppercase styling and increased tracking to differentiate metadata from primary task content.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy to project stability and discipline. A strict 8px base unit ensures mathematical consistency across all components.

- **Desktop:** A 12-column grid with a 1200px max-width container. Content is centered to keep the user's vision focused on the middle of the screen.
- **Mobile:** A 4-column fluid grid with 16px side margins.
- **Rhythm:** Use `md` (16px) for internal component padding and `xl` (32px) to separate distinct logical sections. Whitespace is used intentionally to prevent the "high-stakes" atmosphere from feeling cluttered or overwhelming.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines** rather than traditional shadows. This maintains the "clean lines" required by the brand.

1. **Base Layer:** Deep Navy (#0A192F).
2. **Surface Layer:** Navy Blue (#0A192F/Primary Container) with a 1px subtle border (#64748B at 20% opacity).
3. **Elevated/Active Layer:** Lighter Navy tones.

Shadows, when used, are strictly "Ambient Shadows"—diffused, low-opacity, and tinted with the primary navy color to avoid a "muddy" look. Use these only for temporary overlays like dropdowns or modals to separate them from the work surface.

## Shapes

The design system employs **Soft** (0.25rem) roundedness. This subtle curvature maintains a professional, architectural feel while providing just enough approachability to remain "encouraging."

Avoid fully circular (pill) shapes for functional components; keep primary buttons and inputs at the standard 0.25rem radius. Progress bars and small status tags may use a slightly higher radius (`rounded-lg`) to distinguish them as decorative or informational indicators.

## Components

### Buttons

- **Primary:** Solid primary color (#0A192F) with high-contrast neutral text. Bold weight. No shadow, but use a subtle inner-glow for a "tactile" feel upon hover.
- **Secondary:** Ghost style with a 1px Slate Gray (#64748B) border.
- **Critical:** Solid Danger Red for "abandon task" or "reset" actions.

### Input Fields

Inputs are dark-themed with a background of #0A192F and a 1px border of #64748B. Upon focus, the border transitions to a highlight blue and gains a subtle outer glow. Placeholders are low-contrast slate gray using the Geist label font.

### Cards & Task Items

Cards utilize the surface-container approach. Active tasks should have a subtle 2px left-border accent to indicate current focus.

### Progress Indicators

Use high-contrast tracks. The "empty" track is a dark navy-gray, while the "filled" track is the primary brand color or secondary slate. For procrastinators, visual momentum is key; use smooth transitions for any progress bar updates.

### Status Chips

Small, condensed components using `label-sm` typography from the Geist family. Use background tints of the secondary colors (e.g., 10% opacity gray background with solid slate text) to indicate task states like "Pending," "In-Progress," or "Hard Deadline."
