import { create } from "zustand";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";
import {
  ensureOperatorProfile,
  subscribeFriends,
  subscribeIncomingFriendRequests,
  subscribeRoomInvites,
  type FriendEntry,
  type FriendRequestItem,
  type OperatorProfile,
  type RoomInviteItem,
} from "../services/firebaseService";
import { useSettingsStore } from "./useSettingsStore";

interface AuthStoreState {
  authReady: boolean;
  firebaseUser: User | null;
  profile: OperatorProfile | null;
  friends: FriendEntry[];
  incomingRequests: FriendRequestItem[];
  roomInvites: RoomInviteItem[];
  setProfile: (profile: OperatorProfile | null) => void;
  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  authReady: false,
  firebaseUser: null,
  profile: null,
  friends: [],
  incomingRequests: [],
  roomInvites: [],

  setProfile: (profile) => set({ profile }),

  initAuthListener: () => {
    let unsubFriends: (() => void) | null = null;
    let unsubReqs: (() => void) | null = null;
    let unsubInvites: (() => void) | null = null;

    const cleanupSubs = () => {
      if (unsubFriends) {
        unsubFriends();
        unsubFriends = null;
      }
      if (unsubReqs) {
        unsubReqs();
        unsubReqs = null;
      }
      if (unsubInvites) {
        unsubInvites();
        unsubInvites = null;
      }
    };

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      cleanupSubs();
      if (!user) {
        set({
          authReady: true,
          firebaseUser: null,
          profile: null,
          friends: [],
          incomingRequests: [],
          roomInvites: [],
        });
        return;
      }

      try {
        const settings = useSettingsStore.getState();
        const prof = await ensureOperatorProfile(
          user,
          settings.playerName || user.displayName || undefined,
        );
        settings.setPlayerName(prof.username);
        settings.setSkinId(prof.skinId);

        set({
          authReady: true,
          firebaseUser: user,
          profile: prof,
        });

        unsubFriends = subscribeFriends(user.uid, (friends) => set({ friends }));
        unsubReqs = subscribeIncomingFriendRequests(user.uid, (incomingRequests) =>
          set({ incomingRequests }),
        );
        unsubInvites = subscribeRoomInvites(user.uid, (roomInvites) =>
          set({ roomInvites }),
        );
      } catch (err) {
        console.error("Failed to load operator profile:", err);
        set({ authReady: true, firebaseUser: user });
      }
    });

    return () => {
      cleanupSubs();
      unsubAuth();
    };
  },
}));
