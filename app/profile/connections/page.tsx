import { notFound } from "next/navigation";
import {
  connectionOverview,
  readSocialPosts,
  socialOwner,
} from "@/lib/social/server";
import { ConnectionView } from "./View";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Connections · fcOS",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Connections({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  let owner;
  try {
    owner = await socialOwner();
  } catch {
    notFound();
  }
  const [overview, posts, params] = await Promise.all([
    connectionOverview(owner),
    readSocialPosts(owner),
    searchParams,
  ]);
  return (
    <ConnectionView {...overview} posts={posts} message={params.message} />
  );
}
