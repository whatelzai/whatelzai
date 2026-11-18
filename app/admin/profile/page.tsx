import Settings from "../settings/page";
export const metadata = {
  title: "Profile — Admin",
  robots: { index: false, follow: false },
};
export default async function Profile(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <>
      <a
        href="https://app.whatelz.ai/profile"
        className="mb-5 flex min-h-12 items-center rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-medium"
      >
        View weOS as Blaze, Torch or Ember →
      </a>
      <Settings {...props} />
    </>
  );
}
