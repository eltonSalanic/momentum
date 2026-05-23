I am creating an app called “Momentum” using React Native, Typescript, and Supabase. It helps procrastinators stay consistent by attaching real consequences to unfinished commitments.

The idea is to have users create "Commitments" (either recurring "Routines" or one-time "Tasks") that represent things they want to stay consistent on or accomplish. They must check-in when they've completed the commitment for the day or deadline. If they don't check-in before their predetermined deadline (either End of Day or a Specific Time), they get charged a penalty amount they predetermine when creating the commitment.

A check-in involves users simply opening the app, selecting the commitment, and marking it complete. No verification required, as the entire point of the app relies on the user, at least for now.

We are currently working on the MVP, so all your answers should be based on that fact.

FEATURES
Commitments: A recurring Routine or one-time Task a user creates that they must check-in to, or they get charged a penalty amount for failing to do so.

Must Haves

- [ ] Create account
  - [ ] Add their credit card
  - [ ] Add their timezone
  - [ ] Add first name and last name
- [ ] Create Commitments
  - [ ] Choose type: Routine (recurring) or Task (one-time)
  - [ ] For Routines: Set active days to check-in (Mon-Sun toggles)
  - [ ] For Tasks: Set single completion deadline date
  - [ ] Set penalty amount ($$$)
  - [ ] Choose deadline timing: End of Day (11:59 PM) or Specific Time (Custom Time picker)
- [ ] If user doesn’t check-in by the deadline, they get charged
- [ ] Free 14 day trial
- [ ] Pausing goal
- [ ] Edit profile
  - [ ] Change name
  - [ ] Change timezone
  - [ ] Change payment method
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
2. No session → show (auth) group
3. Has session → fetch profile
4. Profile.first_name is null → show (onboarding) group
5. Profile is complete → show (tabs) group

### File Structure

```
app/
├── _layout.tsx                    # Root layout: loads fonts, auth provider, splash
├── index.tsx                      # Entry redirect (→ auth or tabs based on session)
│
├── (auth)/                        # Unauthenticated screens
│   ├── _layout.tsx                # Stack layout, no header
│   ├── login.tsx                  # Email + password login
│   └── signup.tsx                 # Email + password sign up
│
├── (onboarding)/                  # Post-signup, pre-app setup
│   ├── _layout.tsx                # Stack layout, no back button
│   ├── name.tsx                   # First name + Last name
│   ├── timezone.tsx               # Timezone picker
│   └── payment.tsx                # Add credit card (Stripe)
│
├── (tabs)/                        # Main app (authenticated + onboarded)
│   ├── _layout.tsx                # Bottom tab navigator
│   ├── index.tsx                  # HOME — Today's check-ins
│   ├── commitments.tsx            # COMMITMENTS — All commitments list
│   └── settings.tsx               # SETTINGS — Profile & account
│
├── commitment/                    # Commitment-related screens
│   ├── create.tsx                 # Create a new commitment (Routine/Task flow)
│   └── [id].tsx                   # Commitment detail (edit, pause, view history)
│
├── profile/
│   └── edit.tsx                   # Edit name, timezone, payment method
│
└── charges.tsx                    # Charges/penalty history (read-only)
```

Always use the Expo docs MCP to use Expo SDK v54 best practices. If you don't have access to it, let me know before coding.

### Screens

#### (auth) — Unauthenticated

- **login** — Email/password sign in via Supabase Auth ✅
- **signup** — Create account → triggers profile auto-creation ✅

#### (onboarding) — First-Time Setup (sequential, non-skippable)

- **name** — Collect first & last name → UPDATE profiles ✅
- **timezone** — Set timezone → UPDATE profile ✅
- **payment** — Add credit card via Stripe → save stripe_customer_id ✅


#### (tabs) — Main App

- **Home** — Today's active commitments (Routines and Tasks) that need check-in. Tap to mark complete. Along with a list of all current commitments.
- **Settings** — Profile info, payment method, charges history link, sign out.

#### Standalone Screens

- **goal/create** — Set up a Commitment: Routine vs Task selection, schedule (days or single date), penalty amount ($), and deadline timing (End of Day vs Specific Time)
- **goal/[id]** — View commitment details, check-in history, edit, pause/resume, cancel
- **profile/edit** — Change name, timezone, payment method
- **charges** — Read-only list of past penalties with status

### Providers

- **AuthProvider** — Manages Supabase session state, exposes `user`, `signIn`, `signOut`
- **ProfileProvider** — Fetches & caches user profile, exposes `profile`, `isOnboarded`
