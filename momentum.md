I am creating an app called “Momentum” using React Native, Typescript, and Supabase. It helps procrastinators stay consistent by attaching real consequences to unfinished goals.

The idea is to have users create "Goals" or "Tasks" that represent things they want to stay consistent on. They must login everyday (on days they determin) to check-in when they've completed a task they were planning. If they don't login when they're supposed to. They get charged an amount they predetermine when creating a goal.

A check-in involves users simply opening the app, selecting the goal, and marking complete for the day. No verification required, as the entire point of the app relies on the user, at least for now.

We are currently working on the MVP, so all your answers should be based on that fact.

FEATURES
Goals: A commitment a user creates that they must check-in to, or they get charged for it

Must Haves

- [ ] Create account
  - [ ] Add their credit card
  - [ ] Add their timezone
  - [ ] Add first name and last name
- [ ] Create goals
  - [ ] Set days to check-in
  - [ ] Set punishment amount ($$$)
- [ ] If user doesn’t check-in, they get charged
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
│   ├── goals.tsx                  # GOALS — All goals list
│   └── settings.tsx               # SETTINGS — Profile & account
│
├── goal/                          # Goal-related screens
│   ├── create.tsx                 # Create a new goal
│   └── [id].tsx                   # Goal detail (edit, pause, view history)
│
├── profile/
│   └── edit.tsx                   # Edit name, timezone, payment method
│
└── charges.tsx                    # Charges/penalty history (read-only)
```

Always use the Expo docs MCP to use Expo SDK v54 best practices. If you don't have access to it, let me know before coding.

### Screens

#### (auth) — Unauthenticated
- **login** — Email/password sign in via Supabase Auth
- **signup** — Create account → triggers profile auto-creation

#### (onboarding) — First-Time Setup (sequential, non-skippable)
- **name** — Collect first & last name → UPDATE profiles
- **timezone** — Set timezone → UPDATE profiles
- **payment** — Add credit card via Stripe → save stripe_customer_id

Onboarding detection: if `profiles.first_name` is null, user hasn't onboarded.

#### (tabs) — Main App
- **Home** — Today's goals that need check-in. Tap to mark complete.
- **Goals** — Full list of all goals (active, paused). FAB to create. Tap for detail.
- **Settings** — Profile info, payment method, charges history link, sign out.

#### Standalone Screens
- **goal/create** — Title, amount ($), day picker (Mon–Sun toggles)
- **goal/[id]** — View check-in history, edit, pause/resume, cancel
- **profile/edit** — Change name, timezone, payment method
- **charges** — Read-only list of past penalties with status

### Providers

- **AuthProvider** — Manages Supabase session state, exposes `user`, `signIn`, `signOut`
- **ProfileProvider** — Fetches & caches user profile, exposes `profile`, `isOnboarded`
