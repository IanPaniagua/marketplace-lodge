# Lodge Marketplace — Usability Test Guide

**Version:** 1.0  
**Date:** 2026-05-18  
**Prepared by:** Ian Manuel  
**App state:** Phases 1–4 complete (auth, profiles, listings CRUD + moderation, realtime chat)

---

## 1. Objectives

1. Identify friction points in the core resident workflows (sign-up, listing, buying, chatting).
2. Validate that the admin moderation flow is legible and fast without training.
3. Discover any copy, layout, or navigation issues on a real mobile device.
4. Gather qualitative data before Phase 5 (ratings) and Phase 6 (PWA deploy) are built.

---

## 2. Scope — what is testable right now

| Feature | Status |
|---|---|
| Sign-up + approval gate | ✅ Live |
| Login / logout | ✅ Live |
| View and edit own profile | ✅ Live |
| Avatar upload | ✅ Live |
| Browse feed (filter by category / free-only) | ✅ Live |
| Create a listing (photos, price/free, category, condition) | ✅ Live |
| View a listing detail page | ✅ Live |
| Edit / delete own listing | ✅ Live |
| Admin: approve/reject users | ✅ Live |
| Admin: approve/reject listings with reason | ✅ Live |
| Admin: reports queue | ✅ Live |
| Start a chat from a listing | ✅ Live |
| Realtime 1:1 chat | ✅ Live |
| Block a user | ✅ Live |
| Report a conversation | ✅ Live |
| Ratings | ❌ Not built yet — exclude from test |
| PWA install prompt | ❌ Not built yet — exclude from test |

---

## 3. Participants

- **Target:** 3–5 lodge residents who have not used the app before.
- **Roles:** at least one participant plays Admin (Ian or a designated resident).
- **Devices:** personal smartphones (iOS or Android). Test on the device they will actually use.
- **Session length:** ~45 minutes per participant. Allow 15 min buffer for setup.
- **Compensation:** not required, but a brief thank-you message after is good practice.

---

## 4. Setup checklist (facilitator, before each session)

- [ ] App is running and reachable at the test URL (or local `ngrok` tunnel if not yet deployed).
- [ ] Two test accounts are pre-created: **Buyer** and **Seller** (both already approved).
- [ ] A third account, **Admin**, is approved and has `is_admin = true`.
- [ ] At least one sample listing is live in the feed from the Seller account (created via seed or manually).
- [ ] One listing is sitting in the pending queue for the admin tasks.
- [ ] One pending user registration is in the admin queue.
- [ ] All test accounts use a throwaway email and a simple password you can hand to the participant.
- [ ] Screen recording is enabled (with participant consent) or a second person observes and takes notes.
- [ ] Notification sounds are muted — you don't want app pings distracting the session.

---

## 5. Moderator guidelines

- **Think-aloud:** ask the participant to narrate what they're seeing and what they expect to happen. "Tell me what you're looking at right now."
- **Stay neutral:** do not explain the UI. If they get stuck, wait at least 20 seconds before intervening. When you do intervene, use redirects, not answers: "What would you expect to happen if you tapped that?"
- **No leading questions:** avoid "Did you find that easy?" — use "How did that feel?" or "What were you trying to do there?"
- **Note confusion, not just failure:** a participant who succeeds but pauses, re-reads, or taps the wrong thing first is still a finding.
- **Between tasks:** ask "What just happened? Was that what you expected?" before moving on.

---

## 6. Consent and intro script

> "Today I'm asking you to try a marketplace app that's being built for residents of the lodge. I want to understand what's easy and what's confusing — you're testing the app, not the other way around. There are no wrong answers. Please say out loud what you're thinking as you go. I won't be able to answer questions during tasks, but I'll note them and we can talk at the end. Is it okay if I record your screen for my own notes? The recording stays private."

---

## 7. Tasks

Each task is printed on a separate card (or read aloud). Do not show the participant the next task until the current one is complete or abandoned.

---

### Task 1 — Sign up and wait for approval

**Role:** New resident (no account yet)  
**Credential:** none — participant uses their own email or a provided throwaway

> "You just moved into the lodge and Ian told you about the marketplace. Go ahead and create an account."

**Observe:**
- Does the participant find the sign-up link without help?
- Is the form clear? (display name, email, password)
- Does the pending-approval screen communicate the next step clearly?

**Success:** Account created; pending screen displayed.  
**Note:** You (admin) will approve the account live during or immediately after this task — use it to bridge into Task 2.

---

### Task 2 — Browse the feed and find something interesting

**Role:** Approved resident  
**Credential:** Buyer account (pre-approved)

> "You're looking for something cheap or free — maybe furniture or kitchenware. See what's available."

**Observe:**
- Does the participant notice the category filter chips?
- Does the "Free only" toggle get discovered?
- Does the participant scroll naturally?
- Any confusion about listing cards (price display, condition badge)?

**Success:** Participant opens at least one listing detail page.

---

### Task 3 — Contact a seller

**Role:** Approved resident (Buyer account)

> "You found something you want. Reach out to the seller."

**Observe:**
- Does the participant find the "Message seller" button?
- Any hesitation about what happens after tapping it?
- Is it clear they're now in a chat?

**Success:** Participant sends at least one message in the chat.

---

### Task 4 — Create a listing

**Role:** Approved resident (Seller account — switch accounts or use a second device)

> "You have a desk lamp you no longer need. List it for €5."

**Observe:**
- Does the participant find the "New listing" entry point?
- Any confusion on the photo upload step?
- Is the price vs. "Free/gift" toggle clear?
- Are category and condition selectors understood?
- Does the post-submit state (pending approval) make sense?

**Success:** Listing submitted; participant understands it is awaiting approval.

---

### Task 5 — Edit a listing

**Role:** Approved resident (Seller account)

> "You changed your mind — you'd rather give the lamp away for free. Update your listing."

**Observe:**
- Can the participant find the edit action on their own listing?
- Is the "Free/gift" toggle clear enough to change from a price?
- After saving, does the participant understand why the listing went back to pending?

**Success:** Listing updated to free; participant acknowledges the re-moderation state.

---

### Task 6 — Admin: approve a user and a listing

**Role:** Admin (use Admin account)

> "A new resident has just signed up and needs access. Also, there is a listing waiting for your review. Handle both."

**Observe:**
- Does the admin find the admin panel without guidance?
- Is the Pending users tab vs. Pending listings tab distinction clear?
- Is the Approve / Reject flow quick enough?
- Does the admin feel in control?

**Success:** User approved; listing approved or rejected with a reason entered.

---

### Task 7 — Report a conversation

**Role:** Approved resident (Buyer account)

> "Someone in a chat said something that made you uncomfortable. Report it."

**Observe:**
- Can the participant find the report action inside the chat?
- Is the report dialog clear?
- Does the success state communicate that the report was submitted?

**Success:** Report submitted; participant sees confirmation.

---

### Task 8 — Find your own profile and update your bio

**Role:** Approved resident (either account)

> "Update your profile — add a short bio or change your display name."

**Observe:**
- Does the participant find the profile from the top-bar avatar?
- Is the edit flow intuitive?
- Does saving feel confirmed?

**Success:** Profile saved with a new bio or name.

---

### Task 9 — Delete your account (optional, end of session only)

> "Imagine you're moving out and want to remove your account from the app. How would you do that?"

**Observe:**
- Does the participant find Settings?
- Is the "Delete my account" button visible but not accidentally tappable?
- Does the confirmation dialog feel safe?

**Success:** Participant finds the button and understands what it does (do not actually delete test accounts).

---

## 8. Post-task debrief questions

Ask these after all tasks are complete, not after each task.

1. "What was the most confusing moment?"
2. "Was there anything you expected to be able to do but couldn't find?"
3. "How did the app feel on your phone — anything too small, too slow, hard to tap?"
4. "Would you use this if it were live in the lodge right now? Why or why not?"
5. "One thing you'd change if you could?"

---

## 9. Metrics to capture per task

| Metric | How to measure |
|---|---|
| Task completion | Binary: yes / no (partial counts as no) |
| Time on task | Stopwatch from "go" to success or abandonment |
| Error count | Any tap on a wrong element or a navigation back |
| Verbal confusion | Participant says "I'm not sure", pauses > 5 s, re-reads copy |
| Satisfaction | 1–5 rating asked immediately after each task ("How easy was that?") |

---

## 10. Known issues to watch for

These are areas flagged during development that may cause friction:

- **Pending state after editing a live listing** — participants may not expect their listing to disappear from the feed after a minor edit.
- **Admin panel discoverability** — the admin link is in the top-bar dropdown; non-admin users won't see it, but admin users need to find it quickly.
- **Photo upload on mobile** — image compression happens client-side; on low-end devices this can feel slow with no visible progress indicator.
- **Chat entry point** — "Message seller" is only on the listing detail page; participants who go straight to `/chats` from the nav will find it empty.
- **Bottom nav labels** — verify that all four tab labels are readable at 360 px without truncation.

---

## 11. Reporting findings

After all sessions, summarize findings using this structure:

```
## Finding #N
Severity: Critical / Major / Minor / Observation
Task: [task number]
Observed: [what happened]
Quote: "[participant quote if applicable]"
Recommendation: [one-sentence fix or next step]
```

Prioritize:
- **Critical** — task failure, blocker, data loss risk.
- **Major** — task completed but with significant frustration or multiple errors.
- **Minor** — confusion or inefficiency, task still completed.
- **Observation** — no action needed now, useful for Phase 5/6 design.

---

## 12. Next steps after testing

| Finding type | Who acts | When |
|---|---|---|
| Critical | Fix before Phase 5 starts | Immediately |
| Major | Schedule in Phase 5 or 6 | Next sprint |
| Minor | Backlog | Phase 6 polish |
| Observation | Input for Phase 2 roadmap | Future |
