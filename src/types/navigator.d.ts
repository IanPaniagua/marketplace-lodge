// Ambient extension — Badging API (navigator.setAppBadge / clearAppBadge)
// is not yet in lib.dom. These declarations silence TS errors without @ts-expect-error.
declare global {
  interface Navigator {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  }
  // WorkerNavigator is the type of `self.navigator` inside a service worker
  interface WorkerNavigator {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  }
}
export {};
