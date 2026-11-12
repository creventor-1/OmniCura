# TriageAI - Project Specification

## 1. Project Overview

TriageAI is an AI-powered emergency triage and first-aid assistant designed to help users understand the urgency of their symptoms before they are able to access professional healthcare.

The application provides educational medical guidance only. It does not diagnose illnesses, prescribe treatments, or replace healthcare professionals. Its purpose is to help users make better-informed decisions about the appropriate next step during health situations, especially when immediate access to medical professionals may be limited.

TriageAI combines artificial intelligence, healthcare safety principles, location services, and user-controlled health data management to provide a fast, accessible, and responsible health assistance experience.

The project is a hackathon prototype designed to demonstrate the potential of AI in improving early healthcare decision-making. It is not a regulated medical device.

---

# 2. Core Problem

Many people experience medical symptoms but are uncertain about:

- How serious their condition may be.
- Whether they should seek immediate medical attention.
- What actions they can safely take while waiting for professional help.
- Where the nearest healthcare facilities are.

This problem is especially significant in situations where:
- Medical access is delayed.
- Users lack medical knowledge.
- Emergency decisions need to be made quickly.

TriageAI addresses this by providing an intelligent first point of guidance while encouraging appropriate professional care when necessary.

---

# 3. Target Users

TriageAI is designed for:

## General Public

People who experience symptoms and need quick educational guidance about possible urgency levels.

## Emergency Situations

Users who need immediate guidance while waiting for professional healthcare access.

## Communities With Limited Healthcare Access

People who may need assistance identifying when travelling to a healthcare facility is necessary.

---

# 4. Main User Experience

The primary experience follows this flow:

```
User opens TriageAI (no login required)
↓
User describes symptoms naturally (text or voice)
↓
System performs emergency red-flag screening
↓
If emergency:
  Show emergency guidance immediately
If not emergency:
  Display brief one-time disclaimer
↓
AI asks adaptive follow-up questions
(red-flag screening continues on every user message)
↓
AI analyzes collected information
↓
User receives structured assessment
↓
User receives recommended next action
↓
User can locate nearby healthcare facilities
↓
User can save/export assessment (account optional, offered here)
```

---

# 5. Core Features

## 5.1 AI Symptom Assessment

Users can describe their symptoms using natural language.

Example:

"I have had a fever, headache, and sore throat for three days."

The AI should understand the user's description and begin gathering relevant information.

The AI must not immediately provide a conclusion. It should first collect enough context through adaptive questioning.

---

## 5.2 Emergency Red-Flag Detection

Safety is the first priority.

Before any AI call is made, the system performs a deterministic rule-based check (keyword/pattern matching) on the user's message. This check runs on the initial message AND on every subsequent user message, because dangerous symptoms may only be revealed during follow-up answers. It must not depend on the LLM behaving correctly.

The red-flag detector should identify potentially life-threatening situations such as:

- Severe chest pain (especially with shortness of breath)
- Difficulty breathing
- Signs of stroke
- Severe bleeding
- Loss of consciousness
- Severe allergic reactions / anaphylaxis
- Suicidal statements
- Other emergency indicators

If a red flag is detected:

- The normal assessment flow is stopped.
- The user is immediately shown emergency guidance.
- The user is encouraged to seek professional emergency care.
- The application should not delay the user with unnecessary questions.

---

# 6. AI Follow-Up Question System

Before the first question, the user sees a brief one-time disclaimer (one or two sentences, a single tap to acknowledge), not a long consent form. For example: "TriageAI gives educational guidance only and is not a diagnosis. If this is an emergency, call your local emergency number now." A persistent emergency button remains visible throughout.

For non-emergency situations, the AI then conducts a short interactive assessment.

The AI asks questions about:

- Symptom location
- Symptom severity
- Duration
- Associated symptoms
- Existing medical conditions
- Allergies
- Current medications
- Relevant personal health information

Questions should be:

- Short.
- Clear.
- Easy to answer.
- Asked one at a time.

Where possible, use interactive controls:

- Yes/No buttons.
- Multiple choice options.
- Severity sliders.

The assessment should generally contain around 5-8 questions maximum. This also keeps AI usage within free-tier limits, since each follow-up is a separate AI request.

The AI should stop questioning once sufficient information has been gathered.

---

# 7. Assessment Results

The AI generates a structured assessment (enforced through a fixed JSON schema) containing:

## Possible Conditions

The system provides possible explanations for symptoms.

Important:

- These are possibilities only.
- They must never be presented as confirmed diagnoses.

---

## Severity Classification

Every assessment receives one severity level:

### Non-Urgent

Symptoms may be monitored with appropriate self-care guidance.

### Urgent

Professional medical attention is recommended within a reasonable timeframe.

### Emergency

Immediate professional medical attention is recommended.

---

## Severity Explanation

The AI provides a short explanation of why that urgency level was selected.

---

## First-Aid Guidance

The application provides safe educational guidance.

Examples:

- Immediate steps users can take.
- Things to avoid.
- Basic supportive care.

---

## Warning Signs

The system highlights symptoms that require escalation.

Examples:

- Symptoms getting worse.
- New dangerous symptoms appearing.
- Loss of normal function.

---

## Recommended Action

The AI provides a clear next step:

- Monitor symptoms.
- Schedule a healthcare appointment.
- Visit a healthcare facility.
- Seek emergency assistance.

---

# 8. Healthcare Facility Locator

After an assessment, users can locate nearby healthcare facilities.

The feature provides:

- Interactive map.
- Nearby hospitals and clinics.
- Facility names.
- Distance.
- Directions.

If map data is sparse for the user's area, a small curated fallback list of facilities should be used.

---

# 9. User Accounts

TriageAI supports both guest and registered users. Accounts are optional, because requiring login before someone with urgent symptoms can get help would be poor design.

Guests can:

- Complete assessments.
- Receive results.

Guest assessment data is kept in memory or session storage only and is not written to the database.

On the results screen, guests are offered "Sign up to save this assessment and export it." If they sign up, the assessment they just completed is saved to their new account.

Registered users can:

- Save assessments.
- Review previous results.
- Manage health information.
- Manage emergency contacts.

---

# 10. Health Profile

Users can optionally create a health profile (registered users only).

Information includes:

- Age.
- Sex.
- Allergies.
- Chronic conditions.
- Current medications.
- Blood group.
- Height.
- Weight.

Health information is only used for personalized assessment when the user provides permission.

---

# 11. Assessment History

Registered users can review previous assessments.

Stored information may include:

- Date and time.
- Symptoms submitted.
- Questions asked.
- User responses.
- AI assessment.
- Recommendations.

---

# 12. Medical Report Export

Users can generate a professional PDF report containing:

- Assessment date and time.
- Reported symptoms.
- Follow-up questions.
- User responses.
- AI assessment.
- Severity level.
- Recommendations.
- Disclaimer (on every exported report).

Users control whether reports are stored.

---

# 13. Emergency Contacts

Users can store emergency contacts.

Information includes:

- Contact name.
- Relationship.
- Phone number.

The application should make emergency contact information easily accessible during urgent situations.

---

# 14. Voice Input

Users can describe symptoms using voice input where browser support is available.

Requirements:

- Speech-to-text conversion using the browser's built-in speech recognition (no AI API usage, no extra cost).
- Feature detection, with text input as the fallback (support is strongest in Chrome and Android and partial in Safari).

---

# 15. Image Analysis (Extended Feature)

Users can upload images related to visible symptoms:

Examples:

- Rash.
- Burn.
- Cut.
- Swelling.
- Skin discoloration.

Images are compressed client-side before upload to reduce AI token usage.

The AI provides:

- Possible explanations.
- General educational guidance.
- First-aid recommendations.
- Advice on whether professional evaluation may be appropriate.

It must not provide definitive diagnosis, and results must include explicit uncertainty wording.

---

# 16. Medication Scanner (Extended Feature)

Users can upload medication images. This reuses the same image upload and vision pipeline as section 15.

The AI provides:

- Medication identification.
- Common purpose.
- Typical uses.
- Safety precautions.
- Common side effects.

The system must:

- Express uncertainty when identification is unclear.
- Encourage verification through packaging or healthcare professionals.

---

# 17. Design Requirements

The application should have a professional healthcare SaaS design.

Requirements:

- Clean interface.
- Mobile-first design (installable as a PWA).
- Responsive layout.
- Light and dark modes.
- Accessible design.
- Clear emergency states.
- Professional typography.
- Consistent component design.

Custom AI-generated visual assets should be used where appropriate:

- Logo.
- Background illustrations.
- Healthcare-themed graphics.
- Custom icons.

---

# 18. Safety and Privacy Requirements

TriageAI must always:

- Clearly state it does not diagnose.
- Encourage professional medical care when appropriate.
- Prioritize emergencies.
- Avoid dangerous medical instructions.
- Avoid unnecessary delays during urgent situations.

A persistent disclaimer should remain visible throughout the application.

Privacy requirements:

- Each user can only access their own stored data (database-level access rules and private file storage).
- Health profile data is only sent to the AI with the user's permission.
- The free tier of the AI provider may use submitted data to improve its products. The app must tell users not to enter real personal medical details in the prototype, and this should be stated in the privacy note.

---

# 19. Project Success Criteria

The project is successful if it demonstrates:

- A realistic healthcare use case.
- Meaningful AI integration.
- Responsible AI implementation.
- Excellent user experience.
- Production-quality code structure.
- A polished hackathon demonstration.

The priority order is:

1. Impress judges.
2. Maintain high-quality engineering practices.
3. Learn useful technologies.
4. Add additional features where time allows.

Feature build priority (build in this order; later items are cut first if time runs short):

1. Core loop: symptom chat, adaptive follow-ups, structured assessment, red-flag emergency screen.
2. Hospital map.
3. Accounts, history, PDF export.
4. Health profile and emergency contacts.
5. Image analysis, then medication scanner.
6. Voice input and UI polish.
7. Blockchain record anchoring.

---

# 20. Technical Constraints

- Everything must use free tiers only, with no paid services and no billing-account requirements.
- The AI free tier is rate-limited per project (not per API key), and its limits can change. Check actual limits in the provider console before the demo.
- The AI model must be a free-tier-eligible one.
- Protect the AI quota with server-side rate limiting, retry with backoff on rate-limit errors, and a text-only fallback AI provider for chat.
- AI calls are made only from the server side, so API keys are never exposed to the browser.
- Prepare a cached or pre-recorded demo flow for image and medication features in case limits are hit during the presentation.