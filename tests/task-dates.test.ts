import assert from "node:assert/strict";
import test from "node:test";
import {
  isTaskVisibleOnDay,
  shanghaiDateKey,
  visibleTasksForDay,
} from "../app/components/workspace/taskDates";

test("uses the Shanghai calendar day around UTC rollover", () => {
  assert.equal(shanghaiDateKey(new Date("2026-09-02T15:59:59Z")), "2026-09-02");
  assert.equal(shanghaiDateKey(new Date("2026-09-02T16:00:00Z")), "2026-09-03");
});

test("hides yesterday's daily tasks but keeps longer-horizon tasks", () => {
  const tasks = [
    { id: 1, horizon: "今日", activeOn: "2026-09-02" },
    { id: 2, horizon: "今日", activeOn: "2026-09-03" },
    { id: 3, horizon: "本周", activeOn: "" },
  ];

  assert.equal(isTaskVisibleOnDay(tasks[0], "2026-09-03"), false);
  assert.deepEqual(
    visibleTasksForDay(tasks, "2026-09-03").map((task) => task.id),
    [2, 3],
  );
});
