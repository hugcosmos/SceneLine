import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Lang = "en" | "zh";

const translations = {
  nav: {
    home: { en: "Home", zh: "首页" },
    upload: { en: "Upload Script", zh: "上传剧本" },
    history: { en: "History", zh: "练习历史" },
  },

  home: {
    tagline: { en: "Immersive Scene Dialogue Practice", zh: "沉浸式场景对话练习平台" },
    subtitle: {
      en: "Upload scripts, choose a role, and practice dialogue with an AI scene partner. Real-time speech recognition and scoring to improve your delivery.",
      zh: "上传剧本，选择角色，与AI对手戏练习对话。语音识别实时评分，助你提升口语表达。",
    },
    uploadCta: { en: "Upload New Script", zh: "上传新剧本" },
    featureParse: { en: "Script Parsing", zh: "剧本解析" },
    featureParseDesc: {
      en: "Paste dialogue text, auto-detect characters and lines. Supports bilingual scripts.",
      zh: "粘贴对话文本，自动识别角色与台词，支持中英文混合剧本",
    },
    featureVoice: { en: "Voice Practice", zh: "语音练习" },
    featureVoiceDesc: {
      en: "System reads other characters' lines; record yours when it's your turn. Immersive dialogue experience.",
      zh: "系统朗读其他角色台词，轮到你时录音，沉浸式对话体验",
    },
    featureScore: { en: "Real-time Scoring", zh: "实时评分" },
    featureScoreDesc: {
      en: "Instant scoring after speech recognition — pronunciation accuracy to semantic matching.",
      zh: "语音识别后即时评分，从发音准确度到语义匹配全面分析",
    },
    recentScripts: { en: "Recent Scripts", zh: "最近剧本" },
    viewAll: { en: "View All", zh: "查看全部" },
    noScripts: { en: "No scripts yet. Upload one to start practicing.", zh: "还没有剧本，上传一个开始练习吧" },
    uploadScript: { en: "Upload Script", zh: "上传剧本" },
  },

  upload: {
    title: { en: "Upload Script", zh: "上传剧本" },
    scriptTitle: { en: "Script Title", zh: "剧本标题" },
    titlePlaceholder: { en: "Enter script name", zh: "输入剧本名称" },
    language: { en: "Language", zh: "语言" },
    langZh: { en: "Chinese", zh: "中文" },
    langEn: { en: "English", zh: "English" },
    langMixed: { en: "Mixed", zh: "混合" },
    scriptContent: { en: "Script Content", zh: "剧本内容" },
    placeholder: {
      en: `Example format:

Alice: Hi, the weather is great today.
Bob: Yeah, shall we go for a walk in the park?
Alice: Great idea! Let's go.

Supported formats:
• Name: Dialogue (colon)
• Name[Tab]Dialogue`,
      zh: `示例格式：

小明：你好，今天天气真不错。
小红：是啊，要不要去公园走走？
小明：好主意！我们出发吧。

支持格式：
• 角色名：台词（中文冒号）
• 角色名: 台词（英文冒号）
• 角色名[Tab]台词`,
    },
    parsing: { en: "Parsing...", zh: "解析中..." },
    submit: { en: "Submit Script", zh: "提交剧本" },
    preview: { en: "Live Preview", zh: "实时预览" },
    previewHint: {
      en: "Enter script content on the left to see parsed results here.",
      zh: "在左侧输入剧本内容，这里将实时显示解析结果",
    },
    characters: { en: "characters", zh: "个角色" },
    lines: { en: "lines", zh: "句台词" },
    parseFail: { en: "Could not parse dialogue. Please check format.", zh: "未能解析出对话，请检查格式" },
    created: { en: "Script Created", zh: "剧本已创建" },
    createdDesc: { en: "parsed successfully", zh: "解析完成" },
    createFailed: { en: "Creation Failed", zh: "创建失败" },
    untitled: { en: "Untitled Script", zh: "未命名剧本" },
    uploadFile: { en: "Upload File", zh: "上传文件" },
    fileLoaded: { en: "File Loaded", zh: "文件已加载" },
    fileError: { en: "File Error", zh: "文件错误" },
    fileErrorDesc: { en: "Failed to load file. Please try again.", zh: "文件加载失败，请重试。" },
    existing: { en: "Script Already Exists", zh: "剧本已存在" },
    existingDesc: { en: "This script already exists. Redirecting to the existing script...", zh: "该剧本已存在，正在跳转到已有剧本..." },
  },

  detail: {
    notFound: { en: "Script not found or has been deleted.", zh: "剧本不存在或已被删除" },
    backHome: { en: "Back to Home", zh: "返回首页" },
    characters: { en: "characters", zh: "个角色" },
    linesCount: { en: "lines", zh: "句" },
    characterList: { en: "Characters", zh: "角色列表" },
    selectVoice: { en: "Select voice", zh: "选择语音" },
    male1: { en: "Male-1", zh: "男声-1" },
    male2: { en: "Male-2", zh: "男声-2" },
    female1: { en: "Female-1", zh: "女声-1" },
    female2: { en: "Female-2", zh: "女声-2" },
    dialoguePreview: { en: "Dialogue Preview", zh: "对话预览" },
    practiceSetup: { en: "Select Role & Start Practice", zh: "选择角色并开始练习" },
    selectRole: { en: "Select the role you want to play", zh: "选择你要扮演的角色" },
    practiceMode: { en: "Practice Mode", zh: "练习模式" },
    modeFull: { en: "Full Scene", zh: "整段练习" },
    modeLine: { en: "Line by Line", zh: "逐句练习" },
    startPractice: { en: "Start Practice", zh: "开始练习" },
    selectRoleFirst: { en: "Please Select Role", zh: "请选择角色" },
    selectRoleDesc: { en: "Please select a role first.", zh: "请先选择你要扮演的角色" },
    confirmDelete: { en: "Confirm Delete", zh: "确认删除" },
    deleteDesc: { en: "This cannot be undone. Delete", zh: "删除后将无法恢复。确定要删除" },
    cancel: { en: "Cancel", zh: "取消" },
    delete: { en: "Delete", zh: "删除" },
    deleted: { en: "Deleted", zh: "已删除" },
    deletedDesc: { en: "Script deleted.", zh: "剧本已删除" },
    deleteFailed: { en: "Delete Failed", zh: "删除失败" },
    updateFailed: { en: "Update Failed", zh: "更新失败" },
  },

  practice: {
    notFound: { en: "Script not found.", zh: "剧本不存在" },
    backHome: { en: "Back to Home", zh: "返回首页" },
    yourRole: { en: "Your Role", zh: "你的角色" },
    playing: { en: "Playing...", zh: "正在播放..." },
    yourTurn: { en: "Your turn!", zh: "轮到你了！" },
    recording: { en: "Recording...", zh: "正在录音..." },
    recognizing: { en: "Recognizing...", zh: "识别中..." },
    scoring: { en: "Scoring...", zh: "评分中..." },
    recognized: { en: "Recognized", zh: "识别" },
    nextLine: { en: "Next Line", zh: "下一句" },
    play: { en: "Play", zh: "播放" },
    skip: { en: "Skip", zh: "跳过" },
    finished: { en: "Practice Complete!", zh: "练习完成！" },
    avgScore: { en: "Average Score", zh: "平均得分" },
    noRecordings: { en: "No recordings", zh: "没有录音记录" },
    tryAgain: { en: "Try Again", zh: "再来一次" },
    backToScript: { en: "Back to Script", zh: "返回剧本" },
    asrFailed: { en: "Recognition or scoring failed", zh: "识别或评分失败" },
    scoringFailed: { en: "Scoring failed", zh: "评分失败" },
    asrError: { en: "Speech recognition error", zh: "语音识别错误" },
    unknownError: { en: "Unknown error", zh: "未知错误" },
    micDenied: { en: "Cannot access microphone", zh: "无法访问麦克风" },
    micDeniedDesc: { en: "Please allow microphone access in your browser.", zh: "请允许浏览器使用麦克风" },
    error: { en: "Error", zh: "错误" },
    lineNotFound: { en: "Line not found", zh: "台词未找到" },
  },

  scripts: {
    title: { en: "All Scripts", zh: "所有剧本" },
    new: { en: "New Script", zh: "新建剧本" },
    view: { en: "View", zh: "查看" },
  },

  history: {
    title: { en: "Practice History", zh: "练习历史" },
    trend: { en: "Recent Practice Trend", zh: "最近练习趋势" },
    latestRight: { en: "latest →", zh: "最新 →" },
    played: { en: "Role", zh: "扮演" },
    lines: { en: "lines", zh: "句" },
    modeFull: { en: "Full", zh: "整段" },
    modeLine: { en: "Line", zh: "逐句" },
    totalSessions: { en: "Sessions", zh: "练习次数" },
    avgScore: { en: "Average", zh: "平均分" },
    bestScore: { en: "Best", zh: "最高分" },
    noHistory: { en: "No practice records yet.", zh: "还没有练习记录" },
    noHistoryHint: { en: "Records will appear here after completing a practice session.", zh: "完成一次对话练习后，记录会出现在这里" },
    startPractice: { en: "Upload a Script to Start", zh: "上传剧本开始练习" },
    overview: { en: "Overview", zh: "概览" },
    byScript: { en: "By Script", zh: "按剧本" },
    details: { en: "Details", zh: "详情" },
    scriptsUsed: { en: "Scripts", zh: "使用剧本" },
    times: { en: "times", zh: "次" },
    avg: { en: "avg", zh: "平均" },
    practiceAgain: { en: "Practice", zh: "再练习" },
    sessions: { en: "Practices", zh: "练习次数" },
    roles: { en: "Roles", zh: "角色数" },
    lastPracticed: { en: "Last", zh: "上次练习" },
    continue: { en: "Continue", zh: "继续练习" },
  },

  lang: {
    zh: { en: "Chinese", zh: "中文" },
    en: { en: "English", zh: "English" },
    mixed: { en: "Mixed", zh: "混合" },
  },

  notFound: {
    title: { en: "404 — Page Not Found", zh: "404 — 页面不存在" },
    desc: { en: "The page you're looking for doesn't exist.", zh: "您访问的页面不存在。" },
  },
} as const;

type TranslationTree = typeof translations;
type Leaf = { en: string; zh: string };

type FlattenKeys<T, Prefix extends string = ""> = T extends Leaf
  ? Prefix
  : {
      [K in keyof T]: K extends string
        ? FlattenKeys<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
        : never;
    }[keyof T];

export type TranslationKey = FlattenKeys<TranslationTree>;

function getNestedValue(obj: any, path: string): Leaf | undefined {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current as Leaf | undefined;
}

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const leaf = getNestedValue(translations, key);
      if (!leaf) return key;
      return leaf[lang] ?? leaf.en ?? key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
