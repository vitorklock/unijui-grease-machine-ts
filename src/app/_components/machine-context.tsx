"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Calibration, Controller, DispenseResult } from "@/lib/grease-machine";
import {
  DEFAULT_OIL_PROFILE_ID,
  GreaseMachineSimulation,
  OIL_PROFILE_LIST,
  OIL_PROFILES,
  SystemClock,
  type OilProfile,
  type SimulationSnapshot,
} from "@/simulation";

export interface DispenseEntry extends DispenseResult {
  id: number;
}

/** Demo speeds: how many virtual seconds pass per wall-clock second. */
export const SPEED_OPTIONS = [1, 10, 25, 50, 100];
const DEFAULT_SPEED = 25;
const INITIAL_TEMP = 22;

interface MachineContextValue {
  snapshot: SimulationSnapshot;
  temperature: number;
  setTemperature: (t: number) => void;
  oil: OilProfile;
  oils: OilProfile[];
  setOil: (id: string) => void;
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
  dispenseOne: () => Promise<void>;
  startAuto: () => void;
  stopAuto: () => void;
  restart: () => void;
  log: DispenseEntry[];
  clearLog: () => void;
  error: string | null;
}

const MachineContext = createContext<MachineContextValue | null>(null);

export function useMachine(): MachineContextValue {
  const ctx = useContext(MachineContext);
  if (!ctx) throw new Error("useMachine must be used within <MachineProvider>");
  return ctx;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface Machine {
  sim: GreaseMachineSimulation;
  clock: SystemClock;
}

function buildMachine(oilId: string, temperature: number, speed: number): Machine {
  const clock = new SystemClock(speed);
  const sim = new GreaseMachineSimulation({
    physics: OIL_PROFILES[oilId].physics,
    clock,
    ambientTemp: temperature,
  });
  return { sim, clock };
}

export function MachineProvider({ children }: { children: React.ReactNode }) {
  const [oilId, setOilId] = useState(DEFAULT_OIL_PROFILE_ID);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [temperature, setTemperatureState] = useState(INITIAL_TEMP);
  const [machine, setMachine] = useState<Machine>(() =>
    buildMachine(DEFAULT_OIL_PROFILE_ID, INITIAL_TEMP, DEFAULT_SPEED),
  );
  const { sim, clock } = machine;

  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => sim.snapshot());
  const [points, setPoints] = useState<Calibration.Point[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const [controllerKey, setControllerKey] = useState<Controller.Key>("automatic");
  const [massPerPulse, setMassPerPulse] = useState(5);
  const [intervalSeconds, setIntervalSeconds] = useState(3);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<DispenseEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stopRef = useRef(false);
  const logId = useRef(0);

  // Keep the live snapshot fresh so the scale animates during pulses.
  useEffect(() => {
    const id = setInterval(() => setSnapshot(sim.snapshot()), 80);
    return () => clearInterval(id);
  }, [sim]);

  const pushLog = (result: DispenseResult) => {
    logId.current += 1;
    setLog((prev) => [{ ...result, id: logId.current }, ...prev].slice(0, 60));
  };

  const value = useMemo<MachineContextValue>(() => {
    const setTemperature = (t: number) => {
      sim.setTemperature(t);
      setTemperatureState(t);
    };

    const setOil = (id: string) => {
      if (id === oilId) return;
      // Switching fluid invalidates calibration — rebuild a fresh machine.
      stopRef.current = true;
      const next = buildMachine(id, temperature, speed);
      setMachine(next);
      setOilId(id);
      setPoints([]);
      setLog([]);
      setRunning(false);
      setError(null);
      setSnapshot(next.sim.snapshot());
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
      if (!sim.store.isReady()) {
        setError("Calibrate at least two temperatures before automatic dispensing.");
        return;
      }
      sim.resetContainer();
      try {
        pushLog(await sim.controller("automatic").dispense(massPerPulse));
      } catch (e) {
        setError(errorMessage(e));
      }
    };

    const waitInterruptible = (seconds: number) =>
      new Promise<void>((resolve) => {
        const end = performance.now() + seconds * 1000;
        const tick = () => {
          if (stopRef.current || performance.now() >= end) return resolve();
          setTimeout(tick, 80);
        };
        tick();
      });

    const startAuto = () => {
      setError(null);
      if (!sim.store.isReady()) {
        setError("Calibrate at least two temperatures before starting a cycle.");
        return;
      }
      if (running) return;
      stopRef.current = false;
      setRunning(true);

      void (async () => {
        const auto = sim.controller("automatic");
        while (!stopRef.current) {
          sim.resetContainer();
          try {
            pushLog(await auto.dispense(massPerPulse));
          } catch (e) {
            setError(errorMessage(e));
            break;
          }
          if (stopRef.current) break;
          await waitInterruptible(intervalSeconds);
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

    return {
      snapshot,
      temperature,
      setTemperature,
      oil: OIL_PROFILES[oilId],
      oils: OIL_PROFILE_LIST,
      setOil,
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
      dispenseOne,
      startAuto,
      stopAuto,
      restart,
      log,
      clearLog: () => setLog([]),
      error,
    };
  }, [
    sim,
    clock,
    oilId,
    speed,
    snapshot,
    temperature,
    points,
    calibrating,
    controllerKey,
    massPerPulse,
    intervalSeconds,
    running,
    log,
    error,
  ]);

  return <MachineContext.Provider value={value}>{children}</MachineContext.Provider>;
}
