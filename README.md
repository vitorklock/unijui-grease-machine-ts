# Grease Machine

A temperature-compensated dispenser for thin drip oil. It calibrates against a scale, then dispenses precise pulses by running the motor for a computed time. The scale is only needed for calibration, not for normal operation.

The project is a TypeScript rewrite of an earlier Python prototype, organized as a detachable control library, a separate physics simulation, and a Next.js interface. The control library knows nothing about the simulation or the UI. It reaches hardware through three small interfaces (motor, scale, thermometer), so the same controller code runs against the simulation today and against real hardware later.

## Why pulses drift without compensation

Oil keeps flowing for a moment after the motor stops. That residual flow (the "drip") adds to every pulse. Both the flow rate and the drip change with temperature: warmer oil flows faster and drips less, colder oil flows slower and drips more. A dispenser that runs the motor for a fixed time therefore over-dispenses on warm days and under-dispenses on cold ones. This project measures that behavior during calibration and corrects for it at run time.

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Scripts

- `pnpm dev` runs the development server.
- `pnpm build` creates a production build.
- `pnpm start` serves the production build.
- `pnpm test` runs the Vitest suite.
- `pnpm typecheck` runs `tsc --noEmit`.
- `pnpm lint` runs ESLint.

## How the control works

Units are grams, seconds, and degrees Celsius throughout.

### The control law

For a target pulse mass `m` at temperature `T`, the motor on-time is:

```
t = ( m - drip(T, t) ) / flow(T)
```

The drip depends on the pulse duration `t`, which is the value being solved for, so the controller solves the equation by fixed-point iteration. The iteration converges quickly because the drip changes slowly compared to the flow.

### Calibration

Calibration runs at one temperature at a time and records two pulses: a short one (5 g target) and a long one (30 g target). For each pulse the procedure runs the motor until the scale reaches the target mass, records the motor time, waits for the weight to settle (within 0.1 g over 15 seconds), and records the extra mass that dripped in. From the two pulses it derives the flow rate and two points on the drip-versus-duration curve.

At least two temperatures are required to operate. More temperatures reduce the interpolation error. Calibrating on the coldest and warmest expected days plus one in between works well.

### From two pulses to a drip model

The drip grows with pulse duration and levels off toward a temperature-dependent limit:

```
drip(t) = L * ( 1 - exp(-t / tau) )
```

The two calibration pulses give two points on this curve, which fix `L` and `tau`. Recovering the curve this way, rather than drawing a straight line between the two points, keeps short pulses accurate. The real curve bends, and a straight chord would miss it by several percent.

Across temperature, the controller interpolates the flow, `L`, and `tau` linearly between calibration points. That linear step over a curve that is really exponential leaves a small and roughly constant relative error, which the Accuracy tab measures.

## The app

The interface has five tabs:

- Operate: pick the manual or automatic controller, set the ambient temperature, and run pulses. Manual mode holds the motor on while the button is pressed. Automatic mode dispenses a target mass on an interval.
- Calibrate: run calibrations at chosen temperatures and view the stored points.
- Curves: flow and drip against temperature, from a standard 10, 20, and 35 degree calibration.
- Accuracy: dispensing error at 25 degrees, a temperature between calibration points.
- Compare: the compensated controller against a fixed-time dispenser across a temperature sweep.

The three chart tabs run their own simulation scenarios, so they work without any manual calibration.

## Architecture

Code flows in one direction. The app uses the simulation, the simulation uses the control library, and the control library depends on nothing internal.

```
src/
  lib/grease-machine/   control library (no React, no network)
    types.ts            namespace contracts (ports, calibration, controllers)
    math/               interp1d and the drip-loading fit
    calibration/        store and interpolator (the solver)
    controllers/        manual, automatic, and the registry
    procedures/         the calibration procedure
  simulation/           physics, simulated devices, clock, scenarios
  app/                  Next.js UI (the only place with React)
```

The control library reaches hardware through three interfaces in `types.ts`: `Hardware.Motor`, `Hardware.Scale`, and `Hardware.Thermometer`. The simulation implements them with a physics model. A real machine implements the same three with device drivers.

## Using real hardware

Implement the three port interfaces for your motor, scale, and thermometer, then build a controller with them:

```ts
import { createController, CalibrationStore } from "@/lib/grease-machine";

const devices = { motor, scale, thermometer }; // your implementations
const store = CalibrationStore.fromJSON(savedPoints);
const clock = {
  now: () => performance.now() / 1000,
  sleep: (s) => new Promise((r) => setTimeout(r, s * 1000)),
};

const auto = createController("automatic", { devices, store, clock });
await auto.dispense(5); // grams
```

Calibration, interpolation, and control stay the same. Only the device implementations change.

## Tests

`pnpm test` covers the interpolation, the drip fit, the solver, the physics, and an end-to-end round trip that calibrates against the simulation, dispenses, and checks the delivered mass.
