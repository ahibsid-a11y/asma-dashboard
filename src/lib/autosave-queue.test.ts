import { expect, it } from "bun:test";
import { createAutosaveQueue } from "./autosave-queue";

it("retains latest grades while an earlier save is running", async () => {
  const saved: number[] = [];
  let release: (() => void) | undefined;
  const queue = createAutosaveQueue<number>(async (v) => {
    if (v === 70) await new Promise<void>((resolve) => { release = resolve; });
    saved.push(v);
  });
  queue.put("7A", 70);
  const work = queue.flush();
  queue.put("7A", 85);
  release?.();
  await work;
  expect(saved).toEqual([70, 85]);
  expect(queue.hasPending()).toBe(false);
});
it("retains distinct classes and retries failed saves", async () => {
  let fail = true;
  const saved: string[] = [];
  const queue = createAutosaveQueue<string>(async (v) => {
    if (fail) throw new Error("offline");
    saved.push(v);
  });
  queue.put("7A", "7A:90");
  await expect(queue.flush()).rejects.toThrow("offline");
  queue.put("7B", "7B:80");
  fail = false;
  await queue.flush();
  expect(saved).toEqual(["7A:90", "7B:80"]);
});