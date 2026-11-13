# TriageAI UI Redesign Specification

## Purpose

Redesign the user interface of TriageAI to achieve a polished, modern, production-quality healthcare SaaS appearance suitable for a hackathon demonstration.

The objective is to improve visual design, usability, branding, and user confidence without changing the existing core functionality.

Unless explicitly stated, preserve all current functionality, application flow, backend logic, APIs, and AI behavior.

This redesign should focus primarily on presentation, layout, interaction design, consistency, and user experience.

---

# Design Goals

The finished application should feel like:

- A modern healthcare SaaS platform.
- Professional and trustworthy.
- Calm and reassuring.
- AI-powered without feeling overly futuristic.
- Clean and uncluttered.
- Ready for real-world deployment.

The redesign should emphasize clarity over visual complexity.

---

# Overall Design Language

Adopt a design language inspired by modern healthcare platforms.

Characteristics:

- Generous whitespace.
- Large rounded cards.
- Soft shadows.
- Subtle borders.
- Clean typography.
- Consistent spacing.
- Smooth transitions.
- Professional color palette.

Avoid:

- Generic template appearance.
- Crowded layouts.
- Overly bright colors.
- Excessive gradients.
- Heavy animations.
- Inconsistent spacing.

---

# Branding

The application currently lacks a strong visual identity.

Introduce consistent branding throughout the application.

Create:

## Logo

Design a custom logo for TriageAI.

Requirements:

- Modern.
- Minimal.
- Healthcare-inspired.
- Easily recognizable.
- Works in light and dark mode.

The logo should combine concepts of:

- AI
- Healthcare
- Assistance
- Safety

Generate the logo using AI image generation if appropriate.

---

## Brand Colors

Primary Color

Professional healthcare blue.

Secondary Color

Soft teal or cyan.

Semantic Colors

Green

Used only for:

- Safe
- Success
- Non-Urgent

Amber

Used only for:

- Urgent

Red

Used only for:

- Emergency
- Critical alerts

Neutral Palette

Modern grayscale for backgrounds and cards.

Do not use bright saturated colors excessively.

---

# Hero Section Redesign

The landing page hero should immediately communicate the product value.

Current hero text is informative but not visually compelling.

Redesign the hero.

Include:

Large headline.

Clear value proposition.

Short supporting description.

Primary CTA:

"Start Assessment"

Secondary CTA:

"Learn More"

---

## Hero Visual

Instead of abstract graphics, display realistic application previews.

Include mockups of:

- AI conversation.
- Assessment result.
- Nearby hospital map.

These should appear as floating cards or dashboard previews beside the hero text.

The objective is to demonstrate the product before the user scrolls.

---

# Navigation

Redesign the navigation bar.

Requirements:

- Sticky navigation.
- Compact.
- Clean.
- Responsive.

Include:

- Logo
- Home
- Assessment
- History
- Profile
- Theme Toggle

Desktop:

Horizontal layout.

Mobile:

Slide-out navigation drawer.

---

# Feature Cards

Redesign feature cards.

Requirements:

- Equal height.
- Better spacing.
- Rounded corners.
- Hover animation.
- Icon at top.
- Title.
- Short description.

Use custom icons appropriate for healthcare.

Avoid generic placeholder icons.

---

# Trust Section

Add a new section immediately below the hero.

Purpose:

Increase user confidence.

Include cards such as:

- Educational AI Guidance
- Privacy First
- Emergency Safety Screening
- Location-Aware Hospital Finder
- Professional Medical Disclaimer

Each card should have:

- Icon
- Title
- One sentence description

---

# How It Works Section

Replace static text with a visual timeline.

Example flow:

Describe Symptoms

↓

Emergency Safety Check

↓

AI Follow-Up Questions

↓

Assessment Generated

↓

Recommended Next Steps

↓

Nearby Healthcare Facilities

Each step should have:

- Icon
- Title
- Short explanation

Animate steps as they enter the viewport.

---

# Assessment Experience

Redesign the assessment interface.

The conversation should feel closer to modern AI assistants.

Requirements:

Large chat area.

Clear separation between:

- User messages
- AI messages

Support:

- Yes/No buttons
- Severity sliders
- Choice chips

Avoid large text forms whenever possible.

---

## AI Messages

Display:

Assistant avatar.

Typing animation.

Timestamp.

Clean message bubbles.

---

## User Messages

Display:

User avatar.

Compact message bubbles.

Consistent alignment.

---

# Assessment Result Page

This page should become the visual centerpiece of the application.

Redesign it using separate cards.

Cards:

## Severity Card

Large badge.

Color coded:

Green

Amber

Red

Display:

Severity

Short explanation

---

## Possible Conditions

Card listing possible conditions.

Display disclaimer clearly.

Never present conditions as confirmed diagnoses.

---

## First Aid

Checklist design.

Large readable items.

Use healthcare icons.

---

## Warning Signs

Dedicated warning card.

Use amber or red accents depending on severity.

---

## Recommended Action

Highlight this card more than the others.

This should visually answer:

"What should I do next?"

---

## Hospital Finder

Embed the interactive map below the assessment.

Display:

- Hospital name
- Distance
- Estimated travel time
- Directions button

Ensure markers update based on the user's actual location.

Default location should remain Enugu State until geolocation is granted.

---

# Dashboard

Improve dashboard appearance.

Display quick summary cards:

Assessments Completed

Health Profile Status

Emergency Contacts

Latest Assessment

Recent Activity

Use cards instead of plain lists.

---

# Profile

Redesign profile as sections.

Personal Information

Health Profile

Emergency Contacts

Preferences

Each section should be inside a separate card.

---

# History

Assessment history should become a timeline.

Each assessment card should display:

Date

Severity badge

Symptoms

View Details button

Download PDF button

---

# Empty States

Every page requiring stored data should have meaningful empty states.

Example:

No Assessments

Illustration

Message:

"You haven't completed an assessment yet."

CTA:

"Start Assessment"

Avoid empty blank pages.

---

# Loading States

Replace generic spinners with skeleton loaders.

Examples:

Assessment loading.

Hospital loading.

Profile loading.

History loading.

---

# Error States

Create friendly error components.

Instead of technical errors.

Example:

"We couldn't retrieve nearby hospitals right now. Please try again in a moment."

---

# Microinteractions

Introduce subtle interactions throughout the application.

Examples:

Button hover.

Card elevation.

Fade transitions.

Loading shimmer.

Chat typing animation.

Progress indicators.

Avoid flashy animations.

Animations should support usability.

---

# Typography

Improve hierarchy.

Use:

Large bold headings.

Medium section headings.

Readable body text.

Consistent spacing.

Never allow large blocks of dense text.

---

# Spacing System

Apply a consistent spacing scale throughout.

Increase whitespace between:

Sections

Cards

Inputs

Buttons

Chat messages

The interface should feel breathable.

---

# Accessibility

Improve accessibility by ensuring:

High color contrast.

Keyboard navigation.

Visible focus states.

ARIA labels where appropriate.

Touch-friendly controls.

Responsive layouts.

---

# Responsive Design

The redesign must prioritize mobile devices.

Ensure every page works correctly on:

Mobile

Tablet

Desktop

No horizontal scrolling.

No overlapping components.

---

# Dark Mode

Refine dark mode.

Avoid pure black backgrounds.

Use dark neutral surfaces.

Maintain contrast.

Ensure semantic colors remain distinguishable.

---

# AI-Generated Assets

Where appropriate, use AI image generation to create custom assets instead of relying on generic placeholders.

Assets may include:

- TriageAI logo
- Hero illustration
- Healthcare-themed dashboard artwork
- Empty state illustrations
- Custom icons where suitable

All generated assets should maintain a consistent visual style and reinforce a professional healthcare brand.

---

# Preserve Existing Functionality

Do not modify:

- AI assessment logic.
- Authentication.
- Backend architecture.
- API routes.
- Database schema.
- User flows.
- Hospital search logic (except ensuring location accuracy).
- PDF generation.

Only change functionality where necessary to improve usability or support the redesigned interface.

---

# Expected Outcome

The final product should feel less like a hackathon prototype and more like a polished healthcare SaaS platform.

A first-time visitor should immediately understand:

- What TriageAI does.
- Why they should trust it.
- How to begin using it.

The redesign should significantly improve the visual quality, user confidence, and overall presentation while preserving the application's existing functionality.