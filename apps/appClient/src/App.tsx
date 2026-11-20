import { useEffect } from "react";
import { Outlet } from "react-router";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./stores/useAuthStore";
import { useSettingsStore } from "./stores/useSettingsStore";
import SplashScreen from "./components/SplashScreen";

function App() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const unsub = useAuthStore.getState().initAuthListener();
    return unsub;
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
    } else {
      document.body.classList.add("theme-light");
      document.body.classList.remove("theme-dark");
    }
  }, [theme]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:font-bold focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
      >
        Skip to main content
      </a>
      <SplashScreen />
      <div className="font-inter overflow-x-hidden h-full w-full">
        <Outlet />
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;
