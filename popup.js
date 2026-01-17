const modeRadios = document.querySelectorAll('input[name="mode"]');
const modeOptions = document.querySelectorAll('.mode-option');
const status = document.getElementById('status');
const hotkeySelect = document.getElementById('hotkey-select');

const STATUS_TEXT = {
    off: '✗ 已關閉',
    bracket: '✓ 括號標註模式',
    auto: '✓ 自動標註模式'
};

// Load current mode and hotkey
chrome.storage.sync.get(['furiganaMode', 'hotkeyKey'], (result) => {
    // Default to 'bracket' for backward compatibility
    const mode = result.furiganaMode || 'bracket';
    setMode(mode, false);

    // Load hotkey
    const hotkey = result.hotkeyKey || 'Control';
    hotkeySelect.value = hotkey;
});


// Handle mode option click (clicking the container)
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
    // Update radio
    const radio = document.getElementById(`mode-${mode}`);
    if (radio) radio.checked = true;

    // Update visual selection
    modeOptions.forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.mode === mode);
    });

    // Update status
    status.textContent = STATUS_TEXT[mode] || mode;

    if (notify) {
        // Save to storage
        chrome.storage.sync.set({ furiganaMode: mode }, () => {
            // Notify content script
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
    chrome.storage.sync.set({ hotkeyKey: hotkey }, () => {
        // Notify content script to update hotkey
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'setHotkey',
                    hotkey: hotkey
                });
            }
        });
    });
});
