# TriageAI - Development Rules and Coding Standards

## 1. Purpose

This document defines the development standards, coding practices, and implementation guidelines for building TriageAI.

The goal is to ensure that the application is:

- Maintainable.
- Scalable.
- Secure.
- Easy to debug.
- Consistent.
- Production-quality despite being a hackathon project.

These rules should guide all AI-assisted development.

---

# 2. General Development Principles

## Build Incrementally

Do not attempt to build the entire application at once.

Development should follow the roadmap:

1. Establish project foundation.
2. Build core AI triage functionality.
3. Add supporting healthcare features.
4. Add optional enhancements.
5. Polish the application.

Every feature should be completed before moving to the next.

A completed smaller feature is better than many incomplete features.

---

## Prioritize Quality Over Quantity

The priority order is:

1. Winning judges through a polished and impressive demo.
2. Production-quality code and architecture.
3. Learning new technologies.
4. Maximum number of features.

Do not add features that reduce stability or compromise the core experience.

---

# 3. Technology Rules

## Frontend

Required:

- Next.js App Router.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide icons.

Do not introduce alternative frontend frameworks or UI libraries unless explicitly requested.

---

## State Management

Preferred order:

1. Server state where possible.
2. React state for local component state.
3. Zustand only when shared client state is required.

Avoid unnecessary global state.

---

## Backend

Use:

- Next.js API routes.
- Server actions where appropriate.

Do not create unnecessary backend services.

Keep the architecture simple because this is a hackathon project.

---

# 4. TypeScript Rules

TypeScript must be used throughout the project.

Requirements:

- Avoid `any`.
- Define proper interfaces and types.
- Use strict typing.
- Keep types close to their related features.
- Reuse shared types.

Bad:

```typescript
const data:any = response;
```

Good:

```typescript
interface AssessmentResponse {
 severity: string;
 recommendedAction: string;
}
```

---

# 5. Component Rules

Components should:

- Have one clear responsibility.
- Be reusable.
- Avoid excessive complexity.

Avoid:

- Huge components.
- Duplicate UI logic.
- Business logic inside presentation components.

Preferred:

```
Component
    |
    |
Custom Hook
    |
    |
Service/API Layer
```

---

# 6. Folder Organization Rules

Follow feature-based organization.

Example:

```
features/

triage/
    components/
    hooks/
    services/
    types/
    schemas/

authentication/
    components/
    services/

reports/
    components/
    services/
```

Do not place all files into one large components folder.

---

# 7. UI Development Rules

The UI should maintain a professional healthcare SaaS appearance.

Requirements:

- Mobile-first.
- Responsive.
- Accessible.
- Consistent spacing.
- Clear hierarchy.
- Professional typography.

Use:

- shadcn/ui components where available.
- Lucide icons.
- Reusable design patterns.

---

## Visual Design Guidelines

The interface should feel:

- Trustworthy.
- Calm.
- Professional.
- Modern.

Avoid:

- Excessive animations.
- Bright distracting colors.
- Gaming-style interfaces.
- Cluttered screens.

---

# 8. Dark Mode Requirements

Dark mode must be supported.

Requirements:

- All components must work in both themes.
- Avoid hardcoded colors.
- Use theme variables.
- Test readability.

---

# 9. Form Handling Rules

All forms must include:

- Validation.
- Error messages.
- Loading states.
- Success states.

Use:

- React Hook Form.
- Zod schemas.

Never trust user input.

---

# 10. API Development Rules

All API endpoints must include:

- Input validation.
- Error handling.
- Proper HTTP status codes.
- Clear response formats.

Example:

Success:

```json
{
 "success": true,
 "data": {}
}
```

Error:

```json
{
 "success": false,
 "error": "Invalid request"
}
```

---

# 11. AI Integration Rules

## Gemini Usage

Gemini should only be called from server-side code.

Never:

- Expose API keys.
- Call Gemini directly from the browser.

---

## AI Prompt Design

Every AI request should:

- Have a clear system instruction.
- Specify expected output format.
- Include safety constraints.
- Avoid unnecessary context.

---

## Structured Outputs

AI responses should use schemas.

Never rely on free-form text when structured data is required.

Assessment responses must match:

```typescript
{
 possibleConditions: string[],
 severity:
   "non-urgent" |
   "urgent" |
   "emergency",
 severityReasoning: string,
 firstAidSteps: string[],
 warningSigns: string[],
 recommendedAction: string,
 disclaimer: string
}
```

---

# 12. Medical Safety Rules

The application must never:

- Claim to diagnose.
- Provide certainty about conditions.
- Replace healthcare professionals.
- Give dangerous instructions.

Always:

- Use uncertainty language.
- Encourage professional care when appropriate.
- Prioritize emergency situations.

---

# 13. Red Flag System Rules

The red-flag detector is mandatory.

Requirements:

- Runs before AI assessment.
- Uses deterministic logic.
- Does not depend on Gemini.
- Immediately escalates emergencies.

The flow:

```
User Input

↓

Red Flag Detection

↓

Emergency?

YES:
Emergency screen

NO:
AI assessment flow
```

---

# 14. Error Handling Rules

Every feature must handle:

- Network failures.
- API failures.
- Invalid inputs.
- Missing permissions.
- Authentication errors.

Never show raw technical errors to users.

Bad:

"Gemini API returned 429."

Good:

"Unable to complete assessment right now. Please try again."

---

# 15. Loading States

Every asynchronous action must have a loading state.

Examples:

- AI thinking indicator.
- Upload progress.
- PDF generation status.
- Map loading.

Never leave users wondering whether something is working.

---

# 16. Empty States

Every page requiring data must handle empty states.

Examples:

No assessments:

"Your previous assessments will appear here."

No emergency contacts:

"Add an emergency contact for quick access during urgent situations."

---

# 17. Security Rules

Always:

- Store secrets in environment variables.
- Validate uploaded files.
- Limit API usage.
- Protect user data.
- Avoid unnecessary data storage.

---

# 18. Rate Limiting Rules

Rate limiting should be considered for:

- Gemini requests.
- Voice processing.
- Image analysis.
- File uploads.

Purpose:

- Prevent abuse.
- Control API costs.
- Maintain reliability.

---

# 19. Image and File Handling Rules

Uploaded files must:

- Have size limits.
- Have type validation.
- Be processed securely.

Avoid storing sensitive images unless required.

---

# 20. Database Rules

Database operations should:

- Use typed queries.
- Validate data before insertion.
- Handle failures gracefully.

Never assume database operations succeed.

---

# 21. Documentation Rules

Important features should include:

- Clear naming.
- Comments only where necessary.
- Self-explanatory code.

Avoid unnecessary comments that simply repeat the code.

Bad:

```
// Set username
username = value;
```

Good:

```
// Normalize user input before storing to prevent inconsistent profile data.
```

---

# 22. Testing Rules

Before considering a feature complete, verify:

- Normal usage.
- Invalid input.
- Error scenarios.
- Mobile layout.
- Dark mode.
- Authentication states.

---

# 23. AI-Assisted Development Rules

When using AI coding assistants:

Do not:

- Generate the entire project in one request.
- Accept code without reviewing it.
- Add dependencies unnecessarily.

Always:

- Understand generated code.
- Test changes.
- Maintain architecture consistency.

Implement features one at a time.

---

# 24. Completion Criteria

A feature is complete only when:

- Frontend is implemented.
- Backend logic works.
- Validation exists.
- Error handling exists.
- Loading states exist.
- Responsive design works.
- Types are defined.
- The feature integrates cleanly with the existing architecture.

---

# Final Principle

TriageAI should be built as a polished healthcare product prototype, not a collection of disconnected AI features.

Every technical decision should support:

- Safety.
- Reliability.
- User trust.
- Clean engineering.
- A strong hackathon demonstration.