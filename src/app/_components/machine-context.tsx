"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_INTERPOLATOR_KEY,
  INTERPOLATOR_LIST,
} from "@/lib/grease-machine";
import type {
  Calibration,
  Controller,
  DispenseResult,
  Interpolator,
  InterpolatorRegistry,
} from "@/lib/grease-machine";
import {
  DEFAULT_OIL_PROFILE_ID,
  GreaseMachineSimulation,
  OIL_PROFILE_LIST,
  OIL_PROFILES,
  SystemClock,
  type OilProfile,
  type PhysicsConfig,
  type SimulationSnapshot,
} from "@/simulation";
import { useTranslation } from "@/i18n";

export interface DispenseEntry extends DispenseResult {
  id: number;
  /** Mass the scale measured for this pulse once the drip settled, in grams. */
  delivered: number;
  /** delivered − massTarget: the measured over/under-dispense, in grams. */
  miss: number;
}

/** A full snapshot of the machine state, downloadable for sharing/debugging. */
export interface MachineExport {
  exportedAt: string;
  oil: { id: string; grade: string; physics: PhysicsConfig };
  ambientTemperature: number;
  speed: number;
  settings: { massPerPulse: number; intervalSeconds: number };
  ready: boolean;
  calibration: Calibration.StoreJson;
  log: DispenseEntry[];
}

/** Demo speeds: how many virtual seconds pass per wall-clock second. */
export const SPEED_OPTIONS = [1, 10, 25, 50, 100];
const DEFAULT_SPEED = 25;
const INITIAL_TEMP = 22;

interface MachineContextValue {
  temperature: number;
  setTemperature: (t: number) => void;
  oil: OilProfile;
  oils: OilProfile[];
  setOil: (id: string) => void;
  interpolatorKey: Interpolator.Key;
  setInterpolator: (key: Interpolator.Key) => void;
  interpolators: InterpolatorRegistry.Entry[];
  speed: number;
  setSpeed: (s: number) => void;
  points: Calibration.Point[];
  calibrating: boolean;
  calibrateAt: (t: number) => Promise<void>;
  clearCalibration: () => void;
  controllerKey: Controller.Key;
  setControllerKey: (k: Controller.Key) => void;
  manualOn: () => void;
  manualOff: () => void;
  tare: () => void;
  massPerPulse: number;
  setMassPerPulse: (n: number) => void;
  intervalSeconds: number;
  setIntervalSeconds: (n: number) => void;
  running: boolean;
  dispensing: boolean;
  dispenseOne: () => Promise<void>;
  startAuto: () => void;
  stopAuto: () => void;
  restart: () => void;
  log: DispenseEntry[];
  clearLog: () => void;
  error: string | null;
  exportData: () => MachineExport;
}

const MachineContext = createContext<MachineContextValue | null>(null);

/**
 * The live machine snapshot lives in its OWN context because it ticks ~12x/sec
 * (the scale animates during a pulse). Keeping it out of MachineContext means
 * the charts, selectors, etc. — which only need stable config — do NOT re-render
 * on every tick (that churn previously kept recharts re-measuring and restarting
 * line animations). Only components that show the live scale subscribe here.
 */
const SnapshotContext = createContext<SimulationSnapshot | null>(null);

export function useMachine(): MachineContextValue {
  const ctx = useContext(MachineContext);
  if (!ctx) throw new Error("useMachine must be used within <MachineProvider>");
  return ctx;
}

export function useSnapshot(): SimulationSnapshot {
  const ctx = useContext(SnapshotContext);
  if (!ctx) throw new Error("useSnapshot must be used within <MachineProvider>");
  return ctx;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface Machine {
  sim: GreaseMachineSimulation;
  clock: SystemClock;
}

function buildMachine(
  oilId: string,
  temperature: number,
  speed: number,
  interpolatorKey: Interpolator.Key,
): Machine {
  const clock = new SystemClock(speed);
  const sim = new GreaseMachineSimulation({
    physics: OIL_PROFILES[oilId].physics,
    clock,
    ambientTemp: temperature,
    interpolatorKey,
  });
  return { sim, clock };
}

export function MachineProvider({ children }: { children: React.ReactNode }) {
  const [oilId, setOilId] = useState(DEFAULT_OIL_PROFILE_ID);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [temperature, setTemperatureState] = useState(INITIAL_TEMP);
  const [interpolatorKey, setInterpolatorKeyState] =
    useState<Interpolator.Key>(DEFAULT_INTERPOLATOR_KEY);
  const [machine, setMachine] = useState<Machine>(() =>
    buildMachine(DEFAULT_OIL_PROFILE_ID, INITIAL_TEMP, DEFAULT_SPEED, DEFAULT_INTERPOLATOR_KEY),
  );
  const { sim, clock } = machine;
  const { t } = useTranslation();

  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => sim.snapshot());
  const [points, setPoints] = useState<Calibration.Point[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const [controllerKey, setControllerKey] = useState<Controller.Key>("automatic");
  const [massPerPulse, setMassPerPulse] = useState(5);
  const [intervalSeconds, setIntervalSeconds] = useState(3);
  const [running, setRunning] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [log, setLog] = useState<DispenseEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stopRef = useRef(false);
  const busyRef = useRef(false); // a single dispense pulse is in flight
  const logId = useRef(0);

  // Keep the live snapshot fresh so the scale animates during pulses.
  useEffect(() => {
    const id = setInterval(() => setSnapshot(sim.snapshot()), 80);
    return () => clearInterval(id);
  }, [sim]);

  const pushLog = useCallback(
    (result: DispenseResult) => {
      logId.current += 1;
      // Record what the scale actually measured for this pulse. Callers log only
      // after the drip has settled (see the dispense flow), so this equals the
      // live scale reading exactly — no transient gap between the two. Open-loop
      // control never reads the scale during a pulse; this is the demo
      // re-attaching it to show the true delivered mass and its miss vs target.
      const delivered = sim.scale.readWeight();
      const miss = delivered - result.massTarget;
      setLog((prev) =>
        [{ ...result, id: logId.current, delivered, miss }, ...prev].slice(0, 60),
      );
    },
    [sim],
  );

  const value = useMemo<MachineContextValue>(() => {
    const setTemperature = (t: number) => {
      sim.setTemperature(t);
      setTemperatureState(t);
    };

    const setOil = (id: string) => {
      if (id === oilId) return;
      // Switching fluid invalidates calibration — rebuild a fresh machine, but
      // keep the chosen interpolation strategy.
      stopRef.current = true;
      const next = buildMachine(id, temperature, speed, interpolatorKey);
      setMachine(next);
      setOilId(id);
      setPoints([]);
      setLog([]);
      setRunning(false);
      setError(null);
      setSnapshot(next.sim.snapshot());
    };

    // Switch the live controller's interpolation strategy in place — no rebuild,
    // so calibration and the container are preserved.
    const setInterpolator = (key: Interpolator.Key) => {
      sim.setInterpolator(key);
      setInterpolatorKeyState(key);
    };

    const setSpeed = (s: number) => {
      clock.setTimeScale(s);
      setSpeedState(s);
    };

    const calibrateAt = async (t: number) => {
      setError(null);
      setCalibrating(true);
      try {
        await sim.calibrateAt(t);
        setPoints([...sim.store.points]);
        setSnapshot(sim.snapshot());
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setCalibrating(false);
      }
    };

    const clearCalibration = () => {
      sim.clearCalibration();
      setPoints([]);
      setSnapshot(sim.snapshot());
    };

    const manualOn = () => sim.controller("manual").motorOn();
    const manualOff = () => sim.controller("manual").motorOff();
    const tare = () => {
      sim.resetContainer();
      setSnapshot(sim.snapshot());
    };

    const dispenseOne = async () => {
      setError(null);
      if (busyRef.current) return; // a pulse is already in flight — don't overlap
      if (!sim.store.isReady()) {
        setError(t.errors.calibrateTwoAuto);
        return;
      }
      stopRef.current = false;
      busyRef.current = true;
      setDispensing(true);
      sim.resetContainer();
      try {
        const result = await sim.controller("automatic").dispense(massPerPulse);
        // Wait for the drip to finish settling before recording the pulse, so the
        // logged mass equals what the live scale settles to (no transient gap).
        await waitInterruptible(sim.physics.dripSettlingDuration(result.temperature));
        pushLog(result);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        busyRef.current = false;
        setDispensing(false);
      }
    };

    // Wait `seconds` of virtual time (scaled by the demo speed), pollable so the
    // cycle can be stopped promptly.
    const waitInterruptible = (seconds: number) =>
      new Promise<void>((resolve) => {
        const end = performance.now() + (seconds / speed) * 1000;
        const tick = () => {
          if (stopRef.current || performance.now() >= end) return resolve();
          setTimeout(tick, 50);
        };
        tick();
      });

    const startAuto = () => {
      setError(null);
      if (busyRef.current || running) return; // don't overlap a pulse or another cycle
      if (!sim.store.isReady()) {
        setError(t.errors.calibrateTwoCycle);
        return;
      }
      stopRef.current = false;
      setRunning(true);

      void (async () => {
        const auto = sim.controller("automatic");
        while (!stopRef.current) {
          busyRef.current = true;
          setDispensing(true);
          sim.resetContainer();
          let result: DispenseResult;
          try {
            result = await auto.dispense(massPerPulse);
          } catch (e) {
            setError(errorMessage(e));
            busyRef.current = false;
            setDispensing(false);
            break;
          }
          // Let the drip settle (never longer than the interval) before logging,
          // so the recorded mass matches the scale reading shown for this pulse.
          const settle = sim.physics.dripSettlingDuration(result.temperature);
          await waitInterruptible(Math.min(settle, intervalSeconds));
          pushLog(result);
          busyRef.current = false;
          setDispensing(false);
          if (stopRef.current) break;
          await waitInterruptible(Math.max(0, intervalSeconds - settle));
        }
        setRunning(false);
      })();
    };

    const stopAuto = () => {
      stopRef.current = true;
      setRunning(false);
    };

    // Stop any cycle and start a fresh operation session: empty the container and
    // clear the pulse log. Calibration and the selected oil are kept.
    const restart = () => {
      stopRef.current = true;
      setRunning(false);
      sim.resetContainer();
      setLog([]);
      setError(null);
      setSnapshot(sim.snapshot());
    };

    const profile = OIL_PROFILES[oilId];
    const exportData = (): MachineExport => ({
      exportedAt: new Date().toISOString(),
      oil: { id: profile.id, grade: profile.grade, physics: profile.physics },
      ambientTemperature: temperature,
      speed,
      settings: { massPerPulse, intervalSeconds },
      ready: sim.store.isReady(),
      calibration: sim.store.toJSON(),
      log,
    });

    return {
      temperature,
      setTemperature,
      oil: OIL_PROFILES[oilId],
      oils: OIL_PROFILE_LIST,
      setOil,
      interpolatorKey,
      setInterpolator,
      interpolators: INTERPOLATOR_LIST,
      speed,
      setSpeed,
      points,
      calibrating,
      calibrateAt,
      clearCalibration,
      controllerKey,
      setControllerKey,
      manualOn,
      manualOff,
      tare,
      massPerPulse,
      setMassPerPulse,
      intervalSeconds,
      setIntervalSeconds,
      running,
      dispensing,
      dispenseOne,
      startAuto,
      stopAuto,
      restart,
      log,
      clearLog: () => setLog([]),
      error,
      exportData,
    };
  }, [
    sim,
    clock,
    oilId,
    interpolatorKey,
    speed,
    temperature,
    points,
    calibrating,
    controllerKey,
    massPerPulse,
    intervalSeconds,
    running,
    dispensing,
    log,
    error,
    t,
    pushLog,
  ]);

  return (
    <MachineContext.Provider value={value}>
      <SnapshotContext.Provider value={snapshot}>{children}</SnapshotContext.Provider>
    </MachineContext.Provider>
  );
}
