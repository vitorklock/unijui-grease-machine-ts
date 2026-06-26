/**
 * Grease Machine — detachable control library.
 *
 * Framework-free and network-free: hardware ports, calibration + interpolation
 * math, controllers, and the calibration procedure. The simulation implements
 * the ports; this library never imports the simulation or the UI.
 */
export * from "./types";
export * from "./consts";
export * from "./errors";
export * from "./math/interp";
export * from "./math/loading";
export { CalibrationStore } from "./calibration/store";
export * from "./calibration/interpolators";
export * from "./controllers";
export { CalibrationProcedure } from "./procedures/calibration-procedure";
export type { CalibrationProcedureDeps } from "./procedures/calibration-procedure";
