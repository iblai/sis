"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Platform admins can view the app exactly as a member sees it (the OS's
 * User / Admin switch). View preference only — anything that must stay
 * admin-only regardless of the switch keys on `useSession().isAdmin`.
 */
type AdminMode = {
  isAdmin: boolean;
  adminMode: boolean;
  setAdminMode: (on: boolean) => void;
};

const AdminModeContext = createContext<AdminMode>({
  isAdmin: false,
  adminMode: false,
  setAdminMode: () => {},
});

export function AdminModeProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [mode, setMode] = useState(true);
  return (
    <AdminModeContext.Provider
      value={{ isAdmin, adminMode: isAdmin && mode, setAdminMode: setMode }}
    >
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  return useContext(AdminModeContext);
}

/** Admin AND in Admin mode — the gate for Setup, writes and the SDK Management surface. */
export function useIsLiveAdmin() {
  const { isAdmin, adminMode } = useAdminMode();
  return isAdmin && adminMode;
}
