import { nextOccurrence, type RepeatRule } from "../../features/planning/domain/planning";
// Run these statements before changing the original task's done flag, in the same D1 transaction.
export function recurrenceStatements(db: D1Database, owner: string, taskId: number, rule: RepeatRule, activeOn: string, today: string) {
    const due = nextOccurrence(rule, activeOn, today);
    if (!due)
        return [];
    const key = `repeat:${taskId}`;
    return [
        db.prepare(`INSERT INTO tasks (owner_id,title,detail,priority,horizon,date,active_on,project_id,repeat_rule,recurrence_key)
      SELECT owner_id,title,detail,priority,'今日',?,?,project_id,repeat_rule,? FROM tasks WHERE owner_id=? AND id=? AND done=0
      ON CONFLICT(owner_id,recurrence_key) DO NOTHING`).bind(due, due, key, owner, taskId),
        db.prepare(`INSERT INTO task_subtasks (id,owner_id,task_id,title,position)
      SELECT ? || ':' || s.position,s.owner_id,n.id,s.title,s.position FROM task_subtasks s
      JOIN tasks t ON t.id=s.task_id AND t.owner_id=s.owner_id
      JOIN tasks n ON n.owner_id=t.owner_id AND n.recurrence_key=?
      WHERE t.owner_id=? AND t.id=? AND t.done=0 AND s.archived=0 AND changes()>0
      ON CONFLICT(owner_id,task_id,position) DO NOTHING`).bind(crypto.randomUUID(), key, owner, taskId),
    ];
}
