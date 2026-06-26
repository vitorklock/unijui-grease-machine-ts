/**
 * English message catalogue. This is the source of truth: its inferred type
 * `Messages` is the contract every other locale must satisfy, so a missing or
 * misspelled key is a compile error (see pt.ts). Interpolated strings are
 * functions, which keeps their argument shapes part of the contract too.
 */
export const en = {
  language: {
    label: "Language",
    en: "English",
    pt: "Português",
  },
  header: {
    title: "Grease Machine",
    subtitle:
      "Temperature-compensated precision dispenser for thin drip oil. Calibrate, then dispense exact pulses regardless of the weather.",
    export: "Export",
  },
  tabs: {
    operate: "Operate",
    calibrate: "Calibrate",
    oil: "Oil",
    curves: "Curves",
    accuracy: "Accuracy",
    compare: "Compare",
  },
  controllers: {
    manual: {
      label: "Manual",
      description:
        "Hold-to-run motor control for filling hoses, purging air, and ad-hoc dispensing. Needs only the motor.",
    },
    automatic: {
      label: "Automatic (compensated)",
      description:
        "Temperature-compensated pulsed dispensing. Reads temperature, interpolates calibration, and runs the motor for the exact computed time.",
    },
  },
  operate: {
    controllerTitle: "Controller",
    controllerSubtitle: "Pick how the machine drives the motor.",
    ambientTitle: "Ambient temperature",
    ambientSubtitle:
      "Flow and drip change with temperature. Sweep it to watch the compensated controller hold the dose.",
    liveScaleTitle: "Live scale",
    liveScaleSubtitle: "Dispensed mass in the container (clears between pulses).",
    motorRunning: "motor running",
    motorIdle: "motor idle",
    calibrated: "calibrated",
    needsCalibration: (n: number) => `needs calibration (${n}/2 temps)`,
    speedTitle: "Simulation speed",
    speedSubtitle:
      "A real micro-dosing pump is slow, so the demo compresses wall-clock time. Motor on-times shown are real-machine seconds.",
    manualTitle: "Manual control",
    manualSubtitle:
      "Hold to run the motor, for filling hoses and purging air. No calibration needed.",
    holdToRun: "Hold to run",
    running: "Running…",
    tareScale: "Tare scale",
    autoTitle: "Automatic dispensing",
    autoSubtitle: "Compensated pulses of a target mass at a fixed interval.",
    massPerPulse: "Mass per pulse (g)",
    interval: "Interval (s)",
    startCycle: "Start cycle",
    stopCycle: "Stop cycle",
    dispenseOne: "Dispense one pulse",
    restart: "Restart",
    enableHint:
      "Calibrate at two or more temperatures (Calibrate tab) to enable automatic dispensing.",
    pulseLogTitle: "Pulse log",
    pulseLogSubtitle: "Most recent pulses first.",
    noPulses: "No pulses yet.",
    clear: "Clear",
    pulseDetail: (temp: string, time: string, drip: string) =>
      `${temp} °C · motor ${time} · drip ≈ ${drip} g`,
  },
  calibrate: {
    runTitle: "Run a calibration",
    runSubtitle:
      "At each temperature the procedure runs a short (5 g) and a long (30 g) pulse, waits for the drip to settle, and records flow and drip.",
    temperature: "Temperature (°C)",
    calibrating: "Calibrating…",
    calibrateAt: (t: number) => `Calibrate at ${t} °C`,
    ready: "Ready to dispense",
    notReady: "Not ready",
    completeTemps: (n: number) => `${n} complete temperature${n === 1 ? "" : "s"}`,
    hint: "Need at least two temperatures. For best accuracy, calibrate on the coldest and warmest days plus one in between.",
    clearCalibration: "Clear calibration",
    pointsTitle: "Calibration points",
    pointsStored: (n: number) => `${n} point${n === 1 ? "" : "s"} stored.`,
    viewAll: (n: number) => `View all ${n} points`,
    showLess: "Show less",
    noPoints: "No calibration yet. Run a calibration to populate the store.",
    colTemp: "Temp",
    colRegime: "Regime",
    colCalMass: "Cal mass",
    colMotorTime: "Motor time",
    colFlow: "Flow",
    colDrip: "Drip",
    regimeShort: "short",
    regimeLong: "long",
    fitTitle: "Flow model",
    fitSubtitle:
      "Measured flow at each calibrated temperature, and the curve the selected interpolator draws between them.",
    fitInterpLegend: "interpolated flow",
    fitMeasuredLegend: "calibration points",
    fitFlowUnit: "g/s",
    fitHint: "Calibrate at least two temperatures to see the interpolation.",
  },
  oil: {
    pickerLabel: "Oil profile",
    sourced: "sourced",
    derived: "derived",
    density: "Density (15 °C)",
    flowAt: (ref: number) => `Flow @ ${ref} °C`,
    flowSensitivity: "Flow sensitivity",
    dripLimit: "Drip limit",
    fillTime: "Line fill time",
    settleTime: "Drip settle time",
    sourceLabel: (source: string) => `Source: ${source}`,
    switchNote:
      "Switching oil rebuilds the machine and clears calibration. A different fluid means a different flow and drip, so it must be recalibrated.",
    viscosityTitle: "Kinematic viscosity",
    viscositySubtitle:
      "How thin the oil is across temperature (cSt). The steep drop is what makes temperature compensation necessary.",
    viscosityUnit: "cSt",
    viscosityLegend: "viscosity",
  },
  interpolator: {
    pickerLabel: "Interpolation strategy",
    best: "best",
    names: {
      geometric: "Geometric",
      arrhenius: "Arrhenius",
      linear: "Linear",
    },
    descriptions: {
      geometric:
        "Interpolates flow and drip in log-space — exact for the exponential temperature physics, so it is the most accurate strategy.",
      arrhenius:
        "Interpolates in log-space against 1/T (kelvin), the textbook Arrhenius viscosity law — the canonical fit for real oils.",
      linear:
        "Straight-line interpolation between calibration points. Simple, but biased between them since the real curves are exponential.",
    },
  },
  curves: {
    title: "Calibration curves",
    subtitle: (temps: string) =>
      `Standard calibration at ${temps} °C. Flow rises with temperature while drip falls, and a long pulse always drips more than a short one.`,
    flowLegend: "flow (g/s)",
    dripShortLegend: "drip, short pulse (g)",
    dripLongLegend: "drip, long pulse (g)",
  },
  accuracy: {
    title: "Dispensing accuracy at 25 °C",
    subtitle: (mean: string) =>
      `A temperature between calibration points, so the result depends entirely on interpolation. The relative error stays small and roughly constant across pulse sizes (mean absolute error ≈ ${mean}%).`,
    error: "error",
    colTarget: "Target",
    colMotorTime: "Motor time",
    colDelivered: "Delivered",
    colError: "Error",
    colErrorPct: "Error %",
  },
  compare: {
    title: "Compensated vs. fixed-time dispenser",
    subtitle: (target: number, temp: number) =>
      `Every interpolation strategy targets ${target} g. The legacy dispenser is set once at ${temp} °C and never adjusts, so it over or under-dispenses as the temperature drifts; the compensated strategies hold the dose.`,
    fixedAt: (temp: number) => `fixed-time (set at ${temp} °C)`,
    target: "target",
    errorTitle: "Interpolation error by strategy",
    errorSubtitle:
      "Residual dose error of each interpolation strategy across the calibrated range — lower is better. Switch strategies with the picker in the header; the selected one is highlighted.",
    perfect: "perfect",
    meanError: (pct: string) => `mean |error| ${pct}%`,
    colTemp: "Temp",
    colFixed: "Fixed-time",
    colFixedError: "Fixed error",
  },
  oilDescriptions: {
    "iso-vg-32":
      "Medium-light mineral lubricating oil. The reference profile, with parameters derived directly from sourced viscosity, film, and drainage data for 3 mm ID x 40 cm tubing.",
    "iso-vg-22":
      "Thinner than VG 32: faster flow, less drip, quicker drainage. Parameters scaled from the VG 32 profile using flow ~ 1/viscosity, drain ~ viscosity, film ~ viscosity^(2/3).",
    "iso-vg-10":
      "Very thin oil: fast flow and short drip tail. Parameters scaled from the VG 32 profile; the cold-end viscosity points are extrapolated.",
  },
  errors: {
    calibrateTwoAuto: "Calibrate at least two temperatures before automatic dispensing.",
    calibrateTwoCycle: "Calibrate at least two temperatures before starting a cycle.",
  },
};

export type Messages = typeof en;
