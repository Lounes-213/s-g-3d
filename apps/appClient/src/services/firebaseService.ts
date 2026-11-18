import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, db, googleProvider } from "../firebase";
import {
  CHARACTERS,
  CHARACTER_SKINS,
  getRankTier,
  type CharacterId,
  type RankTier,
  type SkinId,
} from "@block-shooter/shared";

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface OperatorProfile {
  uid: string;
  username: string;
  characterId: CharacterId;
  skinId: SkinId;
  rankPoints: number;
  rankTier: RankTier;
  kills: number;
  deaths: number;
  wins: number;
  matchesPlayed: number;
  updatedAtMs?: number;
}

export interface FriendEntry {
  ownerUid: string;
  friendUid: string;
  friendUsername: string;
}

export interface FriendRequestItem {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: "pending" | "accepted" | "declined";
}

export interface RoomInviteItem {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  roomId: string;
  roomName: string;
  mapId: string;
  mode: string;
  status: "active" | "dismissed";
}

// Sanitize username strictly to blueprint regex ^[a-zA-Z0-9_\- ]+$ length 2..20
export function sanitizeUsername(raw: string | null | undefined, fallback = "Operator"): string {
  const cleaned = (raw || "")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .slice(0, 20);
  if (cleaned.length >= 2) return cleaned;
  return fallback.slice(0, 20);
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

export async function signInOperator(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutOperator(): Promise<void> {
  await signOut(auth);
}

export async function ensureOperatorProfile(
  user: User,
  preferredName?: string,
  preferredChar: CharacterId = "striker",
  preferredSkin: SkinId = "urban_ops",
): Promise<OperatorProfile> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  let profile: OperatorProfile | null = null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      profile = snap.data() as OperatorProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (!profile) {
    const safeName = sanitizeUsername(preferredName || user.displayName, `Op_${uid.slice(0, 6)}`);
    const charId: CharacterId = CHARACTERS[preferredChar] ? preferredChar : "striker";
    const skinId: SkinId = CHARACTER_SKINS[preferredSkin] ? preferredSkin : "urban_ops";

    const newProfile: OperatorProfile = {
      uid,
      username: safeName,
      characterId: charId,
      skinId,
      rankPoints: 1000,
      rankTier: "Silver",
      kills: 0,
      deaths: 0,
      wins: 0,
      matchesPlayed: 0,
    };

    try {
      await setDoc(doc(db, "users", uid), {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, userPath);
    }

    try {
      await setDoc(doc(db, "users", uid, "private", "info"), {
        uid,
        email: (user.email || "verified@operator.local").slice(0, 160),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, privatePath);
    }

    return { ...newProfile, updatedAtMs: Date.now() };
  }

  try {
    await updateDoc(doc(db, "users", uid), {
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal if timestamp refresh fails offline
  }

  return { ...profile, updatedAtMs: Date.now() };
}

export async function updateOperatorIdentity(
  uid: string,
  username: string,
  characterId: CharacterId,
  skinId: SkinId,
): Promise<OperatorProfile> {
  const safeName = sanitizeUsername(username, "Operator");
  const safeChar: CharacterId = CHARACTERS[characterId] ? characterId : "striker";
  const safeSkin: SkinId = CHARACTER_SKINS[skinId] ? skinId : "urban_ops";
  const path = `users/${uid}`;

  try {
    await updateDoc(doc(db, "users", uid), {
      username: safeName,
      characterId: safeChar,
      skinId: safeSkin,
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(doc(db, "users", uid));
    return updated.data() as OperatorProfile;
  } catch (err) {
    return handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function recordMatchStats(
  uid: string,
  deltaKills: number,
  deltaDeaths: number,
  didWin: boolean,
): Promise<OperatorProfile | null> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const cur = snap.data() as OperatorProfile;
    const clampedK = Math.max(0, Math.min(80, Math.round(deltaKills)));
    const clampedD = Math.max(0, Math.min(80, Math.round(deltaDeaths)));
    const rawDelta = clampedK * 5 - clampedD * 2 + (didWin ? 35 : 5);
    const boundedDelta = Math.max(-80, Math.min(120, rawDelta));
    const nextPoints = Math.max(0, Math.min(100000, cur.rankPoints + boundedDelta));
    const nextTier = getRankTier(nextPoints);

    await updateDoc(ref, {
      kills: cur.kills + clampedK,
      deaths: cur.deaths + clampedD,
      wins: cur.wins + (didWin ? 1 : 0),
      matchesPlayed: cur.matchesPlayed + 1,
      rankPoints: nextPoints,
      rankTier: nextTier,
      updatedAt: serverTimestamp(),
    });

    const refreshed = await getDoc(ref);
    return refreshed.data() as OperatorProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fetchGlobalLeaderboard(limitCount = 100): Promise<OperatorProfile[]> {
  const path = "users";
  try {
    const q = query(
      collection(db, "users"),
      where("rankPoints", ">=", 0),
      orderBy("rankPoints", "desc"),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as OperatorProfile & {
        updatedAt?: { toMillis?: () => number };
        createdAt?: { toMillis?: () => number };
      };
      const updatedAtMs =
        data.updatedAt?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? undefined;
      return {
        ...data,
        updatedAtMs,
      };
    });
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function searchOperatorByUsername(
  usernameQuery: string,
): Promise<OperatorProfile | null> {
  const clean = sanitizeUsername(usernameQuery, "");
  if (clean.length < 2) return null;
  const path = "users";
  try {
    const q = query(
      collection(db, "users"),
      where("rankPoints", ">=", 0),
      where("username", "==", clean),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as OperatorProfile;
  } catch (err) {
    return handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function sendFriendRequest(
  fromProfile: OperatorProfile,
  targetProfile: OperatorProfile,
): Promise<void> {
  if (fromProfile.uid === targetProfile.uid) return;
  const reqId = sanitizeId(`fr_${fromProfile.uid}_${targetProfile.uid}`);
  const path = `friendRequests/${reqId}`;
  try {
    await setDoc(doc(db, "friendRequests", reqId), {
      fromUid: fromProfile.uid,
      fromUsername: sanitizeUsername(fromProfile.username),
      toUid: targetProfile.uid,
      toUsername: sanitizeUsername(targetProfile.username),
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function acceptFriendRequest(req: FriendRequestItem): Promise<void> {
  const batch = writeBatch(db);
  const reqRef = doc(db, "friendRequests", req.id);
  const myFriendRef = doc(db, "users", req.toUid, "friends", req.fromUid);
  const senderFriendRef = doc(db, "users", req.fromUid, "friends", req.toUid);

  batch.update(reqRef, {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });
  batch.set(myFriendRef, {
    ownerUid: req.toUid,
    friendUid: req.fromUid,
    friendUsername: sanitizeUsername(req.fromUsername),
    requestId: req.id,
    createdAt: serverTimestamp(),
  });
  batch.set(senderFriendRef, {
    ownerUid: req.fromUid,
    friendUid: req.toUid,
    friendUsername: sanitizeUsername(req.toUsername),
    requestId: req.id,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `friendRequests/${req.id}`);
  }
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const path = `friendRequests/${requestId}`;
  try {
    await updateDoc(doc(db, "friendRequests", requestId), {
      status: "declined",
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const path = `users/${myUid}/friends/${friendUid}`;
  try {
    await deleteDoc(doc(db, "users", myUid, "friends", friendUid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function sendRoomInvite(opts: {
  fromUid: string;
  fromUsername: string;
  toUid: string;
  roomId: string;
  roomName: string;
  mapId: string;
  mode: string;
}): Promise<void> {
  const inviteId = sanitizeId(`inv_${opts.fromUid}_${opts.toUid}_${Date.now()}`);
  const path = `roomInvites/${inviteId}`;
  try {
    await setDoc(doc(db, "roomInvites", inviteId), {
      fromUid: opts.fromUid,
      fromUsername: sanitizeUsername(opts.fromUsername),
      toUid: opts.toUid,
      roomId: opts.roomId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "PUBLIC-01",
      roomName: opts.roomName.slice(0, 40) || "S-G-3D Room",
      mapId: opts.mapId.slice(0, 24),
      mode: opts.mode.slice(0, 24),
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function dismissRoomInvite(inviteId: string): Promise<void> {
  const path = `roomInvites/${inviteId}`;
  try {
    await updateDoc(doc(db, "roomInvites", inviteId), {
      status: "dismissed",
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeIncomingFriendRequests(
  uid: string,
  cb: (items: FriendRequestItem[]) => void,
): Unsubscribe {
  const path = "friendRequests";
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequestItem, "id">) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path),
  );
}

export function subscribeFriends(
  uid: string,
  cb: (items: FriendEntry[]) => void,
): Unsubscribe {
  const path = `users/${uid}/friends`;
  const q = query(
    collection(db, "users", uid, "friends"),
    where("ownerUid", "==", uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data() as FriendEntry));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path),
  );
}

export function subscribeRoomInvites(
  uid: string,
  cb: (items: RoomInviteItem[]) => void,
): Unsubscribe {
  const path = "roomInvites";
  const q = query(
    collection(db, "roomInvites"),
    where("toUid", "==", uid),
    where("status", "==", "active"),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomInviteItem, "id">) })));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path),
  );
}
