# Agent Kanji Furigana Converter

Chrome 擴充程式，自動將括號內的平假名轉換為漢字上方的振假名（ルビ）標註。

![Demo](icons/icon128.png)

## 功能

將這種格式：
```
先週（せんしゅう）の試験（しけん）
```

自動轉換為 HTML ruby 標註，讓平假名顯示在漢字正上方。

### 支援格式

| 格式 | 範例 |
|------|------|
| 全形括號 | `隣（となり）` |
| 半形括號 | `隣(となり)` |
| 含空格 | `隣 （となり）` |
| 括號內空格 | `隣 ( となり )` |

### 智慧分割標註

使用 **KANJIDIC 完整字典**（13,108 個漢字）精確分割 furigana 位置：

| 輸入 | 分割結果 |
|------|---------|
| `強化（きょうか）` | 強=きょう, 化=か |
| `漢字（かんじ）` | 漢=かん, 字=じ |
| `教育（きょういく）` | 教=きょう, 育=いく |
| `日本語（にほんご）` | 日=に, 本=ほん, 語=ご |

**特色**：
- 13,108 個漢字的完整音讀 (on'yomi) 和訓讀 (kun'yomi)
- 自動處理濁音/半濁音變化（如 し↔じ, か↔が）
- 數字讀音支援（一二三 → いちにさん）

## 安裝

1. 下載或 clone 此 repo
2. 打開 Chrome，前往 `chrome://extensions/`
3. 開啟右上角「開發者模式」
4. 點擊「載入未封裝項目」
5. 選擇此專案資料夾

## 使用

- 擴充程式預設**啟用**
- 點擊工具列上的擴充圖示可開關功能
- 設定會自動儲存

## 檔案結構

```
├── manifest.json       # 擴充程式設定
├── content.js          # 主要轉換邏輯
├── kanji_dict.js       # KANJIDIC 字典 (13,108 漢字)
├── styles.css          # Ruby 標註樣式
├── popup.html          # 開關介面
├── popup.js            # 開關邏輯
└── icons/              # 圖示
```

## 字典來源

漢字讀音資料來自 [KANJIDIC](http://www.edrdg.org/wiki/index.php/KANJIDIC_Project) 專案，經由 [davidluzgouveia/kanji-data](https://github.com/davidluzgouveia/kanji-data) 轉換為 JSON 格式。

## License

MIT
