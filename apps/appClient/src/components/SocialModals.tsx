import { useEffect, useState } from "react";
import {
  CHARACTERS,
  CHARACTER_ORDER,
  CHARACTER_SKINS,
  SKIN_ORDER,
  type CharacterId,
  type SkinId,
} from "@block-shooter/shared";
import {
  Check,
  Crown,
  LogIn,
  LogOut,
  Search,
  Send,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../stores/useAuthStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import {
  acceptFriendRequest,
  declineFriendRequest,
  dismissRoomInvite,
  fetchGlobalLeaderboard,
  removeFriend,
  searchOperatorByUsername,
  sendFriendRequest,
  sendRoomInvite,
  signInOperator,
  signOutOperator,
  updateOperatorIdentity,
  type OperatorProfile,
} from "../services/firebaseService";
import { soundEngine } from "../utils/soundEngine";
import { OperatorAvatar } from "./OperatorAvatar";

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { firebaseUser, profile, setProfile } = useAuthStore();
  const theme = useSettingsStore((s) => s.theme);
  const setPlayerName = useSettingsStore((s) => s.setPlayerName);
  const setSkinId = useSettingsStore((s) => s.setSkinId);

  const [username, setUsername] = useState(profile?.username || "Operator-01");
  const [charId, setCharId] = useState<CharacterId>(profile?.characterId || "striker");
  const [skinId, setLocalSkinId] = useState<SkinId>(profile?.skinId || "urban_ops");
  const [busy, setBusy] = useState(false);

  const isLight = theme === "light";

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInOperator();
      toast.success("Signed in to S-G-3D Command Account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const updated = await updateOperatorIdentity(profile.uid, username, charId, skinId);
      setProfile(updated);
      setPlayerName(updated.username);
      setSkinId(updated.skinId);
      toast.success("Operator identity saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setBusy(false);
    }
  };

  const kd = profile ? (profile.kills / Math.max(1, profile.deaths)).toFixed(2) : "0.00";

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 p-4 font-tactical">
      <div
        className={`w-full max-w-lg border p-6 shadow-2xl ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-950 border-white/20 text-white"
        }`}
      >
        <div className="flex items-center justify-between border-b border-current/10 pb-3 mb-4">
          <h2 className="text-lg font-black uppercase tracking-widest">
            Operator Account & Rank
          </h2>
          <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {!firebaseUser || !profile ? (
          <div className="space-y-4 text-center py-6">
            <p className="text-sm opacity-80">
              Sign in with Google to save your permanent Rank, Leaderboard score, Friends list,
              and Private Room invites.
            </p>
            <button
              onClick={handleSignIn}
              disabled={busy}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={18} />
              <span>{busy ? "Signing In..." : "Sign In With Google"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Gmail Profile Identity */}
            <div
              className={`p-3 border flex items-center gap-3 ${
                isLight ? "bg-sky-50/70 border-sky-200" : "bg-sky-500/10 border-sky-400/30"
              }`}
            >
              <OperatorAvatar
                photoURL={firebaseUser.photoURL}
                name={profile.username || firebaseUser.displayName}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black uppercase truncate">
                  {profile.username}
                </div>
                <div className="text-[11px] opacity-75 truncate">
                  {firebaseUser.email || firebaseUser.displayName || "Google Verified"}
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black uppercase">
                Verified
              </span>
            </div>

            {/* Persistent Rank Card */}
            <div
              className={`p-4 border grid grid-cols-4 gap-2 text-center ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10"
              }`}
            >
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">Tier</div>
                <div className="text-sm font-black text-amber-500 uppercase">{profile.rankTier}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">Points</div>
                <div className="text-sm font-black text-sky-500">{profile.rankPoints}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">K/D</div>
                <div className="text-sm font-black">{kd}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase opacity-60">Wins</div>
                <div className="text-sm font-black text-emerald-500">{profile.wins}</div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                Callsign (2-20 chars)
              </label>
              <input
                type="text"
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-3 py-2 border text-sm font-bold outline-none ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900"
                    : "bg-slate-900 border-white/15 text-white"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                  Default Operator
                </label>
                <select
                  value={charId}
                  onChange={(e) => setCharId(e.target.value as CharacterId)}
                  className={`w-full px-3 py-2 border text-xs font-bold uppercase ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-slate-900 border-white/15 text-white"
                  }`}
                >
                  {CHARACTER_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CHARACTERS[c].codename}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                  Default Skin
                </label>
                <select
                  value={skinId}
                  onChange={(e) => setLocalSkinId(e.target.value as SkinId)}
                  className={`w-full px-3 py-2 border text-xs font-bold uppercase ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-slate-900 border-white/15 text-white"
                  }`}
                >
                  {SKIN_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {CHARACTER_SKINS[s].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-widest cursor-pointer"
              >
                {busy ? "Saving..." : "Save Operator Profile"}
              </button>
              <button
                onClick={() => {
                  void signOutOperator();
                  onClose();
                }}
                className="px-4 py-2.5 border border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const theme = useSettingsStore((s) => s.theme);
  const myUid = useAuthStore((s) => s.profile?.uid);
  const [rows, setRows] = useState<OperatorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = theme === "light";

  useEffect(() => {
    let active = true;
    fetchGlobalLeaderboard()
      .then((list) => {
        if (active) setRows(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 p-4 font-tactical">
      <div
        className={`w-full max-w-2xl border p-6 shadow-2xl max-h-[85vh] flex flex-col ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-950 border-white/20 text-white"
        }`}
      >
        <div className="flex items-center justify-between border-b border-current/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="text-lg font-black uppercase tracking-widest">
              Global Ranked Leaderboard
            </h2>
          </div>
          <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold uppercase opacity-60">
              Loading Global Standings...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold uppercase opacity-60">
              No ranked operators recorded yet. Play a match to claim #1!
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="uppercase opacity-60 border-b border-current/10">
                <tr>
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Operator</th>
                  <th className="py-2 px-2">Tier</th>
                  <th className="py-2 px-2 text-right">Kills</th>
                  <th className="py-2 px-2 text-right">Wins</th>
                  <th className="py-2 px-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.uid}
                    className={`border-b border-current/5 ${
                      r.uid === myUid ? "bg-sky-500/15 font-black" : ""
                    }`}
                  >
                    <td className="py-2.5 px-2 font-black">
                      {i === 0 ? <Crown size={14} className="text-amber-500 inline" /> : i + 1}
                    </td>
                    <td className="py-2.5 px-2 font-bold">{r.username}</td>
                    <td className="py-2.5 px-2 uppercase text-amber-500 font-bold">
                      {r.rankTier}
                    </td>
                    <td className="py-2.5 px-2 text-right">{r.kills}</td>
                    <td className="py-2.5 px-2 text-right text-emerald-500">{r.wins}</td>
                    <td className="py-2.5 px-2 text-right font-black text-sky-500">
                      {r.rankPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function FriendsModal({
  onClose,
  onJoinInvite,
  currentRoomId,
  currentRoomName,
  currentMapId,
  currentMode,
}: {
  onClose: () => void;
  onJoinInvite: (roomId: string) => void;
  currentRoomId: string;
  currentRoomName: string;
  currentMapId: string;
  currentMode: string;
}) {
  const { profile, friends, incomingRequests, roomInvites } = useAuthStore();
  const theme = useSettingsStore((s) => s.theme);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<OperatorProfile | null>(null);
  const [searching, setSearching] = useState(false);

  const isLight = theme === "light";

  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) return;
    setSearching(true);
    try {
      const found = await searchOperatorByUsername(searchTerm.trim());
      setSearchResult(found);
      if (!found) toast.error("No operator found with that exact callsign");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/60 p-4 font-tactical">
      <div
        className={`w-full max-w-xl border p-6 shadow-2xl max-h-[85vh] flex flex-col gap-4 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900"
            : "bg-slate-950 border-white/20 text-white"
        }`}
      >
        <div className="flex items-center justify-between border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-sky-500" />
            <h2 className="text-lg font-black uppercase tracking-widest">
              Squad Friends & Room Invites
            </h2>
          </div>
          <button onClick={onClose} className="p-1 opacity-70 hover:opacity-100 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {!profile ? (
          <div className="py-8 text-center text-sm opacity-75">
            Sign in via the Account button to add friends and send private room invites.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5">
            {/* Incoming Room Invites */}
            {roomInvites.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  Incoming Room Invites
                </div>
                {roomInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 border border-amber-500/40 bg-amber-500/10 text-xs"
                  >
                    <div>
                      <span className="font-black">{inv.fromUsername}</span> invited you to{" "}
                      <span className="font-bold text-sky-500">[{inv.roomId}]</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          soundEngine.playClick();
                          void dismissRoomInvite(inv.id);
                          onClose();
                          onJoinInvite(inv.roomId);
                        }}
                        className="px-3 py-1 bg-emerald-600 text-white font-black uppercase cursor-pointer"
                      >
                        Join
                      </button>
                      <button
                        onClick={() => void dismissRoomInvite(inv.id)}
                        className="px-2 py-1 border border-current/20 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Incoming Friend Requests */}
            {incomingRequests.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-sky-500">
                  Pending Friend Requests
                </div>
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center justify-between p-2.5 border text-xs ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10"
                    }`}
                  >
                    <span className="font-bold">{req.fromUsername}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => void acceptFriendRequest(req)}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-black uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={12} /> Accept
                      </button>
                      <button
                        onClick={() => void declineFriendRequest(req.id)}
                        className="px-2.5 py-1 border border-red-500/40 text-red-500 font-black uppercase cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Friend Search */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Add Operator by Callsign
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Exact callsign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`flex-1 px-3 py-2 border text-xs font-bold outline-none ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-slate-900 border-white/15 text-white"
                  }`}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-sky-600 text-white text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Search size={14} /> Search
                </button>
              </div>
              {searchResult && searchResult.uid !== profile.uid && (
                <div
                  className={`flex items-center justify-between p-2.5 border text-xs ${
                    isLight ? "bg-sky-50 border-sky-200" : "bg-sky-500/10 border-sky-400/30"
                  }`}
                >
                  <div>
                    <span className="font-black">{searchResult.username}</span>{" "}
                    <span className="opacity-70">({searchResult.rankTier})</span>
                  </div>
                  <button
                    onClick={() => {
                      void sendFriendRequest(profile, searchResult).then(() => {
                        toast.success(`Request sent to ${searchResult.username}`);
                        setSearchResult(null);
                      });
                    }}
                    className="px-3 py-1 bg-sky-600 text-white font-black uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={12} /> Add Friend
                  </button>
                </div>
              )}
            </div>

            {/* Friends List */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Friends ({friends.length})
              </div>
              {friends.length === 0 ? (
                <div className="text-xs opacity-60 py-4 text-center">
                  No squad friends added yet.
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.friendUid}
                    className={`flex items-center justify-between p-2.5 border text-xs ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-white/10"
                    }`}
                  >
                    <span className="font-bold">{f.friendUsername}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          void sendRoomInvite({
                            fromUid: profile.uid,
                            fromUsername: profile.username,
                            toUid: f.friendUid,
                            roomId: currentRoomId,
                            roomName: currentRoomName,
                            mapId: currentMapId,
                            mode: currentMode,
                          }).then(() => toast.success(`Invited ${f.friendUsername} to ${currentRoomId}`));
                        }}
                        className="px-2.5 py-1 bg-purple-600 text-white font-black uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Send size={12} /> Invite
                      </button>
                      <button
                        onClick={() => void removeFriend(profile.uid, f.friendUid)}
                        className="p-1.5 border border-red-500/30 text-red-500 cursor-pointer"
                        title="Remove friend"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
