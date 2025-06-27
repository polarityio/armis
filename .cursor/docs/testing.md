# Manual Test Plan Template Rule

When asked to generate a manual test plan, use this structure. Adapt details to the specific feature under test.

If insufficient information is provided for any section, ask for more details.

---

## 1. Test Scope
- **Components:** List relevant UI components, pages, or flows
- **Files:** List relevant files (utils, helpers, graphql, etc.)
- **Focus:** List key behaviors, UI states, or tracking/analytics to verify

## 2. Preconditions
- List required data states, user roles, or environment setup
- Example: Profiles with varying data (updatedAt recent/old/missing, contact info present/missing, different sources)

## 3. Test Matrix
- Fill out test matrix with all relevant permutations
- Scenario number and Notes columns are mandatory
- Example:

| Scenario | Source | Profile Updated At | Contact Info | Expected Button | Notes |
|---|---|---|---|---|---|
| 1 | Expert Search | >3 months ago | Present | Update | Old profile |
| 2 | Expert Search | Missing | Present | Update | No update date |
| 3 | Expert Search | <3 months ago | Missing | Update | Fresh, but no contact |
| 4 | Expert Search | <3 months ago | Present | Index | Fresh, has contact |
| 5 | Expert Finder | >3 months ago | Present | Update | Old profile, source=ExpertFinder |

## 4. Steps
### A. UI/Logic Verification
1. Open each relevant component/page
2. For each scenario in the matrix:
   - Locate or create required data state
   - Observe UI (button label, state, etc.)
   - Click/interact as needed. Confirm correct action/modal/redirect
   - Check dev tools console for errors
   - Check network tab for Apollo payloads and responses
3. Repeat for all entry points (page, tab, dialog, modal, etc.)

### B. Tracking/Analytics Verification - if applicable
1. For each action (if applicable):
   - Confirm correct tracking/analytics payload is sent (dev tools network tab, logs, test hooks)
   - Take screenshots of network tab. Save in `screenshots` directory (create if needed)

## 5. Edge Cases
- List and test edge cases (missing/malformed data, disabled states, fallback logic, etc.)

## 6. Acceptance Criteria
- List pass/fail criteria (UI matches logic, tracking sent, no regressions, etc.)

---

**Usage:** Select this rule when asked to create a manual test plan. Fill in details for the specific feature.