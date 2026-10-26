export default function Loading() {
  return (
    <section aria-busy="true">
      <h1 className="text-2xl font-semibold">Money</h1>
      <p role="status" className="py-6 text-sm">
        Opening your jars and expenses…
      </p>
    </section>
  );
}
