import { timingSafeEqual } from "node:crypto";
export function validPushCronBearer(
  supplied: string,
  secret: string | undefined,
) {
  if (!secret) return false;
  const expected = `Bearer ${secret}`;
  return (
    Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  );
}
