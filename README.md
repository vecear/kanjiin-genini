# Agent Kanji Furigana Converter

A Chrome extension that automatically converts hiragana in parentheses to ruby furigana annotations above kanji. Supports three modes: Off, Bracket-only, and Auto-annotate.

![Demo](icons/icon128.png)

## Features

### Three Modes

| Mode | Description |
| :--- | :--- |
| **Off** | No conversion - use hotkey to temporarily show annotations |
| **Bracket-only** | Convert `漢字（ひらがな）` format only |
| **Auto-annotate** | Automatically add furigana to all kanji |

### Layered Dictionary Priority (Auto Mode)

The extension uses a multi-layered dictionary priority system to ensure the most accurate readings are used first:

1. **Place Names** (`place_dict.js`): Comprehensive list of Japanese prefectures, cities, and landmarks with special readings (jukujikun).
2. **Person Names** (`name_dict.js`): **44,000+ names** covering historical figures (e.g., Oda Nobunaga), modern politicians, and celebrities (actors, singers).
3. **Common Compounds** (`common_dict.js`): Curated list of high-priority words and irregular readings (e.g., 今日, 台風, weather terms).
4. **Core Vocabulary** (`core_dict.js`): **5,500+ JLPT N1-N5 words** sourced from JMdict with pre-split character-level alignment.
5. **Single Kanji** (`kanji_dict.js`): Fallback dictionary containing 13,108 kanji for words not found in higher-priority lists.

### Precise Furigana Alignment

The extension ensures that furigana is perfectly aligned with individual kanji characters, even for complex compounds. For core vocabulary, the readings are pre-split to guarantee 100% accuracy without runtime overhead.

### Bracket-only Mode

Converts this format:

```text
先週（せんしゅう）の試験（しけん）
```

Into HTML ruby annotations, displaying kana directly above the text.

#### Supported Formats

| Format | Example |
| :--- | :--- |
| Full-width parentheses | `隣（となり）` |
| Half-width parentheses | `隣(となり)` |
| With spaces | `隣 （となり）` |
| Spaces inside parentheses | `隣 ( となり )` |
| Mixed kanji+kana words | `受ける（うける）` → 受=う + ける |

### Hotkey to Show Annotations

> **Note**: The hotkey feature is only available when the main mode is set to **Off**. This allows you to keep the page clean by default and temporarily show annotations when needed.

| Setting | Description |
| :--- | :--- |
| Default | Disabled |
| Available keys | Control / Alt / Shift / Meta (⌘/⊞) |
| **Hold mode** | Hold the key to show annotations, release to hide |
| **Toggle mode** | Press once to show, press again to hide |
| **Trigger mode** | Choose which annotation style to trigger (Bracket-only or Auto-annotate) |

**Usage scenario**: Set the main mode to "Off" for a clean reading experience, then press and hold (or toggle) the hotkey to temporarily reveal furigana when you encounter unfamiliar kanji.

### Multi-Language Support

The extension UI supports 10 languages:

English, 繁體中文, 简体中文, 日本語, 한국어, Español, Português, Français, Deutsch, Italiano

### Smart Furigana Splitting

Precisely splits furigana positions:

| Input | Result |
| :--- | :--- |
| `強化（きょうか）` | 強=きょう, 化=か |
| `漢字（かんじ）` | 漢=かん, 字=じ |
| `教育（きょういく）` | 教=きょう, 育=いく |
| `日本語（にほんご）` | 日=に, 本=ほん, 語=ご |
| `受け付ける（うけつける）` | 受=う, け, 付=つ, ける |

**Features**:

- Complete on'yomi and kun'yomi readings for 13,108 kanji
- Automatic handling of voiced/semi-voiced sound changes (e.g., し↔じ, か↔が)
- Number reading support (一二三 → いちにさん)
- Mixed kanji+kana word support (e.g., 食べる, 読み方)

## Installation

1. Download or clone this repo
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select this project folder

## Usage

1. Click the extension icon in the toolbar
2. Select a mode:
   - **Off**: No annotations (hotkey section appears for temporary viewing)
   - **Bracket-only**: Only convert existing parenthesized readings
   - **Auto-annotate**: Add furigana to all kanji automatically
3. If using "Off" mode, configure a hotkey to temporarily show annotations
4. Settings are saved automatically

## File Structure

```text
├── manifest.json       # Extension configuration
├── content.js          # Main conversion logic
├── place_dict.js       # Place names dictionary
├── name_dict.js        # Person names dictionary (Historical/Modern)
├── common_dict.js      # Common words and priority overrides
├── core_dict.js        # Core JLPT N1-N5 vocabulary (5,500+ words)
├── kanji_dict.js       # KANJIDIC fallback dictionary (13,108 kanji)
├── styles.css          # Ruby annotation styles
├── popup.html          # Settings interface
├── popup.js            # Settings logic
└── icons/              # Icons
```

## Dictionary Sources

- **KANJIDIC**: Primary kanji reading data.
- **JLPT Vocabulary**: [tentoumushii/yomitan-jlpt-vocab-json](https://github.com/tentoumushii/yomitan-jlpt-vocab-json).
- **JMdict Furigana**: [Doublevil/JmdictFurigana](https://github.com/Doublevil/JmdictFurigana) for precise alignment.

## License

MIT

---

# Agent Kanji Furigana Converter (中文版)

Chrome 擴充程式，自動將括號內的平假名轉換為漢字上方的振假名（ルビ）標註。支援三種模式：關閉、括號標註、自動標註。

![Demo](icons/icon128.png)

## 功能

### 三種模式

| 模式 | 說明 |
| :--- | :--- |
| **關閉** | 不做任何轉換，可使用快捷鍵臨時顯示標註 |
| **括號標註** | 只轉換 `漢字（ひらがな）` 格式 |
| **自動標註** | 自動為所有漢字添加振假名 |

### 多層級字典優先級 (自動模式)

本擴充程式使用多層級字典系統，確保最精確的讀法優先顯示：

1. **地名標註** (`place_dict.js`)：完整的日本都道府縣、城市和名勝，包含熟字訓讀法。
2. **人名標註** (`name_dict.js`)：收錄 **44,000+** 筆資料，包含歷史人物（如：織田信長）、現代政治人物及藝人歌手。
3. **常用詞彙** (`common_dict.js`)：收錄高頻率詞彙與特殊讀音（如：今日、台風、天氣相關術語）。
4. **核心字典** (`core_dict.js`)：**5,500+ 個 JLPT N1-N5 詞彙**，源自 JMdict 並經過精確的字符級對齊處理。
5. **單字字典** (`kanji_dict.js`)：包含 13,108 個漢字的備用字典，用於處理未出現在高優先級清單中的漢字。

### 精確的振假名對齊

本程式確保振假名能精確地與每個漢字對齊，即使是複雜的複合詞。對於核心字典，讀音已預先完成分割，確保 100% 的準確性，且不影響執行速度。

### 括號標註模式

將這種格式：

```text
先週（せんしゅう）の試験（しけん）
```

自動轉換為 HTML ruby 標註，讓假名顯示在文字正上方。

#### 支援格式

| 格式 | 範例 |
| :--- | :--- |
| 全形括號 | `隣（となり）` |
| 半形括號 | `隣(となり)` |
| 含空格 | `隣 （となり）` |
| 括號內空格 | `隣 ( となり )` |
| 漢字假名混合詞 | `受ける（うける）` → 受=う + ける |

### 快捷鍵顯示標註

> **注意**：快捷鍵功能只在主模式設為「**關閉**」時才會出現。這讓你可以保持頁面乾淨，只在需要時臨時顯示標註。

| 設定 | 說明 |
| :--- | :--- |
| 預設 | 關閉此功能 |
| 可選快捷鍵 | Control / Alt / Shift / Meta (⌘/⊞) |
| **按住模式** | 按住顯示標註，放開隱藏 |
| **切換模式** | 按一下顯示，再按一下隱藏 |
| **觸發模式** | 選擇要觸發的標註方式（括號標註或自動標註） |

**使用情境**：將主模式設為「關閉」以獲得乾淨的閱讀體驗，遇到不熟悉的漢字時，按住（或切換）快捷鍵即可臨時顯示振假名。

### 多語言支援

擴充程式介面支援 10 種語言：

English, 繁體中文, 简体中文, 日本語, 한국어, Español, Português, Français, Deutsch, Italiano

### 智慧分割標註

精確分割 furigana 位置：

| 輸入 | 分割結果 |
| :--- | :--- |
| `強化（きょうか）` | 強=きょう, 化=か |
| `漢字（かんじ）` | 漢=かん, 字=じ |
| `教育（きょういく）` | 教=きょう, 育=いく |
| `日本語（にほんご）` | 日=に, 本=ほん, 語=ご |
| `受け付ける（うけつける）` | 受=う, け, 付=つ, ける |

**特色**：

- 13,108 個漢字的完整音讀 (on'yomi) 和訓讀 (kun'yomi)
- 自動處理濁音/半濁音變化（如 し↔じ, か↔が）
- 數字讀音支援（一二三 → いちにさん）
- 漢字假名混合詞支援（如：食べる、読み方）

## 安裝

1. 下載或 clone 此 repo
2. 打開 Chrome，前往 `chrome://extensions/`
3. 開啟右上角「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇此專案資料夾

## 使用方式

1. 點擊工具列上的擴充圖示
2. 選擇模式：
   - **關閉**：不顯示標註（會出現快捷鍵設定區，用於臨時查看）
   - **括號標註**：只轉換原本就有括號標註的文字
   - **自動標註**：自動為所有漢字加上振假名
3. 如果使用「關閉」模式，可設定快捷鍵來臨時顯示標註
4. 設定會自動儲存

## 檔案結構

```text
├── manifest.json       # 擴充程式設定
├── content.js          # 主要轉換邏輯
├── place_dict.js       # 地名語法字典
├── name_dict.js        # 人名語法字典
├── common_dict.js      # 常用詞與優先權設定
├── core_dict.js        # 核心 JLPT N1-N5 詞彙 (5,500+ 詞)
├── kanji_dict.js       # KANJIDIC 備用字典 (13,108 漢字)
├── styles.css          # Ruby 標註樣式
├── popup.html          # 設定介面
├── popup.js            # 設定邏輯
└── icons/              # 圖示
```

## 字典來源

- **KANJIDIC**: 主要漢字讀音資料。
- **JLPT Vocabulary**: [tentoumushii/yomitan-jlpt-vocab-json](https://github.com/tentoumushii/yomitan-jlpt-vocab-json).
- **JMdict Furigana**: [Doublevil/JmdictFurigana](https://github.com/Doublevil/JmdictFurigana) 以實現精確分割。

## 授權條款

MIT
