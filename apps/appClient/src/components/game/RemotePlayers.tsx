import { Suspense, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore, type PlayerState } from "../../stores/useGameStore";
import RemotePlayersUI from "./ui/RemotePlayersUI";
import { CharacterModel3D } from "./CharacterModel3D";

const RemotePlayerItem = ({
  pos,
  lastHitAt,
  lastHitHeadshot,
}: {
  pos: PlayerState;
  lastHitAt: number;
  lastHitHeadshot: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const targetVec = useRef(new THREE.Vector3(pos.x, pos.y, pos.z));

  useFrame((_, delta) => {
    targetVec.current.set(pos.x, pos.y, pos.z);
    if (groupRef.current) {
      groupRef.current.position.lerp(targetVec.current, Math.min(1, delta * 22));
      groupRef.current.rotation.y = pos.yaw || 0;
    }
  });

  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
      <Suspense fallback={null}>
        <CharacterModel3D
          characterId={pos.characterId || "striker"}
          skinId={pos.skinId}
          team={pos.team}
          weaponId={pos.currentWeapon || "assaultRifle"}
          pitch={pos.pitch || 0}
          isMoving={pos.isMoving}
          isSprinting={pos.isSprinting}
          isCrouching={pos.isCrouching}
          isReloading={pos.isReloading}
          isGrounded={pos.isGrounded ?? true}
          isAiming={Boolean(pos.isAiming)}
          moveForward={pos.moveForward ?? 0}
          moveRight={pos.moveRight ?? 0}
          lastShotAt={pos.lastShotTime || 0}
          shield={pos.shield || 0}
          dashUntil={pos.dashUntil || 0}
          lastDoubleJumpAt={pos.lastDoubleJumpAt || 0}
          lastHitAt={lastHitAt}
          lastHitHeadshot={lastHitHeadshot}
        />
      </Suspense>
      <RemotePlayersUI player={pos} />
    </group>
  );
};

const RemotePlayers = () => {
  const players = useGameStore((state) => state.players);
  const localId = useGameStore((state) => state.localId);
  const hitEntities = useGameStore((state) => state.hitEntities);

  return (
    <>
      {Object.entries(players)
        .filter(([id, pos]) => id !== localId && !pos.isDead)
        .map(([id, pos]) => (
          <RemotePlayerItem
            key={id}
            pos={pos}
            lastHitAt={hitEntities[id]?.at || 0}
            lastHitHeadshot={hitEntities[id]?.isHeadshot || false}
          />
        ))}
    </>
  );
};

export default RemotePlayers;
