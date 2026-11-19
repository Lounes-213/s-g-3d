// polled every frame for physics
export const movementState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
  jump: false,
  lean: 0 as -1 | 0 | 1,
  isSliding: false,
  slideUntil: 0,
  slideCooldownUntil: 0,
  slideDirX: 0,
  slideDirZ: 0,
  holdBreath: false,
};

// read once per click/press
export const combatState = {
  isShooting: false,
  isAiming: false,
  isSwitching: false,
  isReloading: false,
};
