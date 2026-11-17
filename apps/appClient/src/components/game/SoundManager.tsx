import { useEffect } from "react";
import { useGameStore } from "../../stores/useGameStore";
import { soundEngine } from "../../utils/soundEngine";

const SoundManager = () => {
  const channel = useGameStore((state) => state.channel);
  const localId = useGameStore((state) => state.localId);

  useEffect(() => {
    if (!channel || !localId) return;

    const onHitConfirm = (data: { shooterId: string; isHeadshot?: boolean }) => {
      if (data.shooterId === localId) {
        soundEngine.playHitMarker(Boolean(data.isHeadshot));
        useGameStore.getState().triggerHitMarker(Boolean(data.isHeadshot));
      }
    };

    const onKillFeed = (data: { shooterId?: string }) => {
      if (data.shooterId === localId) {
        soundEngine.playKillConfirm();
      }
    };

    const onJumpPad = (data: { playerId: string }) => {
      if (data.playerId === localId) {
        soundEngine.playJumpPad();
      }
    };

    channel.on("hit_confirm", onHitConfirm);
    channel.on("kill_feed", onKillFeed);
    channel.on("jump_pad_vfx", onJumpPad);

    return () => {
      channel.off("hit_confirm", onHitConfirm);
      channel.off("kill_feed", onKillFeed);
      channel.off("jump_pad_vfx", onJumpPad);
    };
  }, [channel, localId]);

  return null;
};

export default SoundManager;
