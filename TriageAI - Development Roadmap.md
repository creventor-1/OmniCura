# TriageAI - Development Roadmap

## 1. Purpose

This roadmap defines the recommended development order for TriageAI.

The goal is to build a polished, functional hackathon prototype within the available timeframe while prioritizing the features that create the strongest demo impact.

Development should follow the order below.

Do not begin advanced features before the core triage experience is stable.

---

# 2. Development Priority

Features are prioritized based on:

1. Impact during judging.
2. Core product functionality.
3. Reliability.
4. User experience.
5. Additional feature value.

The application should prioritize a smaller number of polished features over many incomplete features.

---

# Phase 1 — Project Foundation

## Goal

Create a stable development environment and application foundation.

## Tasks

### Project Setup

- Initialize Next.js project.
- Configure TypeScript.
- Configure Tailwind CSS.
- Install and configure shadcn/ui.
- Configure Lucide icons.
- Set up project folder structure.

---

### Theme System

Implement:

- Light mode.
- Dark mode.
- Theme switching.
- Consistent design tokens.

---

### Base UI Components

Create reusable components:

- Buttons.
- Cards.
- Inputs.
- Dialogs.
- Alerts.
- Loading states.
- Error states.

---

### Environment Setup

Configure:

- Environment variables.
- API configuration.
- Database connection.
- Authentication provider.

---

## Completion Criteria

The application should:

- Run successfully.
- Have a clean structure.
- Have reusable UI foundations.
- Support light/dark mode.

---

# Phase 2 — Core AI Triage Experience (Highest Priority)

## Goal

Build the main feature that defines TriageAI.

This phase must be completed before optional features.

---

## 2.1 Symptom Input Interface

Build:

- Landing experience.
- Symptom input screen.
- Chat-style interface.
- Message history display.

Users should be able to:

- Describe symptoms naturally.
- Continue a conversation with the AI.

---

## 2.2 Emergency Red-Flag Detection

Implement:

- Rule-based symptom screening.
- Emergency keyword detection.
- Immediate emergency flow.

Required behavior:

```
User enters symptoms

↓

Red flag check

↓

Emergency detected?

YES:
Emergency screen

NO:
Continue assessment
```

---

## 2.3 Disclaimer System

Implement:

Short disclaimer before assessment:

"TriageAI provides educational guidance only and is not a diagnosis. If this is an emergency, contact your local emergency service."

Requirements:

- One-time display.
- Emergency button visible.
- Persistent disclaimer banner.

---

## 2.4 Gemini AI Integration

Implement:

- Server-side Gemini integration.
- Secure API key handling.
- AI system prompts.
- Structured responses.

The AI should:

- Ask adaptive questions.
- Avoid unnecessary questions.
- Collect enough context.

---

## 2.5 Assessment Result System

Create:

- Severity display.
- Possible conditions.
- Reasoning.
- First aid guidance.
- Warning signs.
- Recommended action.

---

## Completion Criteria

A user should be able to:

1. Open TriageAI.
2. Enter symptoms.
3. Pass safety screening.
4. Answer AI questions.
5. Receive a complete assessment.

This is the minimum required demo.

---

# Phase 3 — User Accounts and Health Data

## Goal

Add personalization and persistence.

---

## Authentication

Implement:

- Registration.
- Login.
- Logout.
- Session management.

Support:

- Guest users.
- Registered users.

---

## Health Profile

Allow users to save:

- Age.
- Sex.
- Allergies.
- Chronic conditions.
- Current medications.
- Blood group.
- Height.
- Weight.

Requirements:

- User consent required.
- AI uses profile information only when permitted.

---

## Assessment History

Implement:

- Save assessments.
- View previous assessments.
- Open old results.

---

## Emergency Contacts

Implement:

- Add contacts.
- Edit contacts.
- Delete contacts.
- Quick access during emergencies.

---

# Phase 4 — Healthcare Utility Features

## Goal

Improve usefulness beyond AI conversation.

---

# Hospital Locator

Implement:

- Location permission handling.
- Interactive map.
- Nearby hospitals.
- Distance calculation.
- Directions.

Priority:

High.

This significantly improves the real-world usefulness of the application.

---

# PDF Report Generation

Implement:

Generate professional reports containing:

- Symptoms.
- Questions.
- Answers.
- Assessment.
- Recommendations.
- Disclaimer.
- Date/time.

Allow:

- Download.
- Optional saving.

---

# Phase 5 — Product Polish

## Goal

Make the application feel production-ready.

---

## UI Improvements

Improve:

- Animations.
- Transitions.
- Empty states.
- Loading states.
- Error handling.
- Mobile responsiveness.

---

## Branding

Create:

- TriageAI logo.
- Healthcare illustrations.
- Background visuals.

Use AI image generation where appropriate.

Generated assets should match:

- Professional healthcare style.
- Trustworthy branding.
- Modern SaaS appearance.

---

## Demo Preparation

Prepare:

- Demo user accounts.
- Example scenarios.
- Emergency demonstration.
- Normal assessment demonstration.

---

# Phase 6 — Extended Features

Only implement after the core product is complete.

---

# Voice Input

Add:

- Speech-to-text.
- Browser compatibility handling.
- Text fallback.

Requirements:

- Rate limiting.
- Error handling.
- Clear permission requests.

---

# Image Symptom Analysis

Add:

- Image upload.
- Gemini multimodal analysis.
- Educational feedback.

Supported examples:

- Rash.
- Burns.
- Cuts.
- Swelling.
- Skin changes.

Requirements:

- File validation.
- Size limits.
- No definitive diagnosis.

---

# Medication Scanner

Add:

- Medication image upload.
- Identification assistance.
- Safety information.

Requirements:

- Uncertainty handling.
- Encourage pharmacist verification.

---

# 7. Feature Cut Strategy

If time becomes limited, remove features in this order:

## Remove First

1. Medication scanner.
2. Image analysis.
3. Advanced profile fields.
4. Voice input.

---

## Protect At All Costs

Never sacrifice:

1. AI symptom assessment.
2. Emergency red-flag detection.
3. Professional UI.
4. Reliable demo flow.
5. Clear safety messaging.

---

# 8. Hackathon Demo Flow

Recommended demonstration:

## Scenario 1 — Normal Assessment

1. User opens TriageAI.
2. Enters symptoms.
3. AI asks questions.
4. Assessment generated.
5. User views recommendations.
6. User finds nearby hospital.

---

## Scenario 2 — Emergency Detection

1. User enters dangerous symptom.
2. Red-flag detector activates.
3. Emergency screen appears.
4. User receives immediate guidance.

---

## Scenario 3 — Personalization

1. User logs in.
2. Adds health profile.
3. Performs assessment.
4. AI uses relevant information.

---

# 9. Final Development Rule

The goal is not to build the largest healthcare platform.

The goal is to build the most convincing, safe, and polished AI triage assistant possible within the hackathon timeframe.

A smaller application that works flawlessly is more valuable than a large application full of unfinished features.