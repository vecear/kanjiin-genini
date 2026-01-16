const toggle = document.getElementById('enabled');
const status = document.getElementById('status');

// Load current state
chrome.storage.sync.get(['furiganaEnabled'], (result) => {
    // Default to enabled
    const enabled = result.furiganaEnabled !== false;
    toggle.checked = enabled;
    updateStatus(enabled);
});

// Handle toggle change
toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ furiganaEnabled: enabled }, () => {
        updateStatus(enabled);
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleFurigana',
                    enabled
                });
            }
        });
    });
});

function updateStatus(enabled) {
    status.textContent = enabled ? '✓ 轉換已啟用' : '✗ 轉換已關閉';
}
