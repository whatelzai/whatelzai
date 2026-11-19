import { FocusDetail } from "@/components/admin/FocusDetail";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Focus — Admin",
  robots: { index: false, follow: false },
};
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <FocusDetail params={params} lane="network-marketing" />;
}
