export const RETURN_OFFER_COOKIE = "whatelz_feedback_return";
export type ReturnOfferView = {
  id: string;
  email: string;
  expiresAt: string;
  initialSeconds: number;
  amount: number;
  regularAmount: number;
};
export function offerSeconds(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}
export function offerTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
