import { useState, useEffect, useCallback } from 'react';
import { get, set } from 'idb-keyval';

export function useIndexedDB<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    get(key)
      .then((val) => {
        if (val !== undefined) {
          setStoredValue(val);
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn(`Error reading IndexedDB key "${key}":`, err);
        setIsLoaded(true);
      });
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prevState) => {
        const valueToStore = value instanceof Function ? (value as Function)(prevState) : value;
        set(key, valueToStore).catch((err) =>
          console.warn(`Error setting IndexedDB key "${key}":`, err)
        );
        return valueToStore;
      });
    },
    [key]
  );

  return [storedValue, setValue, isLoaded] as const;
}
