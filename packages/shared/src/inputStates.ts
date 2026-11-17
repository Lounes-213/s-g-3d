// polled every frame for physics
export const movementState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
  jump: false,
};

// read once per click/press
export const combatState = {
  isShooting: false,
  isAiming: false,
  isSwitching: false,
  isReloading: false,
};
