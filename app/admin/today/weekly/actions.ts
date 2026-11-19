"use server";
import { dailyOwner } from "@/lib/daily/server";
import { runWeekly } from "@/lib/daily/weekly";
import { revalidatePath } from "next/cache";
export async function prepareWeekly() {
  const owner = await dailyOwner();
  try {
    const status = await runWeekly(owner, new Date(), true);
    revalidatePath("/admin/today/weekly");
    return {
      message:
        status === "disabled"
          ? "API generation is off for your personal workflow."
          : status === "completed"
            ? "Weekly summary saved in EMDEE."
            : status === "empty"
              ? "No entries were found for last week. There is nothing to condense yet."
              : status === "running"
                ? "A run is already in progress. If interrupted, retry after ten minutes."
                : "This week has reached its three-attempt limit. Check Connections before the next week.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Weekly summary could not be prepared.",
    };
  }
}
