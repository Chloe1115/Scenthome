# Design System Document: The Olfactory Archive

## 1. Overview & Creative North Star: "The Digital Curator"
This design system is built upon the concept of **The Digital Curator**. We are not simply building a utility; we are designing a sanctuary where the ephemeral nature of memory meets the precision of artificial intelligence. 

To break the "template" look common in modern SaaS, this system rejects rigid, boxed-in layouts in favor of **Intentional Asymmetry** and **Editorial Breathing Room**. We treat the screen as a gallery wall: high-contrast typography scales (the "Literary Serif") create an authoritative, timeless feel, while overlapping "Glassmorphic" layers represent the tech-driven synthesis of scent. The goal is a UI that feels like a high-end art monograph—quiet, premium, and deeply intentional.

---

### 2. Colors: Tonal Depth & The "No-Line" Rule
Our palette transitions from the grounded warmth of the earth to the ethereal glow of the digital mind. 

*   **Primary (`#6f583c`) & Secondary (`#536254`):** These represent the "Analog" world—wood and moss. Use these for key brand moments and grounding elements.
*   **The Digital Glow:** Use the **Tertiary Container (`#4c7c7f`)** and **Tertiary Fixed (`#b9ecee`)** for AI-related interactions (e.g., "Synthesizing Scent"). These should often be applied as soft radial gradients rather than flat fills.

#### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections.
*   **Boundaries:** Define structure through background shifts. For example, a `surface-container-low` section should sit directly on a `surface` background. 
*   **Nesting:** Use the hierarchy of `surface-container-lowest` through `highest` to create a "stacked paper" effect. An inner module should always be one step "lighter" or "darker" than its parent to denote depth.

#### Glass & Gradient Implementation
*   **Floating Elements:** Use semi-transparent `surface` colors with a `backdrop-blur` (20px–40px) to create "frosted glass" containers.
*   **Soulful Gradients:** For CTAs or Hero backgrounds, transition from `primary` to `primary-container` at a 135-degree angle. This adds a "visual soul" that flat color cannot replicate.

---

### 3. Typography: The Literary & The Functional
The contrast between our two typefaces represents the bridge between memory (History) and AI (Modernity).

*   **The Serif (Newsreader):** Used for all `display` and `headline` roles. This font is literary and sophisticated. Use `display-lg` (3.5rem) with generous letter-spacing to command the page.
*   **The Sans-Serif (Manrope):** Used for `title`, `body`, and `label` roles. Manrope is highly legible and geometric, representing the clarity of the AI’s functional output.

**Hierarchy Note:** Always lead with the Serif. Even in small components, a `title-sm` Serif can be used to add a touch of "editorial" flair to a functional area.

---

### 4. Elevation & Depth: Tonal Layering
We move away from traditional shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The slight color shift creates a soft, natural lift that mimics fine stationery.
*   **Ambient Shadows:** If a floating effect is required (e.g., a modal), use an ultra-diffused shadow: `box-shadow: 0 20px 50px rgba(78, 69, 60, 0.06)`. Note the use of a tinted shadow color (`on-surface-variant`) instead of pure black.
*   **The "Ghost Border":** If a border is essential for accessibility, use the `outline-variant` at **15% opacity**. 100% opaque borders are strictly forbidden.
*   **Glassmorphism:** For AI "processing" states, use a `surface-container` with 60% opacity and a high backdrop blur. This makes the layout feel integrated and atmospheric.

---

### 5. Components: Fluidity & Softness

#### Buttons
*   **Primary:** Fill with a gradient (`primary` to `primary-container`). Corner radius: `md` (0.75rem). No border.
*   **Secondary:** `surface-container-highest` background with `on-surface` text.
*   **Tertiary:** No background. `primary` text with a subtle underline that expands on hover.

#### Input Fields
*   Avoid the "box" look. Use a `surface-container-low` fill with a `none` border. 
*   On focus, transition the background to `surface-container-high` and add a soft `tertiary` (Digital Glow) bottom-border of 2px.

#### Cards & Lists
*   **The Divider Ban:** Do not use line dividers. Use `spacing-6` (2rem) or `spacing-8` (2.75rem) to create separation through white space.
*   **Cards:** Use `surface-container-lowest` for cards on a `surface` background. Apply `corner-xl` (1.5rem) for a friendly, organic feel.

#### Specialized Components
*   **Scent Visualization (The AI Swirl):** An animated background component using `tertiary` and `secondary` gradients that shift slowly, signifying the AI "recreating" a memory.
*   **Memory Timeline:** A vertical layout using the `outline-variant` (at 20% opacity) as a very faint guide, with `display-sm` dates in the Serif font.

---

### 6. Do's and Don'ts

#### Do
*   **Embrace White Space:** Use the `20` (7rem) and `24` (8.5rem) spacing tokens for top/bottom margins of major sections.
*   **Overlapping Elements:** Let a high-quality nature photograph partially overlap a `surface-container` to break the "grid" feel.
*   **Organic Imagery:** Use photography with natural grain and soft focus to emphasize the "nostalgia" aspect.

#### Don't
*   **No Hard Edges:** Avoid `none` or `sm` roundedness for primary containers.
*   **No Pure Black:** Never use `#000000`. Use `on-surface` (`#1b1c1a`) for text to maintain a soft, premium look.
*   **No Grid-Lock:** Do not feel forced to align every element to a 12-column grid. Offset images or text blocks to create an editorial, magazine-style rhythm.
*   **No Default Shadows:** Never use the standard CSS `box-shadow: 0 2px 4px rgba(0,0,0,0.5)`. It destroys the ethereal aesthetic.