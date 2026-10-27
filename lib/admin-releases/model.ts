import { cleanAdminPath } from "@/lib/admin-navigation";
export type AdminRelease = {
  id: string;
  date: string;
  title: string;
  titleZh: string;
  items: { en: string; zh: string }[];
};
export function releaseHome(path: string) {
  return ["/", "/ai-business", "/network-marketing", "/day-job"].includes(
    cleanAdminPath(path),
  );
}
export const releaseReceiptKey = (owner: string) =>
  `whatelz-admin-release-v1:${owner}`;
