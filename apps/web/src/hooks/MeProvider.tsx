import { createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { useMeState } from "./meState";

const MeContext = createContext<ReturnType<typeof useMeState> | null>(null);

export function MeProvider() {
  const value = useMeState();
  return (
    <MeContext.Provider value={value}>
      <Outlet />
    </MeContext.Provider>
  );
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) {
    return { isAdmin: false, profile: null, ready: true };
  }
  return ctx;
}
