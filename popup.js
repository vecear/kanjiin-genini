const modeRadios = document.querySelectorAll('input[name="mode"]');
const modeOptions = document.querySelectorAll('.mode-option');
const status = document.getElementById('status');

const STATUS_TEXT = {
    off: '✗ 已關閉',
    bracket: '✓ 括號標註模式',
    auto: '✓ 自動標註模式'
};

// Load current mode
chrome.storage.sync.get(['furiganaMode'], (result) => {
    // Default to 'bracket' for backward compatibility
    const mode = result.furiganaMode || 'bracket';
    setMode(mode, false);
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
