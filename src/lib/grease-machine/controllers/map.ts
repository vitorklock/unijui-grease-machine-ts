import type { Controller, ControllerRegistry } from "../types";
import { AutomaticController } from "./automatic-controller";
import { ManualController } from "./manual-controller";

/**
 * Controller registry: key → factory(deps). The UI iterates this to build a
 * selector; the composition root calls the factory with the devices it has.
 * No special-casing per controller — adding one means adding an entry here.
 */
export const CONTROLLERS: { [K in Controller.Key]: ControllerRegistry.Entry<K> } = {
    manual: {
        key: "manual",
        label: "Manual",
        description:
            "Hold-to-run motor control for filling hoses, purging air, and ad-hoc dispensing. Needs only the motor.",
        create: ({ devices }) => new ManualController({ motor: devices.motor }),
    },
    automatic: {
        key: "automatic",
        label: "Automatic (compensated)",
        description:
            "Temperature-compensated pulsed dispensing. Reads temperature, interpolates calibration, and runs the motor for the exact computed time.",
        create: ({ devices, store, clock, interpolatorKey }) =>
            new AutomaticController({
                motor: devices.motor,
                thermometer: devices.thermometer,
                store,
                clock,
                interpolatorKey,
            }),
    },
};

/** Build a controller by key from shared dependencies. */
export function createController<K extends Controller.Key>(
    key: K,
    deps: ControllerRegistry.Deps,
): Controller<K> {
    return CONTROLLERS[key].create(deps) as Controller<K>;
}
