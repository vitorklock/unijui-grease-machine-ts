import type { Messages } from "./messages";

/**
 * Brazilian Portuguese catalogue. Annotated `: Messages`, so TypeScript reports
 * a compile error if any key from the English source is missing or mistyped.
 */
export const pt: Messages = {
  language: {
    label: "Idioma",
    en: "English",
    pt: "Português",
  },
  header: {
    title: "Máquina de Lubrificante",
    subtitle:
      "Dispensador de precisão com compensação de temperatura para óleo fino. Calibre e dispense pulsos exatos independente do clima.",
    export: "Exportar",
  },
  tabs: {
    operate: "Operar",
    calibrate: "Calibrar",
    oil: "Óleo",
    curves: "Curvas",
    accuracy: "Precisão",
    compare: "Comparar",
  },
  controllers: {
    manual: {
      label: "Manual",
      description:
        "Controle direto do motor (segure para acionar) para encher mangueiras, purgar ar e dispensas pontuais. Precisa apenas do motor.",
    },
    automatic: {
      label: "Automático (compensado)",
      description:
        "Dispensa pulsada com compensação de temperatura. Lê a temperatura, interpola a calibração e aciona o motor pelo tempo exato calculado.",
    },
  },
  operate: {
    controllerTitle: "Controlador",
    controllerSubtitle: "Escolha como a máquina aciona o motor.",
    ambientTitle: "Temperatura ambiente",
    ambientSubtitle:
      "A vazão e o escoamento residual mudam com a temperatura. Varie-a para ver o controlador compensado manter a dose.",
    liveScaleTitle: "Balança ao vivo",
    liveScaleSubtitle: "Massa dispensada no recipiente (zera entre pulsos).",
    motorRunning: "motor ligado",
    motorIdle: "motor parado",
    calibrated: "calibrado",
    needsCalibration: (n: number) => `requer calibração (${n}/2 temps)`,
    speedTitle: "Velocidade da simulação",
    speedSubtitle:
      "Uma bomba de microdosagem real é lenta, então a demonstração comprime o tempo real. Os tempos de motor exibidos são segundos da máquina real.",
    manualTitle: "Controle manual",
    manualSubtitle:
      "Segure para acionar o motor, para encher mangueiras e purgar ar. Não precisa de calibração.",
    holdToRun: "Segure para acionar",
    running: "Acionando…",
    tareScale: "Zerar balança",
    autoTitle: "Dispensa automática",
    autoSubtitle: "Pulsos compensados de uma massa-alvo em intervalo fixo.",
    massPerPulse: "Massa por pulso (g)",
    interval: "Intervalo (s)",
    startCycle: "Iniciar ciclo",
    stopCycle: "Parar ciclo",
    dispenseOne: "Dispensar um pulso",
    restart: "Reiniciar",
    enableHint:
      "Calibre em duas ou mais temperaturas (aba Calibrar) para habilitar a dispensa automática.",
    pulseLogTitle: "Registro de pulsos",
    pulseLogSubtitle: "Pulsos mais recentes primeiro.",
    noPulses: "Nenhum pulso ainda.",
    clear: "Limpar",
    pulseDetail: (temp: string, time: string, drip: string) =>
      `${temp} °C · motor ${time} · escoamento ≈ ${drip} g`,
  },
  calibrate: {
    runTitle: "Executar calibração",
    runSubtitle:
      "Em cada temperatura o procedimento executa um pulso curto (5 g) e um longo (30 g), aguarda o escoamento estabilizar e registra a vazão e o escoamento residual.",
    temperature: "Temperatura (°C)",
    calibrating: "Calibrando…",
    calibrateAt: (t: number) => `Calibrar a ${t} °C`,
    ready: "Pronto para dispensar",
    notReady: "Não pronto",
    completeTemps: (n: number) =>
      `${n} temperatura${n === 1 ? "" : "s"} completa${n === 1 ? "" : "s"}`,
    hint: "São necessárias pelo menos duas temperaturas. Para maior precisão, calibre nos dias mais frio e mais quente, mais um intermediário.",
    clearCalibration: "Limpar calibração",
    pointsTitle: "Pontos de calibração",
    pointsStored: (n: number) =>
      `${n} ponto${n === 1 ? "" : "s"} armazenado${n === 1 ? "" : "s"}.`,
    noPoints: "Sem calibração ainda. Execute uma calibração para preencher os dados.",
    colTemp: "Temp",
    colRegime: "Regime",
    colCalMass: "Massa cal.",
    colMotorTime: "Tempo motor",
    colFlow: "Vazão",
    colDrip: "Escoam.",
    regimeShort: "curto",
    regimeLong: "longo",
  },
  oil: {
    pickerLabel: "Perfil de óleo",
    sourced: "com fonte",
    derived: "derivado",
    density: "Densidade (15 °C)",
    flowAt: (ref: number) => `Vazão @ ${ref} °C`,
    flowSensitivity: "Sensibilidade da vazão",
    dripLimit: "Limite de escoamento",
    fillTime: "Tempo de enchimento",
    settleTime: "Tempo de estabilização",
    sourceLabel: (source: string) => `Fonte: ${source}`,
    switchNote:
      "Trocar de óleo reconstrói a máquina e limpa a calibração. Um fluido diferente tem vazão e escoamento diferentes, então deve ser recalibrado.",
    viscosityTitle: "Viscosidade cinemática",
    viscositySubtitle:
      "Quão fino é o óleo ao longo da temperatura (cSt). A queda acentuada é o que torna a compensação de temperatura necessária.",
    viscosityUnit: "cSt",
    viscosityLegend: "viscosidade",
  },
  interpolator: {
    pickerLabel: "Estratégia de interpolação",
    best: "melhor",
    names: {
      geometric: "Geométrica",
      linear: "Linear",
    },
    descriptions: {
      geometric:
        "Interpola vazão e escoamento em escala logarítmica — exata para a física exponencial da temperatura, sendo a estratégia mais precisa.",
      linear:
        "Interpolação em linha reta entre pontos de calibração. Simples, mas enviesada entre eles, já que as curvas reais são exponenciais.",
    },
  },
  curves: {
    title: "Curvas de calibração",
    subtitle: (temps: string) =>
      `Calibração padrão a ${temps} °C. A vazão sobe com a temperatura enquanto o escoamento cai, e um pulso longo sempre escoa mais que um curto.`,
    flowLegend: "vazão (g/s)",
    dripShortLegend: "escoamento, pulso curto (g)",
    dripLongLegend: "escoamento, pulso longo (g)",
  },
  accuracy: {
    title: "Precisão de dispensa a 25 °C",
    subtitle: (mean: string) =>
      `Uma temperatura entre pontos de calibração, então o resultado depende inteiramente da interpolação. O erro relativo permanece pequeno e aproximadamente constante entre tamanhos de pulso (erro absoluto médio ≈ ${mean}%).`,
    error: "erro",
    colTarget: "Alvo",
    colMotorTime: "Tempo motor",
    colDelivered: "Entregue",
    colError: "Erro",
    colErrorPct: "Erro %",
  },
  compare: {
    title: "Compensado vs. tempo fixo",
    subtitle: (target: number, temp: number) =>
      `Todas as estratégias de interpolação têm alvo de ${target} g. O dispensador antigo é ajustado uma vez a ${temp} °C e nunca se adapta, então dispensa em excesso ou a menos conforme a temperatura muda; as estratégias compensadas mantêm a dose.`,
    fixedAt: (temp: number) => `tempo fixo (ajustado a ${temp} °C)`,
    target: "alvo",
    errorTitle: "Erro de interpolação por estratégia",
    errorSubtitle:
      "Erro residual de dose de cada estratégia de interpolação ao longo da faixa calibrada — menor é melhor. Troque de estratégia pelo seletor no cabeçalho; a selecionada fica destacada.",
    perfect: "perfeito",
    meanError: (pct: string) => `|erro| médio ${pct}%`,
    colTemp: "Temp",
    colFixed: "Tempo fixo",
    colFixedError: "Erro fixo",
  },
  oilDescriptions: {
    "iso-vg-32":
      "Óleo lubrificante mineral médio-leve. O perfil de referência, com parâmetros derivados diretamente de dados de viscosidade, filme e escoamento para tubo de 3 mm DI x 40 cm.",
    "iso-vg-22":
      "Mais fino que o VG 32: vazão mais rápida, menos escoamento, drenagem mais rápida. Parâmetros escalados do perfil VG 32 usando vazão ~ 1/viscosidade, drenagem ~ viscosidade, filme ~ viscosidade^(2/3).",
    "iso-vg-10":
      "Óleo muito fino: vazão rápida e cauda de escoamento curta. Parâmetros escalados do perfil VG 32; os pontos de viscosidade na faixa fria são extrapolados.",
  },
  errors: {
    calibrateTwoAuto: "Calibre em pelo menos duas temperaturas antes da dispensa automática.",
    calibrateTwoCycle: "Calibre em pelo menos duas temperaturas antes de iniciar um ciclo.",
  },
};
