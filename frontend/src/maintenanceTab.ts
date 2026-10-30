export const maintenanceTabs = ["recurring", "defects", "actions"] as const;
export type MaintenanceTab = (typeof maintenanceTabs)[number];

const STORAGE_KEY = "maintenanceTab";

export const isMaintenanceTab = (value: string | null): value is MaintenanceTab =>
  maintenanceTabs.some((tab) => tab === value);

/** Link to a tab of the maintenance page, e.g. to return to after saving a form. */
export const maintenancePath = (tab: MaintenanceTab) => `/maintenance?tab=${tab}`;

/** The last used tab, so the navigation reopens it. Remembering is only a convenience. */
export function loadMaintenanceTab(): MaintenanceTab {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isMaintenanceTab(value) ? value : "recurring";
  } catch {
    return "recurring";
  }
}

export function storeMaintenanceTab(tab: MaintenanceTab) {
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // Storage can be unavailable, e.g. in private browsing.
  }
}
