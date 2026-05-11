# Design Guide: Green Chromatic Theme

This document defines the mandatory design system for the **Share Sphere** project. This rule is "locked" and replaces any previous monochromatic rules.

## The Core Principle
The application must strictly use a **Green Chromatic palette**. Green is the primary accent and brand color.

## Rules for Development

1. **Chromatic Foundation**: The primary brand color is Green (`hsl(142 71% 45%)`).
2. **Text on Color (Crucial)**:
    - **Light Mode (Day)**: Use **White text** on Green backgrounds/accents.
    - **Dark Mode (Night)**: Use **Black text** on Green backgrounds/accents.
3. **Use Semantic Variables**: Always use the CSS variables defined in `src/index.css`.
    - Use `--primary` for main actions.
    - The `--primary-foreground` variable is automatically tuned for the Day/Night rule (White in Day, Black in Night).
4. **Contrast**: Hierarchy is created through shades of green, transparency, and font weight.
5. **Icons**: Icons within primary green elements should follow the Day/Night text rule (White in Day, Black in Night).

## Verification Checklist
- [ ] In Light Mode, is text on green elements white?
- [ ] In Dark Mode, is text on green elements black?
- [ ] Are all primary actions (buttons, active tabs) using the brand Green?

> [!IMPORTANT]
> This design guide is permanent. Any new module must strictly adhere to this Green Chromatic system.
