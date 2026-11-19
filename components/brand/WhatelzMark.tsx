import identity from "@/public/brand/identity.json";

/** Decorative inside an already-labelled link; use title when displayed alone. */
export function WhatelzMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={identity.viewBox}
      fill="currentColor"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={identity.path} />
    </svg>
  );
}
