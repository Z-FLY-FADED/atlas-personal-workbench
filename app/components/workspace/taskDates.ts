export type DailyScopedTask = {
  horizon: string;
  activeOn?: string | null;
};

export function shanghaiDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function isTaskVisibleOnDay(
  task: DailyScopedTask,
  today = shanghaiDateKey(),
) {
  return task.horizon !== "今日" || task.activeOn === today;
}

export function visibleTasksForDay<T extends DailyScopedTask>(
  tasks: T[],
  today = shanghaiDateKey(),
) {
  return tasks.filter((task) => isTaskVisibleOnDay(task, today));
}
