import Link from "@/components/fcos/MemberLink";
import { AppHeader } from "@/components/fcos/AppHeader";
import { MemberNav } from "@/components/culture/MemberNav";
import type { connectionOverview, readSocialPosts } from "@/lib/social/server";
import { callbackUrl, type SocialProvider } from "@/lib/social/model";
import { configure, connect, disconnect, sync } from "./actions";
import { Submit } from "./Submit";
const field =
  "mt-2 min-h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-base outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
const labels = { instagram: "Instagram", linkedin: "LinkedIn" };
export function ConnectionView({
  apps,
  accounts,
  posts,
  message,
}: Awaited<ReturnType<typeof connectionOverview>> & {
  posts: Awaited<ReturnType<typeof readSocialPosts>>;
  message?: string;
}) {
  // Messages are plain text; never render provider error HTML or supplied URLs.
  return (
    <main className="fcos-tab-page mx-auto min-h-dvh max-w-3xl space-y-6 bg-[#f7f6f4] px-5 pb-8 pt-6 text-zinc-950">
      <AppHeader title="Connections" />
      <MemberNav current="/profile" compact persistent accent="orange" />
      <Link
        href="/profile"
        className="inline-flex min-h-11 items-center text-sm text-zinc-500"
      >
        ← Profile
      </Link>
      <p className="text-sm leading-6 text-zinc-500">
        Your accounts, connected privately to fcOS. Read your own recent posts
        in Chat. No posting or messages.
      </p>
      {message && (
        <p role="status" className="rounded-2xl bg-white p-4 text-sm leading-6">
          {message.slice(0, 240)}
        </p>
      )}
      {(["instagram", "linkedin"] as SocialProvider[]).map((provider) => {
        const configured = apps.some((x) => x.provider === provider);
        return (
          <section
            key={provider}
            className="space-y-5 rounded-3xl bg-white p-5 sm:p-7"
          >
            <h2 className="text-xl font-semibold">{labels[provider]}</h2>
            <p className="text-sm leading-6 text-zinc-500">
              {provider === "instagram"
                ? "Connect up to two professional accounts. Authorize each account separately."
                : "Connect your identity. Reading personal posts additionally requires LinkedIn-approved r_member_social access."}
            </p>
            {(provider === "instagram" ? [1, 2] : [1]).map((slot) => {
              const account = accounts.find(
                (x) => x.provider === provider && x.slot === slot,
              );
              const connected = !!account?.account_id;
              return (
                <div
                  key={slot}
                  className="space-y-3 border-t border-zinc-100 pt-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium">
                      {connected
                        ? account.display_name
                        : account?.expected_handle
                          ? `@${account.expected_handle}`
                          : provider === "instagram"
                            ? `Account ${slot}`
                            : "Your LinkedIn"}
                    </h3>
                    <span className="text-xs text-zinc-500">
                      {connected
                        ? "Connected"
                        : configured
                          ? "Ready to connect"
                          : "Setup needed"}
                    </span>
                  </div>
                  {connected ? (
                    <>
                      <p className="text-xs leading-5 text-zinc-500">
                        {account.synced_at
                          ? `Last refreshed ${new Date(account.synced_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}`
                          : "No posts refreshed yet."}
                        {account.expires_at
                          ? ` · Access expires ${new Date(account.expires_at).toLocaleDateString("en-SG", { timeZone: "Asia/Singapore" })}`
                          : ""}
                      </p>
                      {["restricted", "reconnect", "failed"].includes(
                        account.sync_status,
                      ) && (
                        <p className="text-sm text-amber-800">
                          {account.sync_status === "restricted"
                            ? "Post access has not been granted by the provider."
                            : account.sync_status === "reconnect"
                              ? "Access expired or was revoked. Disconnect, then reconnect."
                              : "The last refresh failed. Please try again."}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        <form action={sync}>
                          <input type="hidden" name="id" value={account.id} />
                          <Submit>Refresh posts</Submit>
                        </form>
                        <form action={disconnect}>
                          <input type="hidden" name="id" value={account.id} />
                          <button className="min-h-11 text-sm text-zinc-500 underline underline-offset-4">
                            Disconnect & remove posts
                          </button>
                        </form>
                      </div>
                    </>
                  ) : configured ? (
                    <form action={connect} className="space-y-3">
                      <input type="hidden" name="provider" value={provider} />
                      <input type="hidden" name="slot" value={slot} />
                      {provider === "instagram" && (
                        <label className="block text-sm">
                          Instagram username
                          <input
                            className={field}
                            name="handle"
                            required
                            maxLength={30}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="Username without @"
                            defaultValue={account?.expected_handle ?? ""}
                          />
                        </label>
                      )}
                      <Submit>Connect {labels[provider]}</Submit>
                    </form>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Set up the developer app below to enable Connect.
                    </p>
                  )}
                </div>
              );
            })}
            <details className="border-t border-zinc-100 pt-5">
              <summary className="min-h-11 cursor-pointer text-sm font-medium">
                {configured
                  ? "Edit developer settings"
                  : "Set up developer app"}
              </summary>
              <div className="space-y-4 pt-2">
                <p className="text-xs leading-5 text-zinc-500">
                  Register an app in{" "}
                  <a
                    href={
                      provider === "instagram"
                        ? "https://developers.facebook.com/apps/"
                        : "https://www.linkedin.com/developers/apps"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {provider === "instagram"
                      ? "Meta for Developers"
                      : "LinkedIn Developers"}
                  </a>
                  .{" "}
                  {provider === "instagram"
                    ? "Choose Instagram API with Instagram Login; use its Instagram app ID and secret. Both accounts must have app access during testing."
                    : "Enable Sign In with LinkedIn using OpenID Connect."}{" "}
                  Copy this exact redirect URL:
                </p>
                <code className="block break-all rounded-xl bg-zinc-50 p-3 text-xs">
                  {callbackUrl(provider)}
                </code>
                <form action={configure} className="space-y-4">
                  <input type="hidden" name="provider" value={provider} />
                  <label className="block text-sm">
                    App client ID
                    <input
                      name="clientId"
                      required
                      className={field}
                      autoComplete="off"
                      maxLength={200}
                    />
                  </label>
                  <label className="block text-sm">
                    App client secret
                    <input
                      name="clientSecret"
                      type="password"
                      required
                      className={field}
                      autoComplete="new-password"
                      maxLength={1000}
                    />
                  </label>
                  {provider === "linkedin" && (
                    <label className="flex gap-3 text-sm leading-6">
                      <input
                        type="checkbox"
                        name="readPosts"
                        className="mt-1 h-5 w-5"
                      />
                      This app has approved r_member_social access
                    </label>
                  )}
                  <p className="text-xs leading-5 text-zinc-500">
                    These are developer app credentials, never your account
                    password. They are encrypted in the database and never shown
                    again.
                  </p>
                  <Submit>Save settings</Submit>
                </form>
              </div>
            </details>
          </section>
        );
      })}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent posts</h2>
        {posts.items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Connected posts will appear here after a refresh.
          </p>
        ) : (
          posts.items.map((post, index) => (
            <article key={index} className="space-y-2 rounded-2xl bg-white p-5">
              <p className="text-xs text-zinc-500">
                {new Date(post.published_at).toLocaleDateString("en-SG", {
                  timeZone: "Asia/Singapore",
                })}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {post.body.slice(0, 500)}
              </p>
              {post.permalink && (
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center text-sm underline"
                >
                  Open post ↗
                </a>
              )}
            </article>
          ))
        )}
      </section>
      <p className="text-xs leading-5 text-zinc-500">
        No paid connector has been added. Refreshing uses hosting and database
        resources; asking Chat to analyse posts uses your normal AI allowance.
        Disconnecting removes fcOS access and cached posts. You can also revoke
        access in the provider’s settings.
      </p>
    </main>
  );
}
