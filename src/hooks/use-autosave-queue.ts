import { useEffect, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { toast } from "sonner";
import { createAutosaveQueue } from "@/lib/autosave-queue";

export function useAutosaveQueue<T>(save: (value: T) => Promise<unknown>) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const [queue] = useState(() => createAutosaveQueue<T>((value) => saveRef.current(value)));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState<"saved" | "pending" | "saving" | "error">("saved");
  const flush = async () => {
    clearTimeout(timer.current);
    if (!queue.hasPending()) return;
    setStatus("saving");
    try { await queue.flush(); setStatus("saved"); }
    catch (error) {
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Isian belum tersimpan. Coba simpan lagi.");
      throw error;
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useBlocker({
    shouldBlockFn: async () => {
      try { await flushRef.current(); return false; } catch { return true; }
    },
    enableBeforeUnload: () => queue.hasPending(),
  });
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") void flushRef.current().catch(() => {});
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      clearTimeout(timer.current);
      void queue.flush().catch(() => toast.error("Isian belum tersimpan; buka kembali halaman untuk memeriksa."));
    };
  }, [queue]);
  return {
    status,
    hasPending: queue.hasPending,
    flush,
    enqueue(key: string, value: T) {
      queue.put(key, value);
      setStatus("pending");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flushRef.current().catch(() => {}), 1000);
    },
  };
}