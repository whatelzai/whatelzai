import "server-only";
import type { AdminRelease } from "./model";
/** Admin-only product history. Add newest first after verifying shipped behaviour.
 * Keep IDs immutable; publishing a new ID makes it unseen on each device.
 * No private balances, people or operational records belong here. */
export const adminReleases: AdminRelease[] = [
  {
    id: "2026-10-28-entry-date",
    date: "2026-10-28",
    title: "Correct an entry’s date",
    titleZh: "修改账目日期",
    items: [
      {
        en: "Use Edit date on an active Activity entry, without voiding or recreating it.",
        zh: "在明细中直接修改有效账目的日期，无需作废或重建。",
      },
      {
        en: "Totals and exports follow the saved date. Recurring bill schedules stay unchanged.",
        zh: "汇总和导出会使用修改后的日期；固定账单的计划保持不变。",
      },
    ],
  },
  {
    id: "2026-10-28-simple-income",
    date: "2026-10-28",
    title: "Income, without the expense fields",
    titleZh: "收入记录，更简单",
    items: [
      {
        en: "Choose Working, Investment or Business income. Notes are optional, and the receiving account is clearly labelled.",
        zh: "选择工作收入、投资收入或业务收入；备注选填，并明确显示收款账户。",
      },
      {
        en: "Income no longer asks for an expense description or a jar. Allocate it later when you transfer between jars.",
        zh: "记录收入时无需填写支出说明或选择罐子；之后转账时再分配。",
      },
    ],
  },
  {
    id: "2026-10-27-admin-release-history",
    date: "2026-10-27",
    title: "A quieter way to catch up",
    titleZh: "轻松了解最新更新",
    items: [
      {
        en: "The latest three Admin updates appear in a scrollable popup when you return Home.",
        zh: "返回主页时，可在滚动弹窗中查看最近三条后台更新。",
      },
      {
        en: "Close it immediately, or open the full release history in Settings. Seen updates stay closed on this device until a new release.",
        zh: "可以随时关闭，也能在设置中查看完整历史。本设备关闭后，直到新版本发布才会再次提示。",
      },
    ],
  },
  {
    id: "2026-10-27-personal-home",
    date: "2026-10-27",
    title: "Personal, built around your week",
    titleZh: "围绕每一周的个人空间",
    items: [
      {
        en: "Your Mandala direction, one chosen weekly outcome and daily reflection links now have a clear home.",
        zh: "曼陀罗方向、本周选择的一个成果与每日复盘，现在都有清晰的位置。",
      },
      {
        en: "Open money tracking or log an expense directly from Personal, on desktop or phone.",
        zh: "在电脑或手机上，都可从个人页直接打开账本或记一笔支出。",
      },
    ],
  },
  {
    id: "2026-10-27-personal-money",
    date: "2026-10-27",
    title: "Every dollar. Every ringgit.",
    titleZh: "每一元，每一令吉，都有记录",
    items: [
      {
        en: "Track expenses, income and transfers across six jars, keeping original currencies separate.",
        zh: "用六个罐子记录支出、收入与转账，不同币种分别记录。",
      },
      {
        en: "Keep recurring bills in view, record payments and retain a recoverable transaction history. This is a manual tracker, with no bank connection.",
        zh: "查看固定账单、记录已付款项，并保留可恢复的交易历史。这是手动账本，未连接银行。",
      },
    ],
  },
];
