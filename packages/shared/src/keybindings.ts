export type KeyAction =
  | "moveForward"
  | "moveBackward"
  | "moveLeft"
  | "moveRight"
  | "jump"
  | "sprint"
  | "crouch"
  | "reload"
  | "interact"
  | "leanLeft"
  | "leanRight"
  | "armorPlate"
  | "medkit"
  | "cycleScope"
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
  | "weapon7"
  | "weapon8"
  | "weapon9"
  | "weapon10"
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
  interact: "KeyF",
  leanLeft: "KeyQ",
  leanRight: "KeyE",
  armorPlate: "KeyB",
  medkit: "KeyX",
  cycleScope: "KeyY",
  togglePerspective: "KeyV",
  toggleControls: "KeyH",
  pushToTalk: "KeyT",
  skill1: "KeyZ",
  skill2: "KeyU",
  skill3: "KeyG",
  weapon1: "Digit1",
  weapon2: "Digit2",
  weapon3: "Digit3",
  weapon4: "Digit4",
  weapon5: "Digit5",
  weapon6: "Digit6",
  weapon7: "Digit7",
  weapon8: "Digit8",
  weapon9: "Digit9",
  weapon10: "Digit0",
  scoreboard: "Tab",
};

export const KEYBINDING_LABELS: Record<KeyAction, string> = {
  moveForward: "Move Forward",
  moveBackward: "Move Backward",
  moveLeft: "Strafe Left",
  moveRight: "Strafe Right",
  jump: "Jump / Double Jump",
  sprint: "Sprint / Hold Breath (ADS)",
  crouch: "Crouch / Tactical Slide",
  reload: "Reload Weapon",
  interact: "Loot / Supply Crate",
  leanLeft: "Tactical Lean Left",
  leanRight: "Tactical Lean Right",
  armorPlate: "Insert Armor Plate",
  medkit: "Use Tactical Medkit",
  cycleScope: "Cycle Scope / Zoom",
  togglePerspective: "Switch 1P / 3P Camera",
  toggleControls: "Hide / Show Controls HUD",
  pushToTalk: "Voice Chat Push-to-Talk",
  skill1: "Skill 1: Hyper Dash",
  skill2: "Skill 2: Aegis Shield",
  skill3: "Skill 3: Frag / Plasma Blast",
  weapon1: "Slot 1: M4A1 Striker",
  weapon2: "Slot 2: AK-74M Zenith",
  weapon3: "Slot 3: SCAR-H Heavy",
  weapon4: "Slot 4: Kobra-9 MPX",
  weapon5: "Slot 5: FN P90 PDW",
  weapon6: "Slot 6: M880 Shotgun",
  weapon7: "Slot 7: Helios-3 Burst",
  weapon8: "Slot 8: AWP-X Sniper",
  weapon9: "Slot 9: Kar98k Marksman",
  weapon10: "Slot 0: Deagle-50 Tac",
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
