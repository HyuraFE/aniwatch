# Aniwatch — Design Direction Cards

**Date:** 2026-10-25
**Project:** Aniwatch manga/manhwa reader & catalog platform
**Input:** `docs/superpowers/specs/2026-10-25-mangadex-reader-design.md`
**Output format (fixed for all 3):** 1440×900 desktop web prototype, single-file HTML, two views per file (Catalog + Reader demo), toggleable from the top banner.

---

## Direction 1 — Modern Dark Cinematic

**File:** `design-demos/dir-1.html`

| | |
|---|---|
| **逻辑与来源** | 最佳设计师逻辑 × 现实参照。参照系为 Crunchyroll 的深色播放器 + MangaDex V5 的信息密度；设计思维借用了现代流媒体（Netflix/Disney+）的 dark-first 信息架构。 |
| **借的是什么** | ① Netflix 式 dark-first 配色：近黑底 `#08090c`，内容浮起于 `#161922` 卡片面。② 网格密度：4 列卡片网格、章节列表 1 行 1 章的高密度横条。③ 单一强调色（靛蓝 `#6366f1`）承担全部交互态，不出现第二强调色。④ 玻璃拟态只用在 sticky 导航和 reader 浮条（`backdrop-filter: blur`），不铺满全页。 |
| **主角素材** | 真封面图（Unsplash 影楼照模拟漫画封面）+ 真实 MangaDex 章节元数据（One Piece 1196 章 / Solo Leveling 48 章的真实发布节奏）。 |
| **骨架** | Hero  spotlight：左封面卡（3 列）+ 右元数据（9 列），下方接章节列表表。 |
| **胆量花在哪** | Hero 区的点阵网格底纹（`radial-gradient` 24px），让近黑底不至于空。 |
| **form 来自内容的哪里** | 漫画阅读是「沉浸」行为，所以整个界面的第一优先级是把内容抬到最前：底色压到近黑、卡片面比底色亮一档、强调色只给可点的东西。 |

---

## Direction 2 — Tokyo Manga-Zine Editorial

**File:** `design-demos/dir-2.html`

| | |
|---|---|
| **逻辑与来源** | 最佳设计师逻辑 × 东亚设计。设计思维借自吕敬人 / 杉浦康平的书籍装帧方法，以及日式漫画单行本（単行本 / tankobon）的版式传统。 |
| **借的是什么** | ① 刊头（masthead）：大号衬线标题 + 汉字副标题 + 顶部 micro-bar（期号、发行批次），像一本杂志的封面页。② 印章（朱印）：朱红 `#e11d48` 圆形「認定 / OFFICIAL」印，用在官方章节（MANGA Plus）上。③ 表格化元数据：`AUTHOR / PUBLISHER / ORIGIN / STATUS` 四行等宽字体分隔线表格。④ 语言选择器做成「登记表」而非圆角药丸：2px 边框网格。⑤ 双语标题：拉丁文大字 + 汉字小字朱红。 |
| **主角素材** | 真实封面图 + 期刊化排版（引言 blockquote 用斜体衬线）。 |
| **骨架** | 期刊式左右栏：左 4 列（封面 + 元数据表），右 8 列（标题、引言、剧情、语言登记表、动作按钮），下方接「TABLE OF CONTENTS」印刷目录。 |
| **胆量花在哪** | 章节列表做成印刷目录的样子——等宽字体 + 分隔线 + `Read on MangaPlus ↗` 红色描边按钮，完全不像常见的 App 列表。 |
| **form 来自内容的哪里** | 漫画本身就来自杂志印刷（週刊少年ジャンプ）。这个方向是让界面回到内容的出身：单行本的纸张感、刊物的编排、朱印的权威感。 |

---

## Direction 3 — Cyber-Manhwa HUD

**File:** `design-demos/dir-3.html`

| | |
|---|---|
| **逻辑与来源** | 秒数轮盘 + 现实参照。参照系为赛博朋克 HUD 界面与游戏状态面板；轮盘抽中「终端/仪表」风格族后，改造为「猎人系统」隐喻。 |
| **借的是什么** | ① HUD 角标：封面卡四角 L 形青色边框（`border-t-2 border-l-2` 等），像目标锁定框。② 遥测状态行：`[NODE: ONLINE] [LATENCY: 12ms] [API: MANGADEX_V5]` 等宽字体小字。③ 矩阵式语言表：`[LANG_AVAILABILITY_MATRIX]` 四格网格，选中格为青色实底。④ 章节流叫 `FEED // CHAPTER STREAM`，行内用 `[172]` 编号。⑤ 操作按钮写成指令：`▶ INITIALIZE READER (CH. 172)`、`[+] TRACK IN SHELF`。 |
| **主角素材** | 真实封面图 + HUD 边框系统 + 等宽遥测文本。 |
| **骨架** | 单一大面板（cockpit）：左 3 列海报 + 右 9 列遥测元数据，下方接章节流表格。 |
| **胆量花在哪** | 整个界面按「操作台」而非「内容站」组织，登录按钮直接叫 `LOGIN` 而不是「Sign in」。 |
| **form 来自内容的哪里** | 欧漫/韩漫（manhwa）的题材本身就偏科幻、系统、战力等级——「猎人等级」「雷达频率」是这类作品的日常语汇，HUD 不是贴上去的皮肤，是它的语法。 |

---

## Alternates (备选，未做完整版)

| # | 逻辑 | 想法 | 骨架差异 |
|---|---|---|---|
| A4 | 最佳设计师 × 极简主义 | Vercel-style 超大字距标题 + 无限滚动纯网格，无任何卡片框 | 全站改为无边距纯网格 + 悬停浮出信息 |
| A5 | 现实参照 × 折页设计 | 页面左右对折（spread）布局，章节列表占右半页 | 双页对开，滚动时左右页同步翻 |
| A6 | 秒数轮盘 × 报纸细线 | 浅色纸底 + 细线分栏，像报纸的连载区 | 浅底多栏，正文衬线，卡片消失 |

---

## Spec-level decisions visible in all three

All 3 prototypes implement the same product surface, per the spec:

- **Language availability panel** — the spec's headline feature. Each direction renders it differently: dir-1 = rounded pills with count badges; dir-2 = bordered registry grid; dir-3 = HUD matrix. All show `English (count) / Indonesian (count) / …`.
- **Chapter dedup indicator** — dir-1 says "Deduplicated to newest release per chapter number"; dir-2 labels the TOC "DEDUPLICATED INDEX"; dir-3 shows "SORT: DESCENDING (AUTO-DEDUP ACTIVE)".
- **Official external chapters** — the spec's Review Focus #1. dir-1 and dir-3 render a `Read on MangaPlus ↗` badge; dir-2 makes it the primary visual treatment for official chapters.
- **Scanlation group credit** — required by MangaDex AUP. Present in every chapter row in all 3 directions.
- **MangaDex credit** — present in every footer.
- **Reader toggle** — every file has a top banner toggle between Catalog view and Reader view.
- **Zero ads, no fake data** — no ad slots, no fabricated testimonials, no logo walls.
