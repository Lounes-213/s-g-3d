# S-G-3D Firestore Security Specification

## Phase 0: Data Invariants
1. A `users/{userId}` document can only be created or modified by the verified authenticated owner (`request.auth.uid == userId`), and never contains PII (email is isolated to `users/{userId}/private/info`).
2. `createdAt` is immutable and must equal `request.time` on creation; `updatedAt` must always equal `request.time` on create and update.
3. Initial `rankPoints`, `kills`, `deaths`, `wins`, `matchesPlayed` on user creation are strictly bounded (`rankPoints == 1000`, `kills == 0`, `deaths == 0`, `wins == 0`, `matchesPlayed == 0`) and on match update increments are clamped (`<= +120` rankPoints delta per write, monotonic `matchesPlayed >= existing.matchesPlayed`).
4. `users/{userId}/private/info` is readable and writable strictly by `request.auth.uid == userId` (PII Isolation).
5. `friendRequests/{requestId}` can only be created by `fromUid == request.auth.uid` with `status == 'pending'`, targeting an existing `users/{toUid}`, and once `status` becomes `'accepted'` or `'declined'` it is terminal and immutable.
6. `users/{userId}/friends/{friendUid}` enforces parent existence (`exists(/databases/$(database)/documents/users/$(userId))`), target existence, and strict `ownerUid == userId` query evaluation.
7. `roomInvites/{inviteId}` can only be created by `fromUid == request.auth.uid` with `status == 'active'`, and only the recipient (`toUid`) can transition `status` to `'dismissed'`.

## The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `users/u1` or write `friendRequests/r1` without `request.auth`.
2. **Shadow Field Injection on User Create**: `users/u1` create containing `{ ..., isAdmin: true }`.
3. **Spoofed UID on Profile Create**: Authenticated as `u1`, attempting to create `users/u2` or setting `uid: "u2"`.
4. **Stat Tampering on Profile Create**: Creating `users/u1` with `rankPoints: 999999, wins: 500`.
5. **Unbounded String Poisoning**: Creating `users/u1` with 2KB `username`.
6. **PII Cross-Read Attack**: Authenticated as `u2`, reading `users/u1/private/info`.
7. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create `users/u1`.
8. **Client-Spoofed Timestamp**: Creating `users/u1` with `createdAt: Timestamp(2020-01-01)`.
9. **Friend Request Terminal State Bypass**: Updating an `'accepted'` friend request back to `'pending'`.
10. **Friend Request Hijack**: Sender (`fromUid`) attempting to mark their own outgoing request as `'accepted'`.
11. **Orphaned Friend Request**: Creating a friend request targeting a non-existent `toUid: "ghost_999"`.
12. **Blanket List Scraping**: Listing `friendRequests` or `roomInvites` without filtering by `request.auth.uid`.
