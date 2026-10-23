export type UnitSystem = "metric" | "imperial";

const STORAGE_KEY = "sg4:unit-system";
const CHANGE_EVENT = "sg4:unit-system-change";

export function getUnitSystem(): UnitSystem {
  if (typeof window === "undefined") return "metric";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "imperial" ? "imperial" : "metric";
}

export function setUnitSystem(unitSystem: UnitSystem) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, unitSystem);
  window.dispatchEvent(new CustomEvent<UnitSystem>(CHANGE_EVENT, { detail: unitSystem }));
}

export function subscribeToUnitSystem(onChange: (unitSystem: UnitSystem) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent<UnitSystem>;
    onChange(customEvent.detail === "imperial" ? "imperial" : "metric");
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    onChange(event.newValue === "imperial" ? "imperial" : "metric");
  };

  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export const metersToYards = (meters: number) => meters * 1.0936133;
export const yardsToMeters = (yards: number) => yards / 1.0936133;
export const metersToFeet = (meters: number) => meters * 3.2808399;
export const feetToMeters = (feet: number) => feet / 3.2808399;
export const celsiusToFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;
export const fahrenheitToCelsius = (fahrenheit: number) => ((fahrenheit - 32) * 5) / 9;
