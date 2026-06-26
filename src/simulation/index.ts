/**
 * Physics-based simulation of the grease machine. Implements the control
 * library's hardware ports with physics-driven fakes and orchestrates them.
 * Imports the control library; the library never imports the simulation.
 */
export * from "./physics";
export * from "./oils";
export * from "./clock";
export * from "./hardware";
export * from "./grease-machine-simulation";
export * from "./scenarios";
