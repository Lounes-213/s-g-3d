export type KeyAction =
  | "moveForward"
  | "moveBackward"
  | "moveLeft"
  | "moveRight"
  | "jump"
  | "sprint"
  | "crouch"
  | "reload"
  | "togglePerspective"
  | "toggleControls"
  | "pushToTalk"
  | "skill1"
  | "skill2"
  | "skill3"
  | "weapon1"
  | "weapon2"
  | "weapon3"
  | "weapon4"
  | "weapon5"
  | "weapon6"
  | "scoreboard";

export type KeyBindingsMap = Record<KeyAction, string>;

export const DEFAULT_KEYBINDINGS: KeyBindingsMap = {
  moveForward: "KeyW",
  moveBackward: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  jump: "Space",
  sprint: "ShiftLeft",
  crouch: "KeyC",
  reload: "KeyR",
  togglePerspective: "KeyV",
  toggleControls: "KeyH",
  pushToTalk: "KeyT",
  skill1: "KeyQ",
  skill2: "KeyE",
  skill3: "KeyF",
  weapon1: "Digit1",
  weapon2: "Digit2",
  weapon3: "Digit3",
  weapon4: "Digit4",
  weapon5: "Digit5",
  weapon6: "Digit6",
  scoreboard: "Tab",
};

export const KEYBINDING_LABELS: Record<KeyAction, string> = {
  moveForward: "Move Forward",
  moveBackward: "Move Backward",
  moveLeft: "Strafe Left",
  moveRight: "Strafe Right",
  jump: "Jump",
  sprint: "Sprint / Run",
  crouch: "Crouch / Slide",
  reload: "Reload Weapon",
  togglePerspective: "Switch 1P / 3P Camera",
  toggleControls: "Hide / Show Controls HUD",
  pushToTalk: "Voice Chat Push-to-Talk",
  skill1: "Skill 1: Hyper Dash",
  skill2: "Skill 2: Aegis Shield",
  skill3: "Skill 3: Frag / Plasma Blast",
  weapon1: "Slot 1: Assault Rifle",
  weapon2: "Slot 2: Kobra-9 SMG",
  weapon3: "Slot 3: Tactical Shotgun",
  weapon4: "Slot 4: Burst Rifle",
  weapon5: "Slot 5: AWP-X Sniper",
  weapon6: "Slot 6: Heavy Pistol",
  scoreboard: "Scoreboard",
};

export function formatKeyCode(code: string): string {
  if (!code) return "?";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "SPACE";
  if (code === "ShiftLeft" || code === "ShiftRight") return "SHIFT";
  if (code === "ControlLeft" || code === "ControlRight") return "CTRL";
  if (code === "AltLeft" || code === "AltRight") return "ALT";
  if (code === "Tab") return "TAB";
  return code.toUpperCase();
}
