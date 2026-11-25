import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createDemoApi, resetDemo, subscribeDemo } from "../lib/demo";
import { createLiveApi } from "../lib/live";
import type { Companion, Profile, Stack, TownApi } from "../lib/types";

type Toast = { id: number; text: string; tone: "ok" | "bad" };

type TownValue = {
  ready: boolean;
  demo: boolean;
  asSender: boolean;
  api: TownApi;
  profile: Profile | null;
  companions: Companion[];
  satchel: Stack[];
  glims: number | null;
  banner: string | null;
  toasts: Toast[];
  refresh: () => Promise<void>;
  act: (fn: () => Promise<unknown>, ok?: string) => Promise<boolean>;
  toast: (text: string, tone?: "ok" | "bad") => void;
  resetTown: () => void;
};

const TownContext = createContext<TownValue | null>(null);

function readFlags() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") sessionStorage.setItem("pixelpets-demo", "1");
  if (params.get("as") === "Sender") sessionStorage.setItem("pixelpets-as", "Sender");
  if (params.get("demo") === "0") {
    sessionStorage.removeItem("pixelpets-demo");
    sessionStorage.removeItem("pixelpets-as");
  }
  return {
    demo: sessionStorage.getItem("pixelpets-demo") === "1",
    asSender: sessionStorage.getItem("pixelpets-as") === "Sender",
  };
}

function errText(error: unknown) {
  return error instanceof Error ? error.message : "Something snagged on the quay.";
}

export function TownProvider({ children }: { children: ReactNode }) {
  const boot = useMemo(() => {
    const flags = readFlags();
    const api = flags.demo ? createDemoApi(flags.asSender) : createLiveApi();
    return { flags, api };
  }, []);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [satchel, setSatchel] = useState<Stack[]>([]);
  const [glims, setGlims] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: "ok" | "bad" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await boot.api.getMe();
      setProfile(me);
      if (!me) {
        setCompanions([]);
        setSatchel([]);
        setGlims(null);
      } else {
        const [mine, bag, coins] = await Promise.all([boot.api.myCompanions(), boot.api.satchel(), boot.api.getGlims()]);
        setCompanions(mine);
        setSatchel(bag);
        setGlims(coins);
      }
      setBanner(null);
    } catch (error) {
      setBanner(errText(error));
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, [boot.api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!boot.flags.demo) return;
    return subscribeDemo(() => {
      void refresh();
    });
  }, [boot.flags.demo, refresh]);

  const act = useCallback(
    async (fn: () => Promise<unknown>, ok?: string) => {
      try {
        await fn();
        await refresh();
        if (ok) toast(ok, "ok");
        return true;
      } catch (error) {
        toast(errText(error), "bad");
        return false;
      }
    },
    [refresh, toast],
  );

  const value: TownValue = {
    ready,
    demo: boot.flags.demo,
    asSender: boot.flags.asSender,
    api: boot.api,
    profile,
    companions,
    satchel,
    glims,
    banner,
    toasts,
    refresh,
    act,
    toast,
    resetTown: () => {
      resetDemo();
      window.location.reload();
    },
  };

  return <TownContext.Provider value={value}>{children}</TownContext.Provider>;
}

export function useTown() {
  const value = useContext(TownContext);
  if (!value) throw new Error("The quay is still lighting.");
  return value;
}
