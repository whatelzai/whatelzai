import Link from "next/link";
import { memberWorkspace } from "@/lib/member-ai/server";
import { pendingConnection } from "@/lib/member-ai/emdee";
import { connect, confirm, disconnect } from "./actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your knowledge connection",
  robots: { index: false, follow: false },
};
export default async function ConnectionPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const workspace = await memberWorkspace();
  const record = await pendingConnection(workspace.userId);
  const pending = record?.pending.stage === "confirm" ? record.pending : null;
  const query = await searchParams;
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/assistant" className="text-sm underline">
        ← Your assistant
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">
        Your knowledge. Your vault.
      </h1>
      <p className="mt-4 text-sm leading-7 text-zinc-600">
        Connect your own EMDEE account to let your assistant read a collection
        you choose. EMDEE stores your knowledge; AI chat and its allowance live
        here on Whatelzai. Your email can change without changing this
        connection.
      </p>
      {query.result === "failed" && (
        <p role="alert" className="mt-5 rounded-xl bg-yellow-100 p-4">
          Connection could not be verified. Check your account and collection,
          then start again. A vault already linked to someone else cannot be
          reassigned here.
        </p>
      )}
      {query.result === "connected" && (
        <p role="status" className="mt-5">
          Connected and verified.
        </p>
      )}
      {pending ? (
        <section className="mt-7 rounded-2xl border border-yellow-300 bg-yellow-50 p-6">
          <h2 className="font-semibold">Confirm your EMDEE account</h2>
          <p className="mt-3 break-all text-sm">
            Account: {pending.identity.handle ?? pending.identity.subject}
          </p>
          <p className="mt-2 break-all text-xs">
            Vault: {pending.identity.vault_id}
          </p>
          <p className="mt-2 break-all text-sm">
            Collection: {pending.credentials.parentPath}
          </p>
          <p className="mt-4 text-sm">
            Only confirm if this is your account. This creates a permanent
            one-to-one identity link; disconnecting later removes access but
            keeps the identity record.
          </p>
          <form action={confirm}>
            <button className="mt-5 rounded-xl bg-weos-yellow px-5 py-3 font-semibold">
              Yes, this is my vault
            </button>
          </form>
        </section>
      ) : (
        <form action={connect} className="mt-7 rounded-2xl border p-6">
          <h2 className="font-semibold">
            {workspace.vault ? "Reconnect your vault" : "Connect EMDEE"}
          </h2>
          <label htmlFor="collection" className="mt-4 block text-sm">
            EMDEE collection document
          </label>
          <input
            id="collection"
            name="collection"
            defaultValue={workspace.vault?.parent ?? ""}
            placeholder="your-name/personal/DAILY.md"
            required
            maxLength={500}
            className="mt-2 w-full rounded-xl border p-3 text-base"
          />
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Copy the path of an existing collection document from EMDEE. The
            assistant can read that document and its child folder. EMDEE will
            ask you to approve vault read access. Whatelzai limits the assistant
            to this collection.
          </p>
          <button className="mt-5 rounded-xl bg-weos-yellow px-5 py-3 font-semibold">
            Continue to EMDEE
          </button>
        </form>
      )}
      {workspace.vault && (
        <section className="mt-6 rounded-2xl border p-6">
          <h2 className="font-semibold">
            {workspace.vault.connected ? "Connected" : "Access disconnected"}
          </h2>
          <p className="mt-2 break-all text-sm">
            {workspace.vault.handle ?? workspace.vault.id}
          </p>
          {workspace.vault.connected && (
            <form action={disconnect}>
              <button className="mt-4 rounded-lg border px-4 py-2 text-sm">
                Disconnect access
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
