import type { Priority } from "../../../contracts/workspace";
export function priorityClass(priority: Priority) {
    return priority === "优先"
        ? "urgent"
        : priority === "一般"
            ? "normal"
            : "low";
}
