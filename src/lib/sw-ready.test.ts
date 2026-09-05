import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  awaitServiceWorkerReady,
  isServiceWorkerSupported,
  resetServiceWorkerReadyForTests,
} from "@/lib/sw-ready";

// Le module s'appuie sur navigator.serviceWorker (indisponible en env node) :
// on stubbe la surface minimale utilisée (serviceWorker.ready).

type ReadyRef = { ready: Promise<ServiceWorkerRegistration> };

function installNavigator(opts: {
  supported: boolean;
  ready?: Promise<ServiceWorkerRegistration>;
}) {
  const nav = {
    serviceWorker: opts.supported
      ? { ready: opts.ready ?? new Promise<ServiceWorkerRegistration>(() => {}) }
      : undefined,
  } as unknown as ReadyRef & Navigator;
  vi.stubGlobal("navigator", nav);
  // isServiceWorkerSupported() exige aussi "PushManager" in window.
  vi.stubGlobal("window", opts.supported ? { PushManager: {} } : {});
  return nav;
}

const fakeRegistration = { scope: "/test" } as unknown as ServiceWorkerRegistration;

describe("awaitServiceWorkerReady", () => {
  beforeEach(() => {
    resetServiceWorkerReadyForTests();
    vi.stubGlobal("window", {} as unknown as Window & typeof globalThis); // remplacé par installNavigator
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("rejette immédiatement quand les SW ne sont pas supportés", async () => {
    installNavigator({ supported: false });
    await expect(awaitServiceWorkerReady()).rejects.toThrow(
      /non supportées sur cet appareil/,
    );
  });

  it("résout avec la registration quand le SW est déjà prêt", async () => {
    installNavigator({
      supported: true,
      ready: Promise.resolve(fakeRegistration),
    });
    await expect(awaitServiceWorkerReady()).resolves.toBe(fakeRegistration);
  });

  it("rejette après timeout avec un message qui nomme l'enregistrement manquant", async () => {
    vi.useFakeTimers();
    installNavigator({ supported: true }); // ready pend indéfiniment
    const promise = awaitServiceWorkerReady(100);
    const assertion = expect(promise).rejects.toThrow(/introuvable après 0 s|enregistrement n'a pas eu lieu/);
    vi.advanceTimersByTime(150);
    await assertion;
  });

  it("partage une seule attente (singleton) — plusieurs appelants, un seul ready consommé", async () => {
    const ready = vi.fn(() => Promise.resolve(fakeRegistration));
    installNavigator({ supported: true });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: ready() },
    });
    const [a, b, c] = await Promise.all([
      awaitServiceWorkerReady(),
      awaitServiceWorkerReady(),
      awaitServiceWorkerReady(),
    ]);
    expect(a).toBe(fakeRegistration);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("après un échec, une nouvelle tentative est réellement rejouée (pas d'échec mis en cache)", async () => {
    vi.useFakeTimers();
    installNavigator({ supported: true }); // prête à pendre
    const first = awaitServiceWorkerReady(50);
    vi.advanceTimersByTime(60);
    await expect(first).rejects.toThrow(/introuvable/);

    // Le SW devient disponible entre-temps.
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { ready: Promise.resolve(fakeRegistration) },
    });
    await expect(awaitServiceWorkerReady()).resolves.toBe(fakeRegistration);
  });
});

describe("isServiceWorkerSupported", () => {
  it("false sans navigator.serviceWorker, true avec", () => {
    vi.stubGlobal("window", {} as unknown as Window);
    installNavigator({ supported: false });
    expect(isServiceWorkerSupported()).toBe(false);

    installNavigator({ supported: true });
    expect(isServiceWorkerSupported()).toBe(true);
  });
});
