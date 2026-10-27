import { loadHomeReleaseNotes } from "@/lib/releases/server";
import { ReleasePopup } from "./ReleasePopup";
export async function HomeReleaseNotes() {
  let data;
  try {
    data = await loadHomeReleaseNotes();
  } catch {
    // Optional news never blocks the member’s dashboard or reveals lookup errors.
    return null;
  }
  return data.show ? (
    <ReleasePopup key={data.releases[0].id} releases={data.releases} />
  ) : null;
}
