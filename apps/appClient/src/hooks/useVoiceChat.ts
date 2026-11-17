import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useGameStore } from "../stores/useGameStore";
import { useSettingsStore } from "../stores/useSettingsStore";

interface VoiceStoreState {
  micEnabled: boolean;
  isTalking: boolean;
  voiceError: string | null;
  setMicEnabled: (enabled: boolean) => void;
  setIsTalking: (talking: boolean) => void;
  setVoiceError: (err: string | null) => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  micEnabled: false,
  isTalking: false,
  voiceError: null,
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  setIsTalking: (isTalking) => set({ isTalking }),
  setVoiceError: (voiceError) => set({ voiceError }),
}));

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useVoiceChat() {
  const channel = useGameStore((s) => s.channel);
  const localId = useGameStore((s) => s.localId);
  const playMode = useGameStore((s) => s.sessionConfig.playMode);
  const micEnabled = useVoiceStore((s) => s.micEnabled);
  const voicePttMode = useSettingsStore((s) => s.voicePttMode);
  const pushToTalkKey = useSettingsStore((s) => s.keybindings.pushToTalk);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pttHeldRef = useRef(false);

  // Cleanup helper
  const closeAllPeers = () => {
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // ignore
      }
    });
    peersRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.srcObject = null;
      } catch {
        // ignore
      }
    });
    audioElementsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  };

  // Push-to-talk key listener
  useEffect(() => {
    if (!micEnabled || !voicePttMode) return;

    const updateTrackState = (active: boolean) => {
      pttHeldRef.current = active;
      useVoiceStore.getState().setIsTalking(active);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = active;
        });
      }
      if (channel && localId) {
        channel.emit("voice_speaking", { speaking: active });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === pushToTalkKey && !e.repeat) {
        updateTrackState(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === pushToTalkKey) {
        updateTrackState(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [micEnabled, voicePttMode, pushToTalkKey, channel, localId]);

  useEffect(() => {
    if (playMode === "solo" || !channel || !localId || !micEnabled) {
      closeAllPeers();
      useVoiceStore.getState().setIsTalking(false);
      return;
    }

    let cancelled = false;

    const createPeer = (peerId: string, initiator: boolean): RTCPeerConnection => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      peersRef.current.set(peerId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          if (localStreamRef.current) pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.emit("voice_ice", { to: peerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        let audio = audioElementsRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioElementsRef.current.set(peerId, audio);
        }
        audio.srcObject = event.streams[0] || new MediaStream([event.track]);
        audio.play().catch(() => {});
      };

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription) {
              channel.emit("voice_offer", {
                to: peerId,
                offer: pc.localDescription,
              });
            }
          })
          .catch(() => {});
      }

      return pc;
    };

    const startVoice = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          useVoiceStore.getState().setVoiceError("Mic unavailable in browser");
          useVoiceStore.getState().setMicEnabled(false);
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        const activeNow = !voicePttMode || pttHeldRef.current;
        stream.getAudioTracks().forEach((t) => {
          t.enabled = activeNow;
        });
        useVoiceStore.getState().setVoiceError(null);
        useVoiceStore.getState().setIsTalking(activeNow);

        channel.emit("voice_join");
        if (activeNow) {
          channel.emit("voice_speaking", { speaking: true });
        }
      } catch {
        useVoiceStore.getState().setVoiceError("Microphone permission denied");
        useVoiceStore.getState().setMicEnabled(false);
      }
    };

    const onVoiceJoin = ({ peerId }: { peerId: string }) => {
      if (!peerId || peerId === localId) return;
      createPeer(peerId, true);
    };

    const onVoiceLeave = ({ peerId }: { peerId: string }) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(peerId);
      }
      const audio = audioElementsRef.current.get(peerId);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audioElementsRef.current.delete(peerId);
      }
      useGameStore.getState().setSpeakingPeer(peerId, false);
    };

    const onVoiceOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      if (!from || from === localId) return;
      try {
        const pc = createPeer(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pc.localDescription) {
          channel.emit("voice_answer", { to: from, answer: pc.localDescription });
        }
      } catch {
        // ignore negotiation mismatch
      }
    };

    const onVoiceAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch {
        // ignore
      }
    };

    const onVoiceIce = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore
      }
    };

    const onVoiceSpeaking = ({
      peerId,
      speaking,
    }: {
      peerId: string;
      speaking: boolean;
    }) => {
      if (peerId) useGameStore.getState().setSpeakingPeer(peerId, speaking);
    };

    channel.on("voice_join", onVoiceJoin);
    channel.on("voice_leave", onVoiceLeave);
    channel.on("voice_offer", onVoiceOffer);
    channel.on("voice_answer", onVoiceAnswer);
    channel.on("voice_ice", onVoiceIce);
    channel.on("voice_speaking", onVoiceSpeaking);

    void startVoice();

    return () => {
      cancelled = true;
      channel.off("voice_join", onVoiceJoin);
      channel.off("voice_leave", onVoiceLeave);
      channel.off("voice_offer", onVoiceOffer);
      channel.off("voice_answer", onVoiceAnswer);
      channel.off("voice_ice", onVoiceIce);
      channel.off("voice_speaking", onVoiceSpeaking);
      channel.emit("voice_speaking", { speaking: false });
      channel.emit("voice_leave");
      closeAllPeers();
    };
  }, [channel, localId, playMode, micEnabled, voicePttMode]);
}
