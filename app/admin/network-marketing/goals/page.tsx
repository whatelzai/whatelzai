import QuarterCarousel from "./QuarterCarousel";
import { adminUrl } from "@/lib/admin-url";
import Link from "@/components/admin/AdminLink";

export const metadata = { title: "Quarterly goals — Network Marketing" };

export default function QuarterlyGoals() {
  return <main className="mx-auto max-w-2xl space-y-5 p-4">
    <Link href={adminUrl("/admin/network-marketing")} className="text-sm underline">Network Marketing</Link>
    <h1 className="text-3xl font-semibold">Quarterly goals</h1>
    <p>大会 projection · Start with Edmund, Nicole and Zhi Hao. From 2027 Q1, everyone stays and recruits each quarter. New ABOs begin recruiting the following quarter. Each branch total includes its leader.</p>
    <QuarterCarousel/>
  </main>;
}
