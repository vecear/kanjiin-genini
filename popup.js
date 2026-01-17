const modeRadios = document.querySelectorAll('input[name="mode"]');
const modeOptions = document.querySelectorAll('.mode-option');
const status = document.getElementById('status');
const hotkeySelect = document.getElementById('hotkey-select');
const hotkeyModeRow = document.getElementById('hotkey-mode-row');
const hotkeyModeRadios = document.querySelectorAll('input[name="hotkeyMode"]');
const langSelect = document.getElementById('lang-select');

// Translations for 10 languages
const TRANSLATIONS = {
    en: {
        title: 'Furigana Converter',
        modeOff: 'Off',
        modeOffDesc: 'No conversion',
        modeBracket: 'Bracket-only',
        modeBracketDesc: 'Convert 漢字（ひらがな） format',
        modeAuto: 'Auto-annotate',
        modeAutoDesc: 'Auto-annotate using dictionary',
        hotkeyLabel: 'Hotkey to show annotations',
        hotkeyDisabled: 'Disabled',
        hotkeyHold: 'Hold',
        hotkeyToggle: 'Toggle',
        hotkeyDescHold: 'Hold this key to temporarily show furigana',
        hotkeyDescToggle: 'Press to toggle furigana on/off',
        statusOff: '✗ Off',
        statusBracket: '✓ Bracket-only mode',
        statusAuto: '✓ Auto-annotate mode'
    },
    'zh-TW': {
        title: 'Furigana Converter',
        modeOff: '關閉',
        modeOffDesc: '不做任何轉換',
        modeBracket: '原來就有括號標註',
        modeBracketDesc: '轉換 漢字（ひらがな） 格式',
        modeAuto: '自動標註所有漢字',
        modeAutoDesc: '使用字典自動標註',
        hotkeyLabel: '快捷鍵顯示自動標註',
        hotkeyDisabled: '關閉此功能',
        hotkeyHold: '按住',
        hotkeyToggle: '切換',
        hotkeyDescHold: '按住此鍵時暫時顯示振假名',
        hotkeyDescToggle: '按一下切換振假名顯示',
        statusOff: '✗ 已關閉',
        statusBracket: '✓ 括號標註模式',
        statusAuto: '✓ 自動標註模式'
    },
    'zh-CN': {
        title: 'Furigana Converter',
        modeOff: '关闭',
        modeOffDesc: '不做任何转换',
        modeBracket: '原来就有括号标注',
        modeBracketDesc: '转换 漢字（ひらがな） 格式',
        modeAuto: '自动标注所有汉字',
        modeAutoDesc: '使用字典自动标注',
        hotkeyLabel: '快捷键显示自动标注',
        hotkeyDisabled: '关闭此功能',
        hotkeyHold: '按住',
        hotkeyToggle: '切换',
        hotkeyDescHold: '按住此键时暂时显示振假名',
        hotkeyDescToggle: '按一下切换振假名显示',
        statusOff: '✗ 已关闭',
        statusBracket: '✓ 括号标注模式',
        statusAuto: '✓ 自动标注模式'
    },
    ja: {
        title: 'Furigana Converter',
        modeOff: 'オフ',
        modeOffDesc: '変換しない',
        modeBracket: '括弧付きのみ',
        modeBracketDesc: '漢字（ひらがな）形式を変換',
        modeAuto: '全漢字に自動ルビ',
        modeAutoDesc: '辞書で自動的にルビを付ける',
        hotkeyLabel: 'ルビ表示キー',
        hotkeyDisabled: '無効',
        hotkeyHold: '長押し',
        hotkeyToggle: '切替',
        hotkeyDescHold: 'キーを押している間ルビを表示',
        hotkeyDescToggle: 'キーを押してルビ表示を切替',
        statusOff: '✗ オフ',
        statusBracket: '✓ 括弧付きモード',
        statusAuto: '✓ 自動ルビモード'
    },
    ko: {
        title: 'Furigana Converter',
        modeOff: '끄기',
        modeOffDesc: '변환 안 함',
        modeBracket: '괄호 있는 것만',
        modeBracketDesc: '漢字（ひらがな） 형식 변환',
        modeAuto: '모든 한자 자동 표기',
        modeAutoDesc: '사전으로 자동 표기',
        hotkeyLabel: '후리가나 표시 키',
        hotkeyDisabled: '비활성화',
        hotkeyHold: '누르고 있기',
        hotkeyToggle: '토글',
        hotkeyDescHold: '키를 누르고 있으면 후리가나 표시',
        hotkeyDescToggle: '키를 눌러 후리가나 전환',
        statusOff: '✗ 끄기',
        statusBracket: '✓ 괄호 모드',
        statusAuto: '✓ 자동 표기 모드'
    },
    es: {
        title: 'Furigana Converter',
        modeOff: 'Desactivado',
        modeOffDesc: 'Sin conversión',
        modeBracket: 'Solo con paréntesis',
        modeBracketDesc: 'Convertir formato 漢字（ひらがな）',
        modeAuto: 'Auto-anotar todo',
        modeAutoDesc: 'Anotar automáticamente con diccionario',
        hotkeyLabel: 'Tecla para mostrar',
        hotkeyDisabled: 'Desactivado',
        hotkeyHold: 'Mantener',
        hotkeyToggle: 'Alternar',
        hotkeyDescHold: 'Mantén esta tecla para mostrar furigana',
        hotkeyDescToggle: 'Pulsa para alternar furigana',
        statusOff: '✗ Desactivado',
        statusBracket: '✓ Modo paréntesis',
        statusAuto: '✓ Modo automático'
    },
    pt: {
        title: 'Furigana Converter',
        modeOff: 'Desligado',
        modeOffDesc: 'Sem conversão',
        modeBracket: 'Apenas com parênteses',
        modeBracketDesc: 'Converter formato 漢字（ひらがな）',
        modeAuto: 'Auto-anotar tudo',
        modeAutoDesc: 'Anotar automaticamente com dicionário',
        hotkeyLabel: 'Tecla para mostrar',
        hotkeyDisabled: 'Desativado',
        hotkeyHold: 'Segurar',
        hotkeyToggle: 'Alternar',
        hotkeyDescHold: 'Segure esta tecla para mostrar furigana',
        hotkeyDescToggle: 'Pressione para alternar furigana',
        statusOff: '✗ Desligado',
        statusBracket: '✓ Modo parênteses',
        statusAuto: '✓ Modo automático'
    },
    fr: {
        title: 'Furigana Converter',
        modeOff: 'Désactivé',
        modeOffDesc: 'Aucune conversion',
        modeBracket: 'Parenthèses seulement',
        modeBracketDesc: 'Convertir le format 漢字（ひらがな）',
        modeAuto: 'Annotation automatique',
        modeAutoDesc: 'Annoter automatiquement avec dictionnaire',
        hotkeyLabel: 'Touche pour afficher',
        hotkeyDisabled: 'Désactivé',
        hotkeyHold: 'Maintenir',
        hotkeyToggle: 'Basculer',
        hotkeyDescHold: 'Maintenez cette touche pour afficher furigana',
        hotkeyDescToggle: 'Appuyez pour basculer furigana',
        statusOff: '✗ Désactivé',
        statusBracket: '✓ Mode parenthèses',
        statusAuto: '✓ Mode automatique'
    },
    de: {
        title: 'Furigana Converter',
        modeOff: 'Aus',
        modeOffDesc: 'Keine Umwandlung',
        modeBracket: 'Nur mit Klammern',
        modeBracketDesc: 'Format 漢字（ひらがな） umwandeln',
        modeAuto: 'Alles automatisch',
        modeAutoDesc: 'Automatisch mit Wörterbuch annotieren',
        hotkeyLabel: 'Taste zum Anzeigen',
        hotkeyDisabled: 'Deaktiviert',
        hotkeyHold: 'Halten',
        hotkeyToggle: 'Umschalten',
        hotkeyDescHold: 'Halten Sie diese Taste für Furigana',
        hotkeyDescToggle: 'Drücken zum Umschalten',
        statusOff: '✗ Aus',
        statusBracket: '✓ Klammer-Modus',
        statusAuto: '✓ Automatischer Modus'
    },
    it: {
        title: 'Furigana Converter',
        modeOff: 'Spento',
        modeOffDesc: 'Nessuna conversione',
        modeBracket: 'Solo con parentesi',
        modeBracketDesc: 'Converti formato 漢字（ひらがな）',
        modeAuto: 'Annota tutto',
        modeAutoDesc: 'Annota automaticamente con dizionario',
        hotkeyLabel: 'Tasto per mostrare',
        hotkeyDisabled: 'Disattivato',
        hotkeyHold: 'Tieni premuto',
        hotkeyToggle: 'Alterna',
        hotkeyDescHold: 'Tieni premuto per mostrare furigana',
        hotkeyDescToggle: 'Premi per alternare furigana',
        statusOff: '✗ Spento',
        statusBracket: '✓ Modalità parentesi',
        statusAuto: '✓ Modalità automatica'
    }
};

let currentLang = 'en';
let currentMode = 'bracket';
let currentHotkeyMode = 'hold';

function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS['en'][key] || key;
}

function updateUI() {
    // Update title
    document.querySelector('h1').textContent = t('title');

    // Update mode labels
    document.querySelector('label[for="mode-off"]').textContent = t('modeOff');
    document.querySelector('[data-mode="off"] .mode-desc').textContent = t('modeOffDesc');
    document.querySelector('label[for="mode-bracket"]').textContent = t('modeBracket');
    document.querySelector('[data-mode="bracket"] .mode-desc').textContent = t('modeBracketDesc');
    document.querySelector('label[for="mode-auto"]').textContent = t('modeAuto');
    document.querySelector('[data-mode="auto"] .mode-desc').textContent = t('modeAutoDesc');

    // Update hotkey section
    document.getElementById('hotkey-label').textContent = t('hotkeyLabel');
    hotkeySelect.options[0].textContent = t('hotkeyDisabled');
    document.getElementById('hotkey-mode-hold').textContent = t('hotkeyHold');
    document.getElementById('hotkey-mode-toggle').textContent = t('hotkeyToggle');
    updateHotkeyDesc();

    // Update status
    updateStatus();
}

function updateHotkeyDesc() {
    const desc = document.getElementById('hotkey-desc');
    desc.textContent = currentHotkeyMode === 'hold' ? t('hotkeyDescHold') : t('hotkeyDescToggle');
}

function updateHotkeyModeVisibility() {
    if (hotkeySelect.value === 'disabled') {
        hotkeyModeRow.classList.add('hidden');
    } else {
        hotkeyModeRow.classList.remove('hidden');
    }
}

function updateStatus() {
    const statusMap = {
        off: t('statusOff'),
        bracket: t('statusBracket'),
        auto: t('statusAuto')
    };
    status.textContent = statusMap[currentMode] || currentMode;
}

// Load saved settings
chrome.storage.sync.get(['furiganaMode', 'hotkeyKey', 'hotkeyMode', 'language'], (result) => {
    currentMode = result.furiganaMode || 'bracket';
    currentLang = result.language || 'en';
    currentHotkeyMode = result.hotkeyMode || 'hold';
    const hotkey = result.hotkeyKey || 'disabled';

    setMode(currentMode, false);
    hotkeySelect.value = hotkey;
    langSelect.value = currentLang;

    // Set hotkey mode radio
    const hotkeyModeRadio = document.querySelector(`input[name="hotkeyMode"][value="${currentHotkeyMode}"]`);
    if (hotkeyModeRadio) hotkeyModeRadio.checked = true;

    updateHotkeyModeVisibility();
    updateUI();
});

// Handle mode option click
modeOptions.forEach(option => {
    option.addEventListener('click', () => {
        const mode = option.dataset.mode;
        setMode(mode, true);
    });
});

// Handle radio change
modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            setMode(radio.value, true);
        }
    });
});

function setMode(mode, notify) {
    currentMode = mode;

    // Update radio
    const radio = document.getElementById(`mode-${mode}`);
    if (radio) radio.checked = true;

    // Update visual selection
    modeOptions.forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.mode === mode);
    });

    // Update status
    updateStatus();

    if (notify) {
        chrome.storage.sync.set({ furiganaMode: mode }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'setMode',
                        mode: mode
                    });
                }
            });
        });
    }
}

// Handle hotkey change
hotkeySelect.addEventListener('change', () => {
    const hotkey = hotkeySelect.value;
    updateHotkeyModeVisibility();
    chrome.storage.sync.set({ hotkeyKey: hotkey }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'setHotkey',
                    hotkey: hotkey,
                    hotkeyMode: currentHotkeyMode
                });
            }
        });
    });
});

// Handle hotkey mode change
hotkeyModeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.checked) {
            currentHotkeyMode = radio.value;
            updateHotkeyDesc();
            chrome.storage.sync.set({ hotkeyMode: currentHotkeyMode }, () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'setHotkeyMode',
                            hotkeyMode: currentHotkeyMode
                        });
                    }
                });
            });
        }
    });
});

// Handle language change
langSelect.addEventListener('change', () => {
    currentLang = langSelect.value;
    chrome.storage.sync.set({ language: currentLang });
    updateUI();
});
