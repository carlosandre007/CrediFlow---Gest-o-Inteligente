/// <reference types="vite/client" />

// Declaração para imports ?url do Vite
declare module '*?url' {
  const src: string;
  export default src;
}

// Declaração para imports ?worker do Vite
declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

// Declaração para virtual:pwa-register (vite-plugin-pwa)
declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }): (reloadPage?: boolean) => Promise<void>;
}
