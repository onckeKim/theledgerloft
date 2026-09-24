"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server render and hydration, true once React controls the page.
 * Client-controlled forms stay disabled until then, so anything typed can't be silently replaced
 * by React's initial state (a real risk on slow phones).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
