export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  kind: "Follow-up" | "Commitment";
  date: string | null;
  status: string;
};
export function attentionItems(
  leads: {
    id: string;
    name: string;
    next_action: string;
    follow_up_on: string;
  }[],
  tasks: { id: string; title: string; due_on: string | null; status: string }[],
  today: string,
): AttentionItem[] {
  return [
    ...leads.map(
      (lead): AttentionItem => ({
        id: `lead-${lead.id}`,
        title: lead.name,
        detail: lead.next_action || "Choose a thoughtful next step.",
        href: `/leads/${lead.id}`,
        kind: "Follow-up",
        date: lead.follow_up_on,
        status: lead.follow_up_on < today ? "Overdue" : "Due today",
      }),
    ),
    ...tasks.map(
      (task): AttentionItem => ({
        id: `task-${task.id}`,
        title: task.title,
        detail: "An accepted commitment. Review your next step.",
        href: "/assistant/commitments",
        kind: "Commitment",
        date: task.due_on,
        status:
          task.status === "blocked"
            ? "Blocked"
            : task.status === "waiting"
              ? "Waiting"
              : task.due_on && task.due_on < today
                ? "Overdue"
                : "Due today",
      }),
    ),
  ].sort((a, b) => {
    const priority = (item: AttentionItem) =>
      item.status === "Blocked"
        ? 0
        : item.status === "Overdue"
          ? 1
          : item.status === "Due today"
            ? 2
            : 3;
    return (
      priority(a) - priority(b) ||
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      a.id.localeCompare(b.id)
    );
  });
}
export function nextMonth(month: string): string {
  const [year, value] = month.split("-").map(Number);
  return new Date(Date.UTC(year, value, 1)).toISOString().slice(0, 7);
}
