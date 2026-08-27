export type ApplianceCategory = "climate" | "kitchen" | "living" | "laundry" | "camping";

export type ApplianceUsage = {
  count: number;
  hours: number;
};

export type Appliance = {
  id: string;
  name: string;
  hint: string;
  icon: string;
  category: ApplianceCategory;
  /** Potencia mientras opera, W. */
  watts: number;
  /** Arranque / surge, W. */
  surgeW: number;
  /** Horas/día por defecto (nevera = 24 enchufada). */
  defaultHours: number;
  /** Fracción del tiempo que realmente toma potencia (compresor, inverter). */
  duty: number;
  /** Reparto relativo de energía en 24 h (se normaliza). */
  hourlyShare: number[];
};

function n(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

export const APPLIANCES: Appliance[] = [
  {
    id: "fridge",
    name: "Nevera",
    hint: "Compresor a ciclos. ~1.2 kWh/día en una nevera inverter típica.",
    icon: "🧊",
    category: "kitchen",
    watts: 150,
    surgeW: 600,
    defaultHours: 24,
    duty: 0.33,
    hourlyShare: n([
      4, 4, 4, 4, 4, 4, 4.2, 4.4, 4.3, 4.2, 4.3, 4.5, 5, 5.2, 5.2, 5, 4.6, 4.4,
      4.3, 4.2, 4.1, 4, 4, 4,
    ]),
  },
  {
    id: "ac12",
    name: "Aire 12.000 BTU",
    hint: "El que más mueve la cuenta. Prueba 4–8 h/día.",
    icon: "❄️",
    category: "climate",
    watts: 1100,
    surgeW: 2800,
    defaultHours: 6,
    duty: 0.85,
    hourlyShare: n([
      0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1.2, 1.8, 2.4, 2.8, 3.2,
      3.4, 3.3, 3.0, 2.6, 2.0, 1.4, 0.9, 0.5, 0.3,
    ]),
  },
  {
    id: "ac18",
    name: "Aire 18.000 BTU",
    hint: "Sala o espacio grande. Pico alto al arrancar.",
    icon: "🌀",
    category: "climate",
    watts: 1700,
    surgeW: 4200,
    defaultHours: 6,
    duty: 0.85,
    hourlyShare: n([
      0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1.2, 1.8, 2.4, 2.8, 3.2,
      3.4, 3.3, 3.0, 2.6, 2.0, 1.4, 0.9, 0.5, 0.3,
    ]),
  },
  {
    id: "fan",
    name: "Ventilador",
    hint: "Barato de sostener con solar, sobre todo en camping.",
    icon: "🪭",
    category: "climate",
    watts: 60,
    surgeW: 90,
    defaultHours: 8,
    duty: 1,
    hourlyShare: n([
      1.2, 1, 0.8, 0.7, 0.7, 0.8, 1, 1.2, 1.3, 1.5, 1.8, 2.2, 2.5, 2.7, 2.8, 2.6,
      2.4, 2.2, 2, 1.8, 1.7, 1.6, 1.5, 1.3,
    ]),
  },
  {
    id: "lights",
    name: "Luces LED",
    hint: "Equivalente a ~8 bombillos LED de 10 W.",
    icon: "💡",
    category: "living",
    watts: 80,
    surgeW: 80,
    defaultHours: 5,
    duty: 1,
    hourlyShare: n([
      0.3, 0.2, 0.1, 0.1, 0.1, 0.4, 1.2, 0.8, 0.3, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3,
      0.5, 1.2, 2.2, 3, 3.2, 2.8, 2.2, 1.4, 0.7,
    ]),
  },
  {
    id: "tv",
    name: "Televisor",
    hint: "LED 40–50 pulgadas, uso nocturno.",
    icon: "📺",
    category: "living",
    watts: 80,
    surgeW: 120,
    defaultHours: 4,
    duty: 1,
    hourlyShare: n([
      0.1, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 0.2, 0.2, 0.2, 0.2, 0.3, 0.4, 0.4,
      0.5, 0.6, 1, 1.8, 2.6, 3, 2.8, 2.2, 1.2, 0.4,
    ]),
  },
  {
    id: "wifi",
    name: "Router / WiFi",
    hint: "24 h. Poco kWh, pero siempre encendido.",
    icon: "📶",
    category: "living",
    watts: 12,
    surgeW: 12,
    defaultHours: 24,
    duty: 1,
    hourlyShare: n(Array.from({ length: 24 }, () => 1)),
  },
  {
    id: "laptop",
    name: "Portátil",
    hint: "Trabajo o estudio. En camping suele ser el segundo gasto.",
    icon: "💻",
    category: "living",
    watts: 65,
    surgeW: 90,
    defaultHours: 6,
    duty: 1,
    hourlyShare: n([
      0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 1, 1.4, 1.5, 1.5, 1.4, 1.3, 1.4, 1.5,
      1.5, 1.4, 1.3, 1.2, 1.1, 0.9, 0.7, 0.4, 0.3,
    ]),
  },
  {
    id: "phones",
    name: "Celular",
    hint: "Cada unidad es un cargador. Casi todo de noche.",
    icon: "📱",
    category: "living",
    watts: 15,
    surgeW: 20,
    defaultHours: 3,
    duty: 1,
    hourlyShare: n([
      2, 2, 1.8, 1.5, 1.2, 0.8, 0.4, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.4,
      0.5, 0.7, 1, 1.4, 1.8, 2.2, 2.4, 2.3,
    ]),
  },
  {
    id: "washer",
    name: "Lavadora",
    hint: "Un ciclo corto. El calentador de agua, si lo tiene, no está incluido.",
    icon: "🫧",
    category: "laundry",
    watts: 500,
    surgeW: 900,
    defaultHours: 1,
    duty: 0.7,
    hourlyShare: n([
      0, 0, 0, 0, 0, 0, 0.2, 0.5, 2.5, 3, 2, 0.8, 0.4, 0.2, 0.2, 0.2, 0.3, 0.4,
      0.3, 0.2, 0.1, 0.1, 0.1, 0,
    ]),
  },
  {
    id: "microwave",
    name: "Microondas",
    hint: "Pocos minutos, pero pide ~1 kW de golpe.",
    icon: "♨️",
    category: "kitchen",
    watts: 1000,
    surgeW: 1200,
    defaultHours: 0.25,
    duty: 1,
    hourlyShare: n([
      0, 0, 0, 0, 0, 0, 0.2, 2, 0.3, 0.2, 0.2, 0.4, 2.2, 0.5, 0.2, 0.2, 0.3, 0.5,
      2.4, 0.8, 0.3, 0.2, 0.1, 0,
    ]),
  },
  {
    id: "shower",
    name: "Ducha eléctrica",
    hint: "Muy común en Colombia. El pico suele matar kits chicos.",
    icon: "🚿",
    category: "laundry",
    watts: 3500,
    surgeW: 3500,
    defaultHours: 0.4,
    duty: 1,
    hourlyShare: n([
      0, 0, 0, 0, 0, 0.2, 3.5, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2,
      0.4, 1.2, 3.2, 0.6, 0.2, 0.1, 0,
    ]),
  },
  {
    id: "campingFridge",
    name: "Nevera camping 12V",
    hint: "Nevera de auto/camping. Cabe en un kit portátil si no abres mucho.",
    icon: "🏕️",
    category: "camping",
    watts: 45,
    surgeW: 120,
    defaultHours: 24,
    duty: 0.6,
    hourlyShare: n([
      4, 4, 4, 4, 4, 4.1, 4.2, 4.3, 4.3, 4.4, 4.5, 4.6, 4.8, 5, 5, 4.8, 4.6, 4.4,
      4.3, 4.2, 4.1, 4, 4, 4,
    ]),
  },
];

export const HOME_PRESET: Record<string, ApplianceUsage> = {
  fridge: { count: 1, hours: 24 },
  lights: { count: 1, hours: 5 },
  tv: { count: 1, hours: 4 },
  wifi: { count: 1, hours: 24 },
  laptop: { count: 1, hours: 6 },
  phones: { count: 2, hours: 3 },
  washer: { count: 1, hours: 1 },
  microwave: { count: 1, hours: 0.25 },
  shower: { count: 1, hours: 0.4 },
};

export const CAMPING_PRESET: Record<string, ApplianceUsage> = {
  campingFridge: { count: 1, hours: 24 },
  lights: { count: 1, hours: 4 },
  phones: { count: 2, hours: 3 },
  laptop: { count: 1, hours: 4 },
  fan: { count: 1, hours: 6 },
};

export function applianceById(id: string): Appliance {
  const found = APPLIANCES.find((a) => a.id === id);
  if (!found) throw new Error(`Aparato desconocido: ${id}`);
  return found;
}

export function usagesFor(
  topology: string,
  home: Record<string, ApplianceUsage>,
  camping: Record<string, ApplianceUsage>,
): Record<string, ApplianceUsage> {
  return topology === "portable" ? camping : home;
}
