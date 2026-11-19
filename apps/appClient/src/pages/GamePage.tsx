import PrimaryCanvas from "../components/game/PrimaryCanvas";
import { MobileHudEditorModal } from "../components/game/ui/MobileHudEditorModal";
import { useGameStore } from "../stores/useGameStore";

const GamePage = () => {
  const isMobileHudEditorOpen = useGameStore((s) => s.isMobileHudEditorOpen);
  const setMobileHudEditorOpen = useGameStore((s) => s.setMobileHudEditorOpen);

  return (
    <main id="main-content" className="w-full h-dvh overflow-hidden bg-[#080a0f]">
      <h1 className="sr-only">S-G-3D Tactical Arena Match</h1>
      <PrimaryCanvas />
      <MobileHudEditorModal
        isOpen={isMobileHudEditorOpen}
        onClose={() => setMobileHudEditorOpen(false)}
      />
    </main>
  );
};
export default GamePage;
