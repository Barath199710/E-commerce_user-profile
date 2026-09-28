# Task 18 – User Profile & Settings Page Write-Up

## Overview
This document answers the four technical questions required for the submission of Task 18 (User Profile & Settings Page upgrade for the React + Flask E-Commerce Application).

---

### Question 1: How does your Navbar update immediately after a name or avatar change without a page refresh? Explain which React concept makes this possible.

**Answer:**
Immediate Navbar synchronization is made possible by **React Context API and top-level state reactivity (`AuthContext`)**. 

1. **Centralized State**: The `user` object containing profile details (`name`, `email`, `avatar_url`, `role`) resides inside the `AuthProvider` component state (`const [user, setUser] = useState(...)`).
2. **Provider & Consumer Hook**: The `Navbar` component consumes this context via `useAuth()`. Whenever the `user` state object in `AuthContext` changes, React automatically flags any component reading that context as requiring a re-render.
3. **State Mutation via `updateUser`**: When a user uploads a new avatar or edits their name in `ProfilePage.jsx`, the component invokes `updateUser({ name, avatar_url })`. This function performs an immutable functional update (`setUser(prev => ({ ...prev, ...updatedFields }))`) on the root `user` state.
4. **Instant UI Re-render**: Because `Navbar` is subscribed to `AuthContext`, the state change immediately re-renders the Navbar header with the new name and profile picture string without performing a browser page reload or network window refresh.

---

### Question 2: Why do you verify the current password before allowing a change? What security risk does skipping this step create?

**Answer:**
Verifying the user's current password before allowing a password change is a critical defense mechanism against **Account Takeover (ATO), Session Hijacking, and Unattended Device Exploitation**.

* **The Security Risk of Skipping Verification**:
  If current password verification is omitted, any unauthorized person who gains temporary physical access to an unlocked computer/browser tab or steals an active JWT token (via XSS or network sniffing) can immediately enter a new password and submit the form. The attacker would succeed in overwriting the victim's password, locking the real account owner out completely and hijacking the account permanently.
* **Why Verification Mitigates the Risk**:
  Requiring the current password acts as a secondary re-authentication gate (knowledge check). Even if an attacker has an active session, they cannot set a new password unless they already possess the victim's existing secret credentials.

---

### Question 3: Your password change route returns 401 for wrong current password. Why 401 and not 400?

**Answer:**
HTTP status codes are semantically defined by standard RFC HTTP specs:

* **HTTP 401 (Unauthorized / Unauthenticated)**: Indicates that the request lacks valid authentication credentials for the target resource or action. Submitting an incorrect current password means the user failed to verify their identity/credentials. Therefore, returning **401 Unauthorized** accurately communicates an authentication failure.
* **HTTP 400 (Bad Request)**: Indicates client-side syntax errors, missing mandatory JSON body fields (e.g., missing `confirm_password`), or domain validation rule failures (e.g., `new_password != confirm_password` or `len(new_password) < 6`).

Returning 401 for an incorrect current password allows the frontend to specifically detect an authentication credentials error and render a dedicated inline security error directly under the current password input field, while reserving 400 for input format validation errors.

---

### Question 4: What is the purpose of the `updateUser` function you added to `AuthContext`?

**Answer:**
The `updateUser` function serves as an in-memory session state synchronizer for the frontend application. 

* **State Synchronization**: It allows child components (such as `ProfilePage`) to pass partial profile updates (e.g., `{ name: 'New Name' }` or `{ avatar_url: '/static/uploads/avatar.jpg' }`) to `AuthContext` upon successful backend API mutations.
* **Eliminating Redundant Network Requests**: Without `updateUser`, the frontend would have to issue an additional `GET /api/me` HTTP request after every edit or upload to refresh local component state.
* **Ensuring App-Wide UI Consistency**: `updateUser` cleanly merges updated properties into the global `user` state, guaranteeing that all components depending on `useAuth()` (Navbar header, profile section, order summaries) instantly reflect the updated profile state seamlessly across the application.
