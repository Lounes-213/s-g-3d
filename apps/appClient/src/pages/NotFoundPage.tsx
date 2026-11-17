import { Link } from "react-router";

const NotFoundPage = () => {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center bg-[#090d16] text-white font-tactical p-4"
    >
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-sky-400 mb-2">
        S-G-3D
      </div>
      <h1 className="text-6xl md:text-8xl font-black text-red-500 tracking-widest">
        404
      </h1>
      <p className="mt-4 text-xl text-slate-300 font-bold uppercase tracking-wider">
        Sector Not Found
      </p>

      <Link
        to="/"
        className="mt-8 border border-sky-400/50 bg-sky-500/15 px-6 py-3 font-black uppercase tracking-widest text-white transition-all hover:bg-sky-500/30"
      >
        Return to S-G-3D Lobby
      </Link>
    </main>
  );
};

export default NotFoundPage;
