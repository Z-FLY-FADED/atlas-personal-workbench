import assert from "node:assert/strict";
import test from "node:test";
import {
  isTaskCarriedOver,
  isTaskVisibleOnDay,
  shanghaiDateKey,
  taskPeriodStartKey,
  visibleTasksForDay,
} from "../app/features/tasks/domain/dates";

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

test("uses Monday as the weekly rollover and January 1 as the yearly rollover", () => {
  assert.equal(taskPeriodStartKey("本周", "2026-09-06"), "2026-08-31");
  assert.equal(taskPeriodStartKey("本周", "2026-09-07"), "2026-09-07");
  assert.equal(taskPeriodStartKey("本周", "2026-09-13"), "2026-09-07");
  assert.equal(taskPeriodStartKey("年度", "2026-12-31"), "2026-01-01");
  assert.equal(taskPeriodStartKey("年度", "2027-01-01"), "2027-01-01");
});

test("hides completed tasks from old periods but carries unfinished tasks forward", () => {
  const tasks = [
    { id: 1, horizon: "本周", activeOn: "2026-08-31", done: true },
    { id: 2, horizon: "本周", activeOn: "2026-08-31", done: false },
    { id: 3, horizon: "本周", activeOn: "2026-09-07", done: true },
    { id: 4, horizon: "年度", activeOn: "2025-01-01", done: false },
    { id: 5, horizon: "年度", activeOn: "2025-01-01", done: true },
  ];

  assert.deepEqual(
    visibleTasksForDay(tasks, "2026-09-07").map((task) => task.id),
    [2, 3, 4],
  );
  assert.equal(isTaskCarriedOver(tasks[1], "2026-09-07"), true);
  assert.equal(isTaskCarriedOver(tasks[3], "2026-09-07"), true);
  assert.equal(isTaskCarriedOver(tasks[2], "2026-09-07"), false);
});
