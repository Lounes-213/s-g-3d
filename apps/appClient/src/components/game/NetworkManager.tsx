import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useGameStore, type PublicRoomSummary, type RealtimeChannel } from "../../stores/useGameStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { recordMatchStats } from "../../services/firebaseService";
import { soloEngine } from "../../utils/soloEngine";
import { arenaPhysics } from "../../utils/cannonPhysics";
import { createServerlessRoomChannel } from "../../utils/serverlessRoomSync";
import { recordMatchHistory } from "../../utils/matchHistory";
import { soundEngine } from "../../utils/soundEngine";

const NetworkManager = () => {
  const sessionConfig = useGameStore((state) => state.sessionConfig);
  const setChannel = useGameStore((state) => state.setChannel);
  const setLocalId = useGameStore((state) => state.setLocalId);
  const setIsConnected = useGameStore((state) => state.setIsConnected);
  const setPing = useGameStore((state) => state.setPing);
  const recordedMatchEndRef = useRef(false);

  useEffect(() => {
    const store = useGameStore.getState();
    store.resetMatchStore();
    recordedMatchEndRef.current = false;

    // SOLO OFFLINE MODE
    if (sessionConfig.playMode === "solo") {
      setChannel(null);
      soloEngine.start({
        mapId: sessionConfig.mapId,
        mode: sessionConfig.mode,
        botCount: sessionConfig.botCount,
        playerName: sessionConfig.playerName,
        characterId: sessionConfig.characterId,
        skinId: sessionConfig.skinId,
        weaponId: sessionConfig.weaponId,
      });

      return () => {
        soloEngine.stop();
      };
    }

    // ONLINE / PRIVATE ROOM MODE (Socket.IO with fast automatic Serverless Firestore + BroadcastChannel fallback)
    let disposed = false;
    let activeChannel: RealtimeChannel | null = null;
    let pingInterval: number | null = null;
    let fallbackTimer: number | null = null;
    let switchedToServerless = false;

    const bindChannelListeners = (chan: RealtimeChannel) => {
      chan.on(
        "room_joined",
        (info: {
          roomId: string;
          roomName: string;
          mapId: typeof sessionConfig.mapId;
          mode: typeof sessionConfig.mode;
        }) => {
          useGameStore.getState().updateMatchData({
            roomId: info.roomId,
            roomName: info.roomName,
            mapId: info.mapId,
            mode: info.mode,
          });
        },
      );

      chan.on("room_error", (err: { message: string }) => {
        useGameStore.getState().setRoomError(err.message);
      });

      chan.on("rooms_list", (rooms: PublicRoomSummary[]) => {
        useGameStore.getState().setAvailableRooms(rooms);
      });

      chan.on(
        "hit_confirm",
        (data: { shooterId?: string; isHeadshot?: boolean; killed?: boolean }) => {
          const st = useGameStore.getState();
          if (data?.shooterId && st.localId && data.shooterId !== st.localId) return;
          const hs = Boolean(data?.isHeadshot);
          soundEngine.playHitMarker(hs);
          st.triggerHitMarker(hs);
          if (data?.killed) {
            soundEngine.playKillConfirm();
            st.registerLocalKill(hs);
          }
        },
      );

      chan.on("state", (data: Record<string, unknown>) => {
        const { players, ...matchInfo } = data as {
          players?: Record<string, (typeof useGameStore.getState extends () => infer S ? S : never)["players"][string]>;
          matchState?: string;
          mode?: string;
          teamScores?: { red?: number; blue?: number };
        };
        const st = useGameStore.getState();

        const oldMe = st.localId ? st.players[st.localId] : null;
        const newMe = st.localId && players ? players[st.localId] : null;
        if (oldMe && newMe && newMe.health < oldMe.health) {
          st.triggerDamageFlash();
        }

        st.setServerSnapshot(
          players || {},
          matchInfo as Partial<ReturnType<typeof useGameStore.getState>>,
        );

        if (matchInfo.matchState === "playing") {
          recordedMatchEndRef.current = false;
        } else if (
          matchInfo.matchState === "ended" &&
          !recordedMatchEndRef.current &&
          newMe
        ) {
          recordedMatchEndRef.current = true;
          const allList = Object.values(players || {});
          const topKills = Math.max(...allList.map((p) => p.kills), 0);
          const mvpPlayer = [...allList].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)[0];
          const effectiveMode = (matchInfo.mode || st.mode) as typeof st.mode;
          const redScore = matchInfo.teamScores?.red ?? st.teamScores.red ?? 0;
          const blueScore = matchInfo.teamScores?.blue ?? st.teamScores.blue ?? 0;
          const didWin =
            effectiveMode === "br"
              ? !newMe.isDead
              : effectiveMode === "ffa"
                ? newMe.kills >= topKills && newMe.kills > 0
                : newMe.team === "red"
                  ? redScore >= blueScore
                  : blueScore >= redScore;

          const scoreText =
            effectiveMode === "tdm" || effectiveMode === "domination"
              ? `BLUE ${blueScore} - ${redScore} RED`
              : `${newMe.kills || 0} KILLS`;

          recordMatchHistory({
            playMode: sessionConfig.playMode,
            mode: effectiveMode,
            mapId: st.mapId,
            roomName: st.roomName || sessionConfig.roomName || "Online Arena",
            playerName: newMe.name,
            kills: newMe.kills || 0,
            deaths: newMe.deaths || 0,
            didWin,
            mvpName: mvpPlayer?.name || newMe.name,
            mvpKills: mvpPlayer?.kills ?? (newMe.kills || 0),
            scoreText,
          });

          const authState = useAuthStore.getState();
          if (authState.profile) {
            void recordMatchStats(
              authState.profile.uid,
              newMe.kills || 0,
              newMe.deaths || 0,
              didWin,
            ).then((updated) => {
              if (updated) authState.setProfile(updated);
            });
          }
        }
      });

      chan.on("kill_feed", (data: Record<string, unknown>) => {
        useGameStore.getState().addKillEvent({
          ...(data as unknown as Parameters<ReturnType<typeof useGameStore.getState>["addKillEvent"]>[0]),
          timestamp: Date.now(),
        });
      });

      chan.on(
        "shot_vfx",
        (data: {
          shooterId?: string;
          weaponId?: string;
          from: { x: number; y: number; z: number };
          to: { x: number; y: number; z: number };
          color?: string;
          hitSurface?: boolean;
        }) => {
          const st = useGameStore.getState();
          const from: [number, number, number] = [data.from.x, data.from.y, data.from.z];
          const to: [number, number, number] = [data.to.x, data.to.y, data.to.z];

          st.addTracer({
            id: Math.random().toString(36).slice(2),
            from,
            to,
            color: data.color || "#38bdf8",
            createdAt: Date.now(),
            hitSurface: Boolean(data.hitSurface),
          });

          st.addMuzzleFlash({
            id: Math.random().toString(36).slice(2),
            x: data.from.x,
            y: data.from.y,
            z: data.from.z,
            color: data.color || "#fbbf24",
            createdAt: Date.now(),
          });

          if (data.shooterId && data.shooterId !== st.localId) {
            const me = st.localId ? st.players[st.localId] : null;
            if (me) {
              const dist = Math.hypot(
                data.from.x - me.x,
                data.from.y - me.y,
                data.from.z - me.z,
              );
              soundEngine.playSpatialWeaponFire(
                (data.weaponId as "assaultRifle") || "assaultRifle",
                dist,
              );
            }
          }
        },
      );

      chan.on(
        "player_damaged",
        (data: {
          targetId: string;
          shooterId?: string;
          attackerX?: number;
          attackerZ?: number;
          x: number;
          y: number;
          z: number;
          damage: number;
          isHeadshot?: boolean;
          distanceMeters?: number;
          killed?: boolean;
        }) => {
          useGameStore.getState().markEntityHit(data.targetId, {
            x: data.x,
            y: data.y,
            z: data.z,
            amount: data.damage,
            isHeadshot: Boolean(data.isHeadshot),
            shooterId: data.shooterId,
            attackerX: data.attackerX,
            attackerZ: data.attackerZ,
            distanceMeters: data.distanceMeters,
            killed: Boolean(data.killed),
          });
        },
      );

      chan.on(
        "explosion_vfx",
        (data: { x: number; y: number; z: number; radius?: number; color?: string }) => {
          soundEngine.playExplosion();
          arenaPhysics.applyExplosionImpulse(
            data.x,
            data.y,
            data.z,
            data.radius || 7.5,
            220,
          );
          useGameStore.getState().addExplosion({
            id: Math.random().toString(36).slice(2),
            x: data.x,
            y: data.y,
            z: data.z,
            radius: data.radius || 7.5,
            color: data.color || "#f97316",
            createdAt: Date.now(),
          });
        },
      );

      chan.on(
        "jump_pad_vfx",
        (data: { playerId?: string; padId?: string; boostY?: number }) => {
          const st = useGameStore.getState();
          if (data?.playerId === st.localId) {
            soundEngine.playJumpPad();
            window.dispatchEvent(
              new CustomEvent("local-jump-pad", {
                detail: { boostY: data.boostY ?? 28 },
              }),
            );
          }
        },
      );
    };

    const serverUrl =
      (import.meta.env.VITE_SERVER_URL as string)?.trim() ||
      (typeof window !== "undefined" && (window as unknown as { __SG3D_SERVER_URL__?: string }).__SG3D_SERVER_URL__) ||
      "";

    const socket = serverUrl
      ? io(serverUrl, {
          transports: ["websocket", "polling"],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 8,
          reconnectionDelay: 1000,
        })
      : io({
          transports: ["websocket", "polling"],
          timeout: 1100,
          reconnection: false,
        });

    const startServerlessFallback = () => {
      if (disposed || switchedToServerless) return;
      switchedToServerless = true;
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
      useGameStore.getState().setRoomError(null);

      const serverlessChan = createServerlessRoomChannel({
        sessionConfig,
        onPingMeasured: (ms) => setPing(ms),
        onConnected: (uid) => {
          if (disposed) return;
          setLocalId(uid);
          setChannel(serverlessChan);
          setIsConnected(true);
        },
        onDisconnected: () => {
          if (!disposed) setIsConnected(false);
        },
      });
      activeChannel = serverlessChan;
      bindChannelListeners(serverlessChan);
    };

    if (!serverUrl) {
      fallbackTimer = window.setTimeout(startServerlessFallback, 1200);
      socket.on("connect_error", () => {
        startServerlessFallback();
      });
    } else {
      socket.on("connect_error", (err) => {
        console.warn("Dedicated game server connection error:", err.message);
      });
    }

    socket.on("connect", () => {
      if (disposed || switchedToServerless) {
        socket.disconnect();
        return;
      }
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      activeChannel = socket;
      setIsConnected(true);
      useGameStore.getState().setRoomError(null);

      if (socket.id) {
        setLocalId(socket.id);
        setChannel(socket);
      }

      bindChannelListeners(socket);

      if (sessionConfig.playMode === "room" && sessionConfig.roomAction === "create") {
        socket.emit("create_room", {
          roomName: sessionConfig.roomName || `${sessionConfig.playerName}'s Room`,
          mapId: sessionConfig.mapId,
          mode: sessionConfig.mode,
          isPrivate: sessionConfig.isPrivate ?? false,
          maxPlayers: sessionConfig.maxPlayers,
          botCount: sessionConfig.botCount,
          playerName: sessionConfig.playerName,
          characterId: sessionConfig.characterId,
          skinId: sessionConfig.skinId,
          weaponId: sessionConfig.weaponId,
          preferredTeam: sessionConfig.preferredTeam || "auto",
        });
      } else {
        socket.emit("join_room", {
          roomId:
            sessionConfig.playMode === "room"
              ? sessionConfig.roomId || "PUBLIC-01"
              : "PUBLIC-01",
          playerName: sessionConfig.playerName,
          characterId: sessionConfig.characterId,
          skinId: sessionConfig.skinId,
          weaponId: sessionConfig.weaponId,
          preferredTeam: sessionConfig.preferredTeam || "auto",
        });
      }

      pingInterval = window.setInterval(() => {
        if (socket.connected) {
          const start = Date.now();
          socket.emit("ping", () => {
            setPing(Date.now() - start);
          });
        }
      }, 1500);
    });

    socket.on("disconnect", () => {
      if (!switchedToServerless) {
        setIsConnected(false);
      }
    });

    return () => {
      disposed = true;
      if (fallbackTimer !== null) clearTimeout(fallbackTimer);
      if (pingInterval !== null) clearInterval(pingInterval);
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
      try {
        if (activeChannel && activeChannel !== socket) {
          activeChannel.disconnect?.();
        }
      } catch {
        // ignore
      }
      setChannel(null);
      setIsConnected(false);
    };
  }, [sessionConfig, setChannel, setIsConnected, setLocalId, setPing]);

  return null;
};

export default NetworkManager;
