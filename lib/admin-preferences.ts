export type AdminPreferences = {
  theme: "light" | "dark";
  size: "standard" | "large" | "larger";
  language: "en" | "zh";
};
export const DEFAULT_PREFERENCES: AdminPreferences = {
  theme: "light",
  size: "standard",
  language: "en",
};
export function validPreferences(value: unknown): value is AdminPreferences {
  if (!value || typeof value !== "object") return false;
  const p = value as AdminPreferences;
  return (
    ["light", "dark"].includes(p.theme) &&
    ["standard", "large", "larger"].includes(p.size) &&
    ["en", "zh"].includes(p.language)
  );
}
export const chinese: Record<string, string> = {
  "This week": "本周",
  "My next sprint": "下一次专注冲刺",
  "Focused sprint": "专注冲刺",
  "Accepted for this week": "本周已接受的事项",
  "Daily rhythm": "每日节奏",
  "Evening debrief": "晚间复盘",
  "Weekly closeout": "每周复盘",
  "Start focused sprint": "开始专注冲刺",
  "Leave focus view": "退出专注视图",
  "Choose another": "选择其他事项",
  "Choose my focus": "选择专注事项",
  "Review commitments": "查看承诺事项",
  "Choose one outcome to move forward.": "选择一个要推进的成果。",
  "Your commitments could not be loaded.": "无法读取承诺事项。",
  "One thing at a time. Leaving this view does not complete the task.":
    "一次专注一件事。退出视图不会将事项标记为完成。",
  "No accepted commitment due this week.": "本周暂无到期的已接受事项。",
  "Commitments unavailable.": "无法读取承诺事项。",
  "Open workspace": "打开工作区",
  Accepted: "已接受",
  "Carried forward": "延续事项",
  "Due today": "今天到期",
  Blocked: "受阻",
  Waiting: "等待中",
  "About this week": "关于本周视图",
  "Shows accepted unfinished commitments due by Sunday, including carried work, from the loaded set of up to 100. Weekly aspirations are not automatically accepted tasks.":
    "显示已读取的最多100条记录中，截至周日到期的已接受且未完成事项，包括延续事项。每周愿景不会自动变为已接受任务。",
  "Checking saved entry…": "正在读取记录…",
  "Last complete week · saved": "上一完整周 · 已保存",
  "Last complete week · no saved entry": "上一完整周 · 暂无记录",
  "Choose the next work priority.": "选择下一项工作重点。",
  "Work priorities could not be loaded.": "无法读取工作重点。",
  "Upcoming deadlines": "即将到期",
  "Blockers & handoffs": "阻碍与交接",
  "No upcoming accepted work in the loaded set.":
    "已读取记录中暂无即将到期的已接受工作。",
  "Deadlines unavailable.": "无法读取截止日期。",
  "No accepted blocked or waiting work in the loaded set.":
    "已读取记录中暂无受阻或等待中的已接受工作。",
  "Blockers unavailable.": "无法读取阻碍事项。",
  "Work boundaries": "工作边界",
  "AsiaVerify · weekdays 9am–6pm. Keep work within 40 hours a week; extra hours only for emergencies or incidents.":
    "AsiaVerify · 工作日9点至18点。每周工作控制在40小时内，仅紧急情况或事故时加班。",
  "A dependable job supports the runway. Protect evenings for building the life beyond it.":
    "稳定的工作提供支持，守护晚间时间，建设更广阔的生活。",
  "Product health": "产品状态",
  "Workspace tools": "工作区工具",
  "Reading preferences": "阅读偏好",
  "Notifications & rhythm": "通知与节奏",
  "App & account": "应用与账号",
  "Current focus": "当前专注",
  "Also accepted": "其他已接受事项",
  "No accepted work ready for this block.":
    "当前时段暂无已接受且可执行的事项。",
  "Your saved focus could not be loaded.": "无法读取已保存的专注事项。",
  "Review in Today →": "在今天中查看 →",
  "From your saved entry · proposals remain proposals":
    "来自已保存记录 · 建议不等于承诺",
  "Entry notes": "记录说明",
  "Read complete entry in original order": "按原顺序阅读完整记录",

  "Daily reading": "每日阅读",
  "Morning brief": "晨间简报",
  "Writing & conversations": "写作与交流",
  "Website & identity": "网站与品牌",
  Offers: "服务",
  Portfolio: "作品与经历",
  People: "人员",
  "Activation, account assignment and AI credits.":
    "启用状态、账号关联与 AI 额度。",
  "People & access": "成员与权限",
  "Community & references": "社群与资料",
  "One useful outcome for this work block.": "这段时间，专注一个有用的成果。",
  "AsiaVerify. One work block at a time.": "AsiaVerify。专注当下的工作时段。",
  "People, conversations and the next follow-up.": "关注人、交流与下一次跟进。",
  "Skip to content": "跳到正文",
  "Scheduled now": "当前时段",
  "Time block": "时段",
  "Remove block": "移除时段",
  "Signing out…": "正在退出…",
  "Could not sign out. Try again.": "退出失败，请重试。",
  "Manage website sections and review content activity.":
    "管理网站板块与内容动态。",
  "Manage your AI offerings.": "管理 AI 服务。",
  "Write and publish articles.": "撰写与发布文章。",
  "Manage subscribers and newsletters.": "管理订阅者与通讯。",
  "Manage client feedback.": "管理客户反馈。",
  "Edit the public website.": "编辑公开网站。",
  "Manage portfolio projects.": "管理作品项目。",
  "Manage your public career history.": "管理公开职业经历。",
  "Manage hackathon entries.": "管理黑客松记录。",
  "Manage leadership experience.": "管理领导经历。",
  "Manage mentorship content.": "管理指导内容。",
  "Manage public event content.": "管理公开活动。",
  "Notifications are blocked. Allow Whatelz Admin in your device’s notification settings, then reopen the app.":
    "通知已被阻止。请在设备设置中允许 Whatelz Admin 通知，然后重新打开应用。",
  "Permission wasn’t enabled. You can try again when you’re ready.":
    "通知权限尚未开启，可稍后重试。",
  "Could not enable notifications.": "无法开启通知。",
  "Could not disable notifications. Please retry before closing this page.":
    "无法关闭通知，请在离开此页面前重试。",
  "This device needs to be enabled again.": "请重新为此设备开启通知。",
  "Test accepted by the push service. Check your notifications; device settings and Focus mode can affect delivery.":
    "推送服务已接收测试。请检查通知；设备设置和专注模式可能影响送达。",
  "Test could not be sent.": "无法发送测试。",
  "Notification settings could not be loaded.": "无法读取通知设置。",
  "Notification status is unavailable.": "无法读取通知状态。",

  Settings: "设置",
  "Your preferences.": "偏好设置",
  Users: "用户",
  Home: "首页",
  Overview: "总览",
  Personal: "个人",
  "AI Business": "AI 业务",
  "Network Marketing": "网络营销",
  "Day Job": "本职工作",
  "Your command centre": "你的指挥中心",
  "My profile": "个人资料",
  "Brand & design system": "品牌与设计系统",
  "Your daily rhythm": "日常节奏",
  "Automatic switching": "自动切换",
  "Edit timetable": "编辑时间表",
  "Follow schedule now →": "立即按计划切换 →",
  "Schedule settings →": "时间表设置 →",
  "Following your schedule": "正在按计划切换",
  "Manual choice · until next block": "手动选择 · 持续至下一时段",
  "Automatic switching paused": "自动切换已暂停",
  "Checking schedule…": "正在检查时间表…",
  App: "应用",
  Advanced: "高级",
  "Your account": "账户",
  "Sign out": "退出登录",
  "MCP & API access →": "MCP 与 API 访问 →",
  Appearance: "外观",
  Language: "语言",
  "Text size": "文字大小",
  Light: "浅色",
  Dark: "深色",
  Standard: "标准",
  Large: "大",
  Larger: "更大",
  "Push notifications": "推送通知",
  "Notification options": "通知选项",
  "Updating…": "正在更新…",
  "Checking this device…": "正在检查此设备…",
  "Not enabled on this device": "此设备未启用",
  "Enabled on this device": "此设备已启用",
  "Blocked in device settings": "已在设备设置中阻止",
  "Status unavailable": "状态不可用",
  "Not supported in this browser": "此浏览器不支持",
  "Open your installed app to enable": "请打开已安装的应用以启用",
  "Allow notifications in your phone or browser settings.":
    "请在手机或浏览器设置中允许通知。",
  "Push delivery is unavailable.": "推送服务暂不可用。",
  "Open the installed app to enable notifications.":
    "请打开已安装的应用以启用通知。",
  "Saved routines and scheduled space changes. This device only.":
    "接收简报就绪与计划时段切换通知。仅适用于此设备。",
  "Send test notification": "发送测试通知",
  "Notifications on.": "通知已开启。",
  "Notifications off.": "通知已关闭。",
  "Sound: long-press a notification on your Vivo, open its notification settings and look for Sound. The available options depend on your phone and browser; custom sounds cannot be set here.":
    "声音：长按 Vivo 手机上的通知，打开通知设置并查找声音选项。可用选项取决于手机和浏览器；此处无法设置自定义声音。",
  "Timetable alerts haven’t synced. Reopen Admin online to retry.":
    "时间表提醒尚未同步。请联网后重新打开 Admin 重试。",
  "Routine alerts need attention.": "例行提醒需要检查。",
  "Check connection →": "检查连接 →",
  "Asia/Singapore · saved on this device": "新加坡时间 · 保存在此设备",
  "Mon–Fri": "周一至周五",
  "Sat–Sun": "周六至周日",
  Days: "日期",
  Starts: "开始",
  Ends: "结束",
  Space: "工作空间",
  "Add time block": "添加时段",
  "When I manually choose a space": "手动选择工作空间时",
  "Keep it until the next time block": "保持到下一时段",
  "Keep it until I resume automatic switching": "保持到我恢复自动切换",
  "Save timetable": "保存时间表",
  "Load defaults": "载入默认设置",
  "Schedule saved on this device.": "时间表已保存在此设备。",
  "Saved for this session; browser storage is unavailable.":
    "已保存至本次会话；浏览器存储不可用。",
  "Defaults loaded for review. Save to apply them.":
    "已载入默认设置，请保存以应用。",
  "Check that every block ends after it starts and that times on the same days do not overlap.":
    "请检查结束时间晚于开始时间，且同一天的时段不重叠。",
  "End time 00:00 means midnight at the end of the day. Split overnight schedules into separate blocks.":
    "结束时间 00:00 表示当天结束时的午夜。跨夜安排请拆分为两个时段。",
  "Schedule saved locally. Push alerts haven’t synced; reopen Admin online to retry.":
    "时间表已保存在本机。推送提醒尚未同步，请联网后重新打开 Admin 重试。",
  "Install Admin": "安装 Admin",
  Installed: "已安装",
  Install: "安装",
  Today: "今天",
  "Weekly reflection": "每周回顾",
  "Your routines": "例行流程",
  "Logo, colours and brand assets.": "标志、颜色与品牌素材。",
  "Manage your profile and related website content.":
    "管理个人资料与网站内容。",
  "Your Whatelz website, offerings and marketing content. Product metrics are available in Overview.":
    "管理 Whatelz 网站、服务与营销内容。产品数据可在总览中查看。",
  "Website dashboard": "网站仪表盘",
  Services: "服务",
  Blog: "博客",
  Newsletter: "通讯",
  Testimonials: "客户评价",
  Homepage: "网站首页",
  Projects: "项目",
  Career: "职业经历",
  Hackathons: "黑客松",
  Leadership: "领导经历",
  Mentorship: "指导经历",
  Events: "活动",
  "Your morning brief, evening closeout and commitments.":
    "晨间简报、晚间复盘与待办承诺。",
  "Step back and read the week as a whole.": "回顾一周的整体进展。",
  "The practices behind your daily rhythm.": "支撑日常节奏的例行流程。",
  "A little space for yourself. Read your daily brief, reflect, and decide what deserves your attention.":
    "留一点空间给自己。阅读简报、回顾，并决定什么值得关注。",
  "Preferences saved for this session only.": "偏好仅保存在本次会话中。",
};
export const translate = (
  text: string,
  language: AdminPreferences["language"],
) => (language === "zh" ? (chinese[text] ?? text) : text);
