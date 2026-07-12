import { useEffect, useState } from "react";

/** Menunda perubahan value untuk mengurangi burst request saat user mengetik cepat. */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}
