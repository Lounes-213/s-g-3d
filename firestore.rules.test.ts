// Payload-First Security TDD specification runner for S-G-3D Firestore Rules.
// Documents and validates the 12 adversarial payloads against the Eight Pillars invariants.

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: "get" | "list" | "create" | "update" | "delete";
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: "PERMISSION_DENIED";
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: "Unauthenticated profile read",
    collectionPath: "users/user_a",
    operation: "get",
    auth: null,
    expected: "PERMISSION_DENIED",
  },
  {
    id: 2,
    name: "Shadow field injection on profile create",
    collectionPath: "users/user_a",
    operation: "create",
    auth: { uid: "user_a", email_verified: true },
    payload: {
      uid: "user_a",
      username: "Striker",
      characterId: "striker",
      skinId: "tactical_olive",
      rankPoints: 1000,
      rankTier: "Silver",
      kills: 0,
      deaths: 0,
      wins: 0,
      matchesPlayed: 0,
      isAdmin: true,
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 3,
    name: "Identity spoofing on profile create",
    collectionPath: "users/user_b",
    operation: "create",
    auth: { uid: "user_a", email_verified: true },
    payload: { uid: "user_b", username: "Spoofer" },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 4,
    name: "Rank inflation on profile create",
    collectionPath: "users/user_a",
    operation: "create",
    auth: { uid: "user_a", email_verified: true },
    payload: { uid: "user_a", rankPoints: 99999, wins: 500 },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 5,
    name: "Resource poisoning with oversized username",
    collectionPath: "users/user_a",
    operation: "create",
    auth: { uid: "user_a", email_verified: true },
    payload: { uid: "user_a", username: "A".repeat(2048) },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 6,
    name: "Cross-user PII read on private/info",
    collectionPath: "users/user_a/private/info",
    operation: "get",
    auth: { uid: "user_b", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 7,
    name: "Unverified email write blocked",
    collectionPath: "users/user_a",
    operation: "create",
    auth: { uid: "user_a", email_verified: false },
    payload: { uid: "user_a", username: "Unverified" },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 8,
    name: "Client-forged createdAt timestamp",
    collectionPath: "users/user_a",
    operation: "create",
    auth: { uid: "user_a", email_verified: true },
    payload: { uid: "user_a", createdAt: "2020-01-01T00:00:00Z" },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 9,
    name: "Terminal state reversal on accepted friend request",
    collectionPath: "friendRequests/req_1",
    operation: "update",
    auth: { uid: "user_b", email_verified: true },
    payload: { status: "pending" },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 10,
    name: "Sender self-accepting outgoing friend request",
    collectionPath: "friendRequests/req_1",
    operation: "update",
    auth: { uid: "user_a", email_verified: true },
    payload: { status: "accepted" },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 11,
    name: "Orphaned friend request to non-existent user",
    collectionPath: "friendRequests/req_orphan",
    operation: "create",
    auth: { uid: "user_a", email_verified: true },
    payload: { fromUid: "user_a", toUid: "nonexistent_user", status: "pending" },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 12,
    name: "Blanket friendRequests list query without uid filter",
    collectionPath: "friendRequests",
    operation: "list",
    auth: { uid: "user_a", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
];
