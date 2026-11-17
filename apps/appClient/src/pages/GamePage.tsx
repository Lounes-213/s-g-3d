import PrimaryCanvas from "../components/game/PrimaryCanvas";

const GamePage = () => {
  return (
    <main id="main-content" className="w-full h-dvh overflow-hidden bg-[#090d16]">
      <h1 className="sr-only">S-G-3D Tactical Arena Match</h1>
      <PrimaryCanvas />
    </main>
  );
};
export default GamePage;
