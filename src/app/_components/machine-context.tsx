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
  GreaseMachineSimulation,
  SystemClock,
  type SimulationSnapshot,
} from "@/simulation";

export interface DispenseEntry extends DispenseResult {
  id: number;
}

interface MachineContextValue {
  snapshot: SimulationSnapshot;
  // ambient temperature
  temperature: number;
  setTemperature: (t: number) => void;
  // calibration
  points: Calibration.Point[];
  calibrating: boolean;
  calibrateAt: (t: number) => Promise<void>;
  clearCalibration: () => void;
  // controller selection
  controllerKey: Controller.Key;
  setControllerKey: (k: Controller.Key) => void;
  // manual
  manualOn: () => void;
  manualOff: () => void;
  tare: () => void;
  // automatic
  massPerPulse: number;
  setMassPerPulse: (n: number) => void;
  intervalSeconds: number;
  setIntervalSeconds: (n: number) => void;
  running: boolean;
  dispenseOne: () => Promise<void>;
  startAuto: () => void;
  stopAuto: () => void;
  // feedback
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

export function MachineProvider({ children }: { children: React.ReactNode }) {
  // Held in state (created once) rather than a ref, so it is a stable value we
  // can safely read during render.
  const [sim] = useState(
    () =>
      new GreaseMachineSimulation({
        clock: new SystemClock(1),
        ambientTemp: 22,
      }),
  );

  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => sim.snapshot());
  const [temperature, setTemperatureState] = useState(22);
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

    return {
      snapshot,
      temperature,
      setTemperature,
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
      log,
      clearLog: () => setLog([]),
      error,
    };
  }, [
    sim,
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
