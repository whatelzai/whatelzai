import { dailyOwner } from "@/lib/daily/server";
import { PasskeySettings } from "@/components/admin/PasskeySettings";
export const metadata = {
  title: "Security — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Security() {
  await dailyOwner();
  return (
    <div className="admin-ledger">
      <PasskeySettings />
    </div>
  );
}
