# Ala-Alab Security Specifications

This document defines the security boundaries, data invariants, and adversarial test cases designed to evaluate the robustness of our Firestore security model.

---

## 🔒 1. Data Invariants

1. **User Ownership Constraint**: A repository (`users/{userId}/repositories/{repositoryId}`) can only be read, created, updated, or deleted if the authenticated user's `uid` matches the `{userId}` path parameter.
2. **Email Verification Mandate**: To perform any write operation, the researcher's Google-authenticated session must have `email_verified == true`.
3. **Identifier Validity Constraint**: All path variables and ID fields must match `^[a-zA-Z0-9_\-]+$` and be under 128 characters to prevent injection attacks.
4. **Strict Schema Constraints**: All written documents must conform to the defined TypeScript schema bounds:
   - `id` must match `{repositoryId}`.
   - `name` must be a string of size <= 256.
   - `municipality` must be a string of size <= 256.
   - `established` must be a string of size <= 256.
   - `contextMarkdown` must be a string of size <= 500000 characters.
   - `errataLog` must be an array of size <= 100 items. Each item must contain strict string properties (`id`, `officialClaim`, `groundTruth`, `source`).

---

## 😈 2. The "Dirty Dozen" Attack Payloads

The following payload attempts aim to break the laws of Identity, Integrity, and State:

### Payload 1: Identity Spoofing (Foreign User Write)
- **Target Path**: `/users/researcher_a_uid/repositories/canumay-east`
- **Session Auth**: `request.auth.uid = "malicious_user_b"`
- **Vulnerability Targeted**: Broken Object-Level Authorization (BOLA).

### Payload 2: Email Verification Spoofing (Unverified User Write)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Session Auth**: `request.auth.uid = "user_a_uid"`, but `request.auth.token.email_verified = false`
- **Vulnerability Targeted**: Bypassing verification locks.

### Payload 3: ID Poisoning (Junk character in ID)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east-%%$$###!!!`
- **Session Auth**: `request.auth.uid = "user_a_uid"`
- **Vulnerability Targeted**: ID Injection / Path Traversal.

### Payload 4: ID Poisoning (Huge ID character limits)
- **Target Path**: `/users/user_a_uid/repositories/canumay_east_` + "A" * 1000
- **Session Auth**: `request.auth.uid = "user_a_uid"`
- **Vulnerability Targeted**: Resource exhaustion / Denial of Wallet.

### Payload 5: Shadow Update / Ghost Fields (Injecting un-validated keys)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload**: `{ id: "canumay-east", name: "Canumay", municipality: "Valenzuela", established: "1960", contextMarkdown: "...", errataLog: [], isAdminUser: true }`
- **Vulnerability Targeted**: Mass Assignment.

### Payload 6: Size Limit Abuse (Excessive text size payload)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload**: `{ id: "canumay-east", name: "A" * 500000, ... }`
- **Vulnerability Targeted**: Denial of Wallet.

### Payload 7: Array Bounding Abuse (Infinite list items)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload**: `{ errataLog: [ ... 1000 items ... ] }`
- **Vulnerability Targeted**: Memory bloat / NoSQL resource abuse.

### Payload 8: Type Pollution (Replacing Array with String)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload**: `{ errataLog: "this is a string now, not an array" }`
- **Vulnerability Targeted**: Type Confusion.

### Payload 9: Sub-Item Schema Abuse (Missing required keys in list objects)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload**: `{ errataLog: [{ id: "ERR-1", officialClaim: "Missing groundTruth and source" }] }`
- **Vulnerability Targeted**: Integrity Corruption.

### Payload 10: ID Mismatching (Document ID differs from payload `id` field)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload**: `{ id: "mismatched-id-field", name: "Canumay East", ... }`
- **Vulnerability Targeted**: Logic desynchronization.

### Payload 11: Immutable Field Tampering (Modifying `id` on update)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Payload Update**: `{ id: "changed-id-field" }`
- **Vulnerability Targeted**: Document ID drift.

### Payload 12: Anonymous Access (No Auth Session Read/Write)
- **Target Path**: `/users/user_a_uid/repositories/canumay-east`
- **Session Auth**: `null` (Anonymous)
- **Vulnerability Targeted**: Private data exposure.

---

## 🏃 3. The Test Runner Spec

The following structure forms the basis of the `firestore.rules.test.ts` file, validating that all "Dirty Dozen" payloads return `PERMISSION_DENIED`.

```typescript
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

// Standard TDD assertions:
// assertFails(maliciousWrite) => Must succeed (permission denied)
// assertSucceeds(legitimateWrite) => Must succeed (allowed)
```
