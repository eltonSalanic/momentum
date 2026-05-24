I am creating an app called “Momentum” using React Native, Typescript, and Supabase. It helps procrastinators stay consistent by attaching real consequences to unfinished commitments.

The idea is to have users create "Commitments" (either recurring "Routines" or one-time "Tasks") that represent things they want to stay consistent on or accomplish. They must check-in when they've completed the commitment for the day or deadline. If they don't check-in before their predetermined deadline (either End of Day or a Specific Time), they get charged a penalty amount they predetermine when creating the commitment.

A check-in involves users simply opening the app, selecting the commitment, and marking it complete. No verification required, as the entire point of the app relies on the user, at least for now.

We are currently working on the MVP, so all your answers should be based on that fact.

FEATURES
Commitments: A recurring Routine or one-time Task a user creates that they must check-in to, or they get charged a penalty amount for failing to do so.

Must Haves

- [x] Create account
  - [x] Add their credit card
  - [x] Add their timezone
  - [x] Add first name and last name
- [x] Create Commitments
  - [x] Choose type: Routine (recurring) or Task (one-time)
  - [x] For Routines: Set active days to check-in (Mon-Sun toggles)
  - [x] For Tasks: Set single completion deadline date
  - [x] Set penalty amount ($$$)
  - [x] Choose deadline timing: End of Day (11:59 PM) or Specific Time (Custom Time picker)
- [x] If user doesn’t check-in by the deadline, they get charged
- [x] Free 14 day trial
- [x] Pausing goal
- [x] Edit profile
  - [x] Change name
  - [x] Change timezone
  - [x] Change payment method
- [ ] Web App For Cancelling (In case users lose access to phone)
  - [ ] Logging in
  - [ ] Pause goal
  - [ ] Pause all goals

Nice To Haves

- [ ] Calendar that shows when you stayed consistent
- [ ] Write logs when checking in
- [ ] Roll-over check-in
- [ ] Google/apple login
- [ ] Choose different card for subscriptions and goals

Extra

- [ ] A graph of some sort that shows your progress
- [ ] Choose a different goals independently

---

## App Structure

Expo Router file-based routing with route groups for auth gating.

### Navigation Flow

1. App loads → check Supabase session
2. No session → show `(auth)` group
3. Has session → check profile's onboarding completion status
4. `profile.has_completed_onboarding` is false → show `(app)/(onboarding)` group
5. Onboarding is complete → show `(app)/(tabs)` group

### File Structure

```
app/
├── _layout.tsx                    # Root layout: loads fonts, auth provider, splash
├── index.tsx                      # Entry redirect (→ (auth) or (app) based on session)
│
├── (auth)/                        # Unauthenticated screens
│   ├── _layout.tsx                # Stack layout, no header
│   ├── login.tsx                  # Email + password login
│   └── signup.tsx                 # Email + password sign up
│
└── (app)/                         # Authenticated screens
    ├── _layout.tsx                # App layout (routes to tabs, onboarding, or goal modal screens)
    ├── index.tsx                  # Redirect to tabs/home
    │
    ├── (onboarding)/              # Sequential setup flow (uses OnboardingProvider)
    │   ├── _layout.tsx            # Onboarding stack layout
    │   ├── index.tsx              # Step 1: Collect first & last name ✅
    │   ├── timezone.tsx           # Step 2: Set timezone ✅
    │   ├── goal.tsx               # Step 3: Set up first commitment ✅
    │   └── payment.tsx            # Step 4: Add credit card (Stripe) ✅
    │
    ├── (tabs)/                    # Main tabbed app
    │   ├── _layout.tsx            # Bottom tab navigator with custom floating action button
    │   ├── index.tsx              # HOME — Today's check-ins & All commitments list ✅
    │   ├── create.tsx             # Spacer tab (FAB interceptor)
    │   └── settings.tsx           # PROFILE/SETTINGS — User profile info & sign out ✅
    │
    └── goal/                      # Commitment-specific screens (modals)
        ├── create.tsx             # Create Commitment carousel (Routine/Task flow) ✅
        └── [id].tsx               # Edit Commitment (edit form, status pause/resume) ✅
```

Always use the Expo docs MCP to use Expo SDK v54 best practices. If you don't have access to it, let me know before coding.

### Screens

#### (auth) — Unauthenticated

- **login** — Email/password sign in via Supabase Auth ✅
- **signup** — Create account → triggers profile auto-creation ✅

#### (app)/(onboarding) — First-Time Setup (sequential, non-skippable)

- **index** — Collect first & last name → UPDATE profile onboarding state ✅
- **timezone** — Set timezone → UPDATE profile onboarding state ✅
- **goal** — Choose first commitment (title, schedule, stakes) → UPDATE onboarding state ✅
- **payment** — Add credit card via Stripe → Save Stripe customer & complete onboarding ✅

#### (app)/(tabs) — Main App

- **index (Home)** — Today's active commitments (Routines and Tasks) that need check-in (Tap to check-in with haptic feedback, automatic refreshing) and All Commitments grouped/expandable by day of the week. ✅
- **settings (Profile)** — User profile info and sign out button. ✅

#### Standalone Screens

- **goal/create** — Set up a new Commitment: carousel flow with Routine vs Task selection, schedule (days or single due date), custom/preset stakes penalty ($), and deadline timing (End of Day vs Specific Time). ✅
- **goal/[id]** — Edit commitment details (title, schedule, stakes, deadline) and toggle pause/resume commitment. ✅

### Providers

- **AuthProvider** — Manages Supabase session state, exposes `user`, `signIn`, `signOut`
- **ProfileProvider** — Fetches & caches user profile, exposes `profile`, `isOnboarded`

---

### Naming & Tone Conventions (Commitment Theme)

To maintain a highly professional, intentional, and high-stakes branding tone throughout Momentum:

1. **Commitment Terminology:** Never use soft or casual terms like "Goal", "Habit", or "Battle". Always use:
   - **Commitment:** The umbrella term for all active user pledges.
   - **Routine:** A recurring commitment (e.g., go to gym 3x a week).
   - **Task:** A one-time commitment (e.g., wash the car).
2. **Serious & Direct Tone:** Focus copywriting on accountability (e.g., *"What is your commitment?"*, *"Review your pledge"*). Avoid gamified or aggressive terms like *"Choose your battle"*.
3. **Database Mapping Consistency:** Frontend `Commitments` continue mapping to the backend `goals` table inside Supabase to preserve database integrity. Always use centralized constants from `types/commitment.ts` for all type evaluations.
