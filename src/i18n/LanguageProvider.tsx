import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "ja" | "zh-CN" | "ko";
export type TranslationValues = Record<string, string | number>;

const STORAGE_KEY = "portrait-edit-language";
const locales: Locale[] = ["en", "ja", "zh-CN", "ko"];
const translations: Record<Exclude<Locale, "en">, Record<string, string>> = {
  ja: {
    "Copy link": "リンクをコピー",
    "Copy page link": "ページのリンクをコピー",
    "Link copied": "リンクをコピーしました",
    "Select and copy this link": "このリンクを選択してコピーしてください",
    "Link to copy": "コピーするリンク",
    "Make the issue yours": "自分らしく楽しむ",
    "Read": "読む",
    "Continue on page {page}": "{page}ページから続ける",
    "Read the magazine": "雑誌を読む",
    "Turn the pages, explore the chapters, and return where you left off.": "ページをめくり、章を探し、前回の続きから読み進めましょう。",
    "Open reader": "リーダーを開く",
    "Explore": "探す",
    "Browse {count} studies": "{count}のスタディを見る",
    "Find a visual direction, copy a prompt, or adjust it in Prompt Studio.": "表現の方向性を探し、プロンプトをコピーしたり、Prompt Studioで調整できます。",
    "Explore the archive": "アーカイブを探す",
    "Collect": "集める",
    "Your saved studies ({count})": "保存したスタディ（{count}）",
    "Build your collection": "コレクションを作る",
    "Save studies as you explore. Return to your collection and export it for later.": "気になるスタディを保存し、コレクションに戻ってエクスポートできます。",
    "View saved studies": "保存したスタディを見る",
    "Reading progress and collections are saved in this browser. Export your collection from the archive to keep a copy.": "読書の進捗とコレクションはこのブラウザーに保存されます。アーカイブからコレクションをエクスポートして控えを残せます。",
    Tools: "ツール", "Reader tools": "リーダーツール", "Close tools": "ツールを閉じる",
    "Skip to content": "本文へスキップ", "Independent portrait studies": "独立系ポートレート研究誌",
    "Search commands, pages, and prompts (⌘K / Ctrl+K)": "コマンド、ページ、プロンプトを検索（⌘K / Ctrl+K）", "Search and command palette": "検索とコマンドパレット",
    Search: "検索", Find: "探す", Reader: "リーダー", Archive: "アーカイブ", About: "この出版物について", Publication: "出版物", Language: "言語",
    Auto: "自動", Light: "ライト", Dark: "ダーク", Paper: "ペーパー", Sepia: "セピア", "Midnight Gallery": "ミッドナイトギャラリー",
    "Opening the archive…": "アーカイブを開いています…", "An independent editorial archive.": "独立系エディトリアルアーカイブ",
    "Download Issue 02 PDF ↗": "第2号のPDFをダウンロード ↗", "Issue 01 — The Fashion Issue ↗": "第1号 — ファッション特集 ↗", "Issue 02 — The Prompt Issue": "第2号 — プロンプト特集", "Source & production notes ↗": "ソースと制作ノート ↗",
    "Study removed from {collection}": "「{collection}」からスタディを削除しました", collection: "コレクション",
    "A portrait archive": "ポートレートアーカイブ", "Start reading ↗": "読み始める ↗", "Start from beginning": "最初から読む", "Inside the issue": "本号の内容", "Read The Prompt Issue": "プロンプト特集を読む", "From the archive": "アーカイブから", "All studies ↗": "すべてのスタディ ↗",
    study: "スタディ", studies: "スタディ", pages: "ページ", chapters: "章", "Resume reading · Page {page} ↗": "続きを読む · {page}ページ ↗", "Issue chapters": "本号の章",
    "Front matter (p. 1)": "巻頭ページ（1ページ）", "Front matter": "巻頭ページ", "Table of contents": "目次", Index: "目次", Display: "表示", "Page navigation": "ページ移動", "Previous page": "前のページ", "Next page": "次のページ", "Page number": "ページ番号", "Color theme": "カラーテーマ", Theme: "テーマ", Chapter: "章", "Jump to chapter": "章へ移動", View: "表示方法", "Reading mode": "読書モード", "Original page": "原ページ", "Reading view": "読書ビュー", Zoom: "ズーム", Fit: "全体表示", "Two-page spread": "見開き表示", "Text size": "文字サイズ", "Paper turn sound": "ページをめくる音", "Loop presentation": "スライドショーを繰り返す", Keyboard: "キーボード", "Download original PDF ↗": "オリジナルPDFをダウンロード ↗", Focus: "集中モード", Play: "再生", Pause: "一時停止", "Focus Soundscape": "フォーカス・サウンドスケープ",
    "Prompt anatomy": "プロンプトの構造", "Technical Parameters": "技術パラメーター", "Copy parameter": "パラメーターをコピー", "Copied phrase to clipboard": "フレーズをクリップボードにコピーしました", "Copy unavailable": "コピーできませんでした",
    "The working collection": "制作アーカイブ", "Portrait prompts": "ポートレートプロンプト", "References, language, and the decisions behind an image.": "画像の参考資料、言葉、そして制作上の選択。", "Style / tag": "スタイル／タグ", "All styles": "すべてのスタイル", Model: "モデル", "All models": "すべてのモデル", "Aspect Ratio": "アスペクト比", "All aspect ratios": "すべてのアスペクト比", "Not recorded": "記録なし", "Light, texture, study number…": "光、質感、スタディ番号…",
    "Select Prompts": "プロンプトを選択", "Cancel Selection": "選択をキャンセル", "Clear Selection": "選択を解除", Add: "追加", Cancel: "キャンセル", "Print Contact Sheet 🖨": "コンタクトシートを印刷 🖨", "Preparing sheet…": "シートを準備中…", "Export JSON ↗": "JSONを書き出す ↗", "Export Markdown ↗": "Markdownを書き出す ↗", "Reset all filters ✕": "すべてのフィルターをリセット ✕", "Clear filters": "フィルターを解除", "Tag filters": "タグフィルター", "Tags:": "タグ：", "No studies match these filters. Try a broader search or clear the filters.": "条件に一致するスタディがありません。検索範囲を広げるか、フィルターを解除してください。",
    "Compare 2 studies ⇄": "2件を比較 ⇄", Clear: "解除", "Copy Prompts": "プロンプトをコピー", "Copied!": "コピーしました！", "Batch actions toolbar": "一括操作ツールバー", "Prompt Comparison": "プロンプト比較", "Image Prompt": "画像プロンプト", "Working notes": "制作ノート", "Try this": "試してみる", "Copy prompt": "プロンプトをコピー", Share: "共有", Compare: "比較", "Add to compare": "比較に追加", Comparing: "比較中", Parameters: "パラメーター", "Tags & Style": "タグとスタイル", "Variations to Try": "試してみるバリエーション", "Prompt Studio": "プロンプトスタジオ", "Keyboard Shortcuts": "キーボードショートカット", "Open Command Palette & Search": "コマンドパレットと検索を開く", "Open Table of Contents": "目次を開く", "Close table of contents": "目次を閉じる",
  },
  "zh-CN": {
    "Copy link": "复制链接",
    "Copy page link": "复制页面链接",
    "Link copied": "链接已复制",
    "Select and copy this link": "选择并复制此链接",
    "Link to copy": "要复制的链接",
    "Make the issue yours": "以你的方式探索本期",
    "Read": "阅读",
    "Continue on page {page}": "从第 {page} 页继续",
    "Read the magazine": "阅读杂志",
    "Turn the pages, explore the chapters, and return where you left off.": "翻阅页面、探索章节，并从上次的位置继续阅读。",
    "Open reader": "打开阅读器",
    "Explore": "探索",
    "Browse {count} studies": "浏览 {count} 项作品",
    "Find a visual direction, copy a prompt, or adjust it in Prompt Studio.": "寻找视觉方向、复制提示词，或在 Prompt Studio 中调整。",
    "Explore the archive": "探索档案",
    "Collect": "收藏",
    "Your saved studies ({count})": "已保存的作品（{count}）",
    "Build your collection": "建立你的收藏",
    "Save studies as you explore. Return to your collection and export it for later.": "探索时保存作品，随时返回收藏并导出以备后用。",
    "View saved studies": "查看已保存作品",
    "Reading progress and collections are saved in this browser. Export your collection from the archive to keep a copy.": "阅读进度和收藏保存在此浏览器中。可从档案导出收藏以保留副本。",
    Tools: "工具", "Reader tools": "阅读器工具", "Close tools": "关闭工具",
    "Skip to content": "跳转到正文", "Independent portrait studies": "独立人像编辑档案",
    "Search commands, pages, and prompts (⌘K / Ctrl+K)": "搜索命令、页面和提示词（⌘K / Ctrl+K）", "Search and command palette": "搜索与命令面板",
    Search: "搜索", Find: "查找", Reader: "阅读器", Archive: "档案库", About: "关于", Publication: "刊物", Language: "语言",
    Auto: "自动", Light: "浅色", Dark: "深色", Paper: "纸张", Sepia: "复古棕褐", "Midnight Gallery": "午夜画廊",
    "Opening the archive…": "正在打开档案库…", "An independent editorial archive.": "独立编辑档案",
    "Download Issue 02 PDF ↗": "下载第 02 期 PDF ↗", "Issue 01 — The Fashion Issue ↗": "第 01 期 — 时尚专题 ↗", "Issue 02 — The Prompt Issue": "第 02 期 — 提示词专题", "Source & production notes ↗": "源代码与制作说明 ↗",
    "Study removed from {collection}": "已从“{collection}”中移除作品", collection: "收藏集",
    "A portrait archive": "人像档案", "Start reading ↗": "开始阅读 ↗", "Start from beginning": "从头开始", "Inside the issue": "本期内容", "Read The Prompt Issue": "阅读提示词专题", "From the archive": "来自档案库", "All studies ↗": "查看全部作品 ↗",
    study: "个作品", studies: "个作品", pages: "页", chapters: "章", "Resume reading · Page {page} ↗": "继续阅读 · 第 {page} 页 ↗", "Issue chapters": "本期章节",
    "Front matter (p. 1)": "卷首页（第 1 页）", "Front matter": "卷首页", "Table of contents": "目录", Index: "目录", Display: "显示", "Page navigation": "页面导航", "Previous page": "上一页", "Next page": "下一页", "Page number": "页码", "Color theme": "颜色主题", Theme: "主题", Chapter: "章节", "Jump to chapter": "跳转到章节", View: "视图", "Reading mode": "阅读模式", "Original page": "原始页面", "Reading view": "阅读视图", Zoom: "缩放", Fit: "适应页面", "Two-page spread": "双页跨页", "Text size": "文字大小", "Paper turn sound": "翻页音效", "Loop presentation": "循环播放", Keyboard: "键盘", "Download original PDF ↗": "下载原始 PDF ↗", Focus: "专注模式", Play: "播放", Pause: "暂停", "Focus Soundscape": "专注环境音",
    "Prompt anatomy": "提示词结构", "Technical Parameters": "技术参数", "Copy parameter": "复制参数", "Copied phrase to clipboard": "短语已复制到剪贴板", "Copy unavailable": "无法复制",
    "The working collection": "创作档案", "Portrait prompts": "人像提示词", "References, language, and the decisions behind an image.": "图像背后的参考资料、语言与创作选择。", "Style / tag": "风格／标签", "All styles": "全部风格", Model: "模型", "All models": "全部模型", "Aspect Ratio": "宽高比", "All aspect ratios": "全部宽高比", "Not recorded": "未记录", "Light, texture, study number…": "光线、质感、作品编号…",
    "Select Prompts": "选择提示词", "Cancel Selection": "取消选择", "Clear Selection": "清除选择", Add: "添加", Cancel: "取消", "Print Contact Sheet 🖨": "打印索引图 🖨", "Preparing sheet…": "正在准备索引图…", "Export JSON ↗": "导出 JSON ↗", "Export Markdown ↗": "导出 Markdown ↗", "Reset all filters ✕": "重置所有筛选 ✕", "Clear filters": "清除筛选", "Tag filters": "标签筛选", "Tags:": "标签：", "No studies match these filters. Try a broader search or clear the filters.": "没有符合条件的作品。请扩大搜索范围或清除筛选。",
    "Compare 2 studies ⇄": "比较 2 项 ⇄", Clear: "清除", "Copy Prompts": "复制提示词", "Copied!": "已复制！", "Batch actions toolbar": "批量操作工具栏", "Prompt Comparison": "提示词对比", "Image Prompt": "图像提示词", "Working notes": "创作笔记", "Try this": "尝试此方案", "Copy prompt": "复制提示词", Share: "分享", Compare: "比较", "Add to compare": "加入比较", Comparing: "正在比较", Parameters: "参数", "Tags & Style": "标签与风格", "Variations to Try": "可尝试的变化", "Prompt Studio": "提示词工作室", "Keyboard Shortcuts": "键盘快捷键", "Open Command Palette & Search": "打开命令面板与搜索", "Open Table of Contents": "打开目录", "Close table of contents": "关闭目录",
  },
  ko: {
    "Copy link": "링크 복사",
    "Copy page link": "페이지 링크 복사",
    "Link copied": "링크를 복사했습니다",
    "Select and copy this link": "이 링크를 선택하여 복사하세요",
    "Link to copy": "복사할 링크",
    "Make the issue yours": "나만의 방식으로 즐기기",
    "Read": "읽기",
    "Continue on page {page}": "{page}페이지에서 이어 읽기",
    "Read the magazine": "잡지 읽기",
    "Turn the pages, explore the chapters, and return where you left off.": "페이지와 챕터를 살펴보고 마지막으로 읽던 곳에서 이어 읽으세요.",
    "Open reader": "리더 열기",
    "Explore": "탐색",
    "Browse {count} studies": "스터디 {count}개 둘러보기",
    "Find a visual direction, copy a prompt, or adjust it in Prompt Studio.": "시각적 방향을 찾고 프롬프트를 복사하거나 Prompt Studio에서 조정하세요.",
    "Explore the archive": "아카이브 탐색",
    "Collect": "수집",
    "Your saved studies ({count})": "저장한 스터디 ({count})",
    "Build your collection": "컬렉션 만들기",
    "Save studies as you explore. Return to your collection and export it for later.": "마음에 드는 스터디를 저장하고 컬렉션으로 돌아와 나중을 위해 내보내세요.",
    "View saved studies": "저장한 스터디 보기",
    "Reading progress and collections are saved in this browser. Export your collection from the archive to keep a copy.": "읽기 진행 상황과 컬렉션은 이 브라우저에 저장됩니다. 아카이브에서 컬렉션을 내보내 사본을 보관하세요.",
    Tools: "도구", "Reader tools": "리더 도구", "Close tools": "도구 닫기",
    "Skip to content": "본문으로 건너뛰기", "Independent portrait studies": "독립 포트레이트 편집 아카이브",
    "Search commands, pages, and prompts (⌘K / Ctrl+K)": "명령, 페이지, 프롬프트 검색 (⌘K / Ctrl+K)", "Search and command palette": "검색 및 명령 팔레트",
    Search: "검색", Find: "찾기", Reader: "리더", Archive: "아카이브", About: "소개", Publication: "출판물", Language: "언어",
    Auto: "자동", Light: "라이트", Dark: "다크", Paper: "페이퍼", Sepia: "세피아", "Midnight Gallery": "미드나이트 갤러리",
    "Opening the archive…": "아카이브를 여는 중…", "An independent editorial archive.": "독립 편집 아카이브",
    "Download Issue 02 PDF ↗": "제2호 PDF 다운로드 ↗", "Issue 01 — The Fashion Issue ↗": "제1호 — 패션 특집 ↗", "Issue 02 — The Prompt Issue": "제2호 — 프롬프트 특집", "Source & production notes ↗": "소스 및 제작 노트 ↗",
    "Study removed from {collection}": "‘{collection}’에서 스터디를 삭제했습니다", collection: "컬렉션",
    "A portrait archive": "포트레이트 아카이브", "Start reading ↗": "읽기 시작 ↗", "Start from beginning": "처음부터 읽기", "Inside the issue": "이번 호 소개", "Read The Prompt Issue": "프롬프트 특집 읽기", "From the archive": "아카이브에서", "All studies ↗": "모든 스터디 ↗",
    study: "개 스터디", studies: "개 스터디", pages: "페이지", chapters: "장", "Resume reading · Page {page} ↗": "이어 읽기 · {page}페이지 ↗", "Issue chapters": "이번 호 챕터",
    "Front matter (p. 1)": "앞부분 (1페이지)", "Front matter": "앞부분", "Table of contents": "목차", Index: "목차", Display: "표시", "Page navigation": "페이지 이동", "Previous page": "이전 페이지", "Next page": "다음 페이지", "Page number": "페이지 번호", "Color theme": "색상 테마", Theme: "테마", Chapter: "챕터", "Jump to chapter": "챕터로 이동", View: "보기", "Reading mode": "읽기 모드", "Original page": "원본 페이지", "Reading view": "읽기 화면", Zoom: "확대/축소", Fit: "화면에 맞춤", "Two-page spread": "양면 펼침", "Text size": "글자 크기", "Paper turn sound": "책장 넘기는 소리", "Loop presentation": "슬라이드 반복", Keyboard: "키보드", "Download original PDF ↗": "원본 PDF 다운로드 ↗", Focus: "집중 모드", Play: "재생", Pause: "일시정지", "Focus Soundscape": "집중 사운드스케이프",
    "Prompt anatomy": "프롬프트 구성", "Technical Parameters": "기술 매개변수", "Copy parameter": "매개변수 복사", "Copied phrase to clipboard": "문구를 클립보드에 복사했습니다", "Copy unavailable": "복사할 수 없습니다",
    "The working collection": "작업 컬렉션", "Portrait prompts": "포트레이트 프롬프트", "References, language, and the decisions behind an image.": "이미지 뒤에 있는 레퍼런스, 언어, 그리고 선택들.", "Style / tag": "스타일 / 태그", "All styles": "모든 스타일", Model: "모델", "All models": "모든 모델", "Aspect Ratio": "화면 비율", "All aspect ratios": "모든 화면 비율", "Not recorded": "기록 없음", "Light, texture, study number…": "빛, 질감, 스터디 번호…",
    "Select Prompts": "프롬프트 선택", "Cancel Selection": "선택 취소", "Clear Selection": "선택 지우기", Add: "추가", Cancel: "취소", "Print Contact Sheet 🖨": "컨택트 시트 인쇄 🖨", "Preparing sheet…": "시트를 준비하는 중…", "Export JSON ↗": "JSON 내보내기 ↗", "Export Markdown ↗": "Markdown 내보내기 ↗", "Reset all filters ✕": "모든 필터 초기화 ✕", "Clear filters": "필터 지우기", "Tag filters": "태그 필터", "Tags:": "태그:", "No studies match these filters. Try a broader search or clear the filters.": "필터와 일치하는 스터디가 없습니다. 검색 범위를 넓히거나 필터를 지워보세요.",
    "Compare 2 studies ⇄": "스터디 2개 비교 ⇄", Clear: "지우기", "Copy Prompts": "프롬프트 복사", "Copied!": "복사했습니다!", "Batch actions toolbar": "일괄 작업 도구 모음", "Prompt Comparison": "프롬프트 비교", "Image Prompt": "이미지 프롬프트", "Working notes": "작업 노트", "Try this": "이렇게 시도해 보세요", "Copy prompt": "프롬프트 복사", Share: "공유", Compare: "비교", "Add to compare": "비교에 추가", Comparing: "비교 중", Parameters: "매개변수", "Tags & Style": "태그 및 스타일", "Variations to Try": "시도해 볼 변형", "Prompt Studio": "프롬프트 스튜디오", "Keyboard Shortcuts": "키보드 단축키", "Open Command Palette & Search": "명령 팔레트와 검색 열기", "Open Table of Contents": "목차 열기", "Close table of contents": "목차 닫기",
  },
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: TranslationValues) => string;
}

function normalizeLocale(value?: string): Locale | undefined {
  const language = value?.toLowerCase();
  if (!language) return undefined;
  if (language === "ja" || language.startsWith("ja-")) return "ja";
  if (language === "zh" || language.startsWith("zh-")) return "zh-CN";
  if (language === "ko" || language.startsWith("ko-")) return "ko";
  return undefined;
}

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && locales.includes(saved as Locale)) return saved as Locale;
  } catch {
    /* Continue with browser language when storage is unavailable. */
  }
  if (typeof navigator === "undefined") return "en";
  for (const language of navigator.languages ?? [navigator.language]) {
    const supported = normalizeLocale(language);
    if (supported) return supported;
  }
  return "en";
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => undefined,
  t: (key, values) =>
    values
      ? key.replace(/\{(\w+)\}/g, (match, name: string) =>
          String(values[name] ?? match),
        )
      : key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* The current session still honors the visitor's choice. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "zh-CN" ? "zh-Hans" : locale;
  }, [locale]);
  const t = useCallback((key: string, values?: TranslationValues) => {
    let translated = locale === "en" ? key : translations[locale][key] ?? key;
    if (values)
      translated = translated.replace(/\{(\w+)\}/g, (match, name: string) =>
        String(values[name] ?? match),
      );
    return translated;
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
