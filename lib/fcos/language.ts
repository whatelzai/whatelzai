export type MemberLanguage = "en" | "zh";
export const MEMBER_LANGUAGE_COOKIE = "fcos-member-language";
export function isMemberLanguage(value: unknown): value is MemberLanguage {
  return value === "en" || value === "zh";
}
export function memberLanguage(value: unknown): MemberLanguage {
  return isMemberLanguage(value) ? value : "en";
}
// Interface copy only. Never pass stored names, stories, notes or teachings here.
const chinese: Record<string, string> = {
  Profile: "个人",
  Usage: "用量",
  Home: "首页",
  Chat: "聊天",
  Baobeis: "宝贝",
  Resources: "资源",
  Team: "团队",
  "My team": "我的团队",
  Calendar: "日历",
  Products: "产品",
  Culture: "文化",
  "fcOS home": "fcOS 首页",
  "fcOS workspace": "fcOS 工作区",
  "Prepare · connect · grow": "准备 · 连接 · 成长",
  Language: "语言",
  "Interface language": "界面语言",
  "Saving…": "保存中…",
  "Couldn’t save your language. Try again.": "语言设置未能保存，请重试。",
  "Choose English or 简体中文.": "请选择 English 或简体中文。",
  "Sign out": "退出登录",
  "Welcome back,": "欢迎回来，",
  "Current tier:": "当前身份：",
  Unavailable: "暂不可用",
  Unverified: "尚未确认",
  "Member Pass": "会员卡",
  "Your account": "你的账号",
  "View my team": "查看我的团队",
  "Release notes": "更新记录",
  "Back to Profile": "返回个人页面",
  "Loading release notes…": "正在读取更新记录…",
  "What’s new": "最新更新",
  "fcOS updates": "fcOS 更新",
  "Close release notes": "关闭更新记录",
  "Latest three releases": "最近三次更新",
  "View all release notes": "查看全部更新记录",
  "No release notes yet.": "暂无更新记录。",
  "Updates couldn’t be loaded. Please try again.": "未能读取更新记录，请重试。",
  "Try again": "重试",
  "Latest releases": "最新更新",
  "Older releases →": "更早的更新 →",
  "Usage temporarily unavailable": "暂时无法读取用量",
  "Your balance could not be checked. Reload to try again.":
    "未能读取剩余额度，请刷新重试。",
  "AI Chat is currently unavailable.": "AI 聊天暂不可用。",
  "Usage limit resets": "额度重置",
  Available: "可用",
  History: "历史",
  "Full reset used": "已使用完整重置",
  "Full reset expired": "完整重置已过期",
  Expired: "已过期",
  "Admin reset": "管理员重置",
  "No resets used yet.": "暂无重置记录。",
  "Full reset": "完整重置",
  Expires: "到期时间",
  "No resets available.": "暂无可用重置。",
  "Weekly limit": "每周额度",
  "Resetting…": "正在重置…",
  "Use reset": "使用重置",
  "Your seven-day window starts with your first message.":
    "七天周期从你发送第一条消息时开始。",
  "Weekly AI allowance remaining": "本周 AI 剩余额度",
  "Reload to check your available reset.": "请刷新以查看可用重置。",
  "This reset has expired.": "此重置已过期。",
  "Wait for your current reply to finish, then try again.":
    "请等待当前回复完成后再试。",
  "Your allowance or reset may have changed. Reload to check before trying again.":
    "额度或重置可能已更新，请刷新确认后再试。",
  "Full reset used. Your weekly allowance is restored.":
    "完整重置已使用，本周额度已恢复。",
  "Baobei profiles and saved HQH/HHH are visible to your team unless hidden. Your chats stay private. Signing in does not automatically link a team profile.":
    "宝贝档案和已保存的会前会／会后会默认对团队可见，除非设为隐藏。聊天内容保持私密。登录不会自动关联团队身份。",
};
export function memberText(language: MemberLanguage, text: string) {
  return language === "zh" ? (chinese[text] ?? text) : text;
}
