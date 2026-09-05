/** Route-unioner för träningstesterna, så Link förblir typad. */

export type TrainingBackRoute =
  | "/traning"
  | "/shot-shaping"
  | "/approach-pei-valj";

export type TrainingTestRoute =
  | "/shot-shaping-9-window"
  | "/shot-shaping-konstant"
  | "/shot-shaping-vaxlande"
  | "/green-reading"
  | "/upp-och-in"
  | "/wedge-stege"
  | "/driver-konsekvens"
  | "/pga-tour-18-puttar";

export type TrainingHistoryRoute =
  | "/shot-shaping-9-window-historik"
  | "/shot-shaping-konstant-historik"
  | "/shot-shaping-vaxlande-historik"
  | "/green-reading-historik"
  | "/upp-och-in-historik"
  | "/wedge-stege-historik"
  | "/driver-konsekvens-historik"
  | "/pga-tour-18-puttar-historik";
