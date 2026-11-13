import { notFound } from "next/navigation";
import { dailyOwner } from "@/lib/daily/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await dailyOwner();
  const { path = [] } = await params;
  const key = path.join("/");
  if (!key) {
    const { redirect } = await import("next/navigation");
    redirect(
      (await import("@/lib/admin-url")).adminUrl("/admin/network-marketing"),
    );
  }
  if (key === "team") {
    const { redirect } = await import("next/navigation");
    redirect((await import("@/lib/admin-url")).adminUrl("/admin/team"));
  }
  if (key === "resources") {
    const { default: View } = await import("@/app/resources/page");
    return <View />;
  }
  if (key === "communities") {
    const { default: View } = await import("@/app/communities/page");
    return <View searchParams={searchParams} />;
  }
  if (key === "briefings") {
    const { default: View } = await import("@/app/briefings/page");
    return <View searchParams={searchParams} />;
  }
  if (path[0] === "briefings" && path.length === 2) {
    const { default: View } = await import("@/app/briefings/[id]/page");
    return (
      <View
        params={Promise.resolve({ id: path[1] })}
        searchParams={searchParams}
      />
    );
  }
  if (key === "leads") {
    const { default: View } = await import("@/app/leads/page");
    return <View searchParams={searchParams} />;
  }
  if (path[0] === "leads" && path.length === 2) {
    const { default: View } = await import("@/app/leads/[id]/page");
    return <View params={Promise.resolve({ id: path[1] })} />;
  }
  if (key === "culture") {
    const { default: View } = await import("@/app/culture/page");
    return <View />;
  }
  if (key === "catalogue") {
    const { default: View } = await import("@/app/catalogue/page");
    return <View />;
  }
  if (key === "calendar") {
    const { default: View } = await import("@/app/calendar/page");
    return <View searchParams={searchParams} />;
  }
  if (key === "calendar/event") {
    const { default: View } = await import("@/app/calendar/event/page");
    return <View searchParams={searchParams} />;
  }
  notFound();
}
