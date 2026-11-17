import { create } from "zustand";

type typeAppStore = {
  appVersion: string;
  activePage: "welcome" | "ingame";
  setActivePage: (page: "welcome" | "ingame") => void;

  splashDismissed: boolean;
  dismissSplash: () => void;

  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  showControls: boolean;
  setShowControls: (isOpen: boolean) => void;
  toggleControls: () => void;

  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
};

export const useAppStore = create<typeAppStore>((set) => ({
  appVersion: "3.0.0",
  activePage: "welcome",
  setActivePage: (page) => set({ activePage: page }),

  splashDismissed: false,
  dismissSplash: () => set({ splashDismissed: true }),

  isSidebarOpen: false,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  showControls: true,
  setShowControls: (isShowing) => set({ showControls: isShowing }),
  toggleControls: () => set((state) => ({ showControls: !state.showControls })),

  showMinimap: true,
  setShowMinimap: (show) => set({ showMinimap: show }),
}));
