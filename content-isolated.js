(function() {
    'use strict';

    const answerBoxId = 'auto-answer-box';

    const defaultSettings = {
        textColor: '#00ff66',
        bgColor: '#000000',
        borderColor: '#00ff66',
        fontSize: '15',
        fontFamily: 'Arial, sans-serif',
        position: 'top-right',
        customX: null,
        customY: null
    };

    let cachedBoxSettings = { ...defaultSettings };

    chrome.storage.local.get('ed_box_settings', (result) => {
        if (result && result.ed_box_settings) {
            cachedBoxSettings = Object.assign({}, defaultSettings, result.ed_box_settings);
        }
        const box = document.getElementById(answerBoxId);
        if (box) applyBoxStyles(box);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.ed_box_settings) {
            const newVal = changes.ed_box_settings.newValue || {};
            cachedBoxSettings = Object.assign({}, defaultSettings, newVal);
            const box = document.getElementById(answerBoxId);
            if (box) {
                applyBoxStyles(box);
                console.log('[AutoAnswer-ISO] Áp dụng config mới:', cachedBoxSettings);
            }
        }
    });

    function applyBoxStyles(el) {
        const s = cachedBoxSettings;
        let posCss = '';

        if (s.customX !== null && s.customY !== null && !isNaN(s.customX) && !isNaN(s.customY)) {
            posCss = `top: ${s.customY}px; left: ${s.customX}px; right: auto; bottom: auto;`;
        } else {
            posCss = 'top: 10px; right: 10px;';
            if (s.position === 'top-left') posCss = 'top: 10px; left: 10px;';
            if (s.position === 'bottom-right') posCss = 'bottom: 10px; right: 10px;';
            if (s.position === 'bottom-left') posCss = 'bottom: 10px; left: 10px;';
        }

        el.style.cssText = `
            position: fixed; ${posCss} z-index: 99999;
            padding: 10px 14px;
            background-color: ${s.bgColor}cc;
            color: ${s.textColor};
            border: 1px solid ${s.borderColor};
            border-radius: 6px;
            font-family: ${s.fontFamily};
            font-size: ${s.fontSize}px;
            font-weight: bold;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            max-width: 400px;
            word-wrap: break-word;
            cursor: move;
            user-select: none;
        `;
    }

    function displayAnswerOnPage(answers) {
        let answerBox = document.getElementById(answerBoxId);
        if (!answerBox) {
            answerBox = document.createElement('div');
            answerBox.id = answerBoxId;
            const parent = document.body || document.documentElement;
            if (!parent) {
                document.addEventListener('DOMContentLoaded', () => displayAnswerOnPage(answers), { once: true });
                return;
            }
            parent.appendChild(answerBox);
            attachDragHandler(answerBox);
        }
        applyBoxStyles(answerBox);
        answerBox.textContent = `Đáp án: ${answers.join(' / ')}`;
    }

    function clearAnswerDisplay() {
        const box = document.getElementById(answerBoxId);
        if (box) box.remove();
    }

    function attachDragHandler(box) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0;
        let moved = false;

        box.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();

            const rect = box.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            isDragging = true;
            moved = false;

            box.style.left = `${startLeft}px`;
            box.style.top = `${startTop}px`;
            box.style.right = 'auto';
            box.style.bottom = 'auto';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

            const boxW = box.offsetWidth;
            const boxH = box.offsetHeight;
            const maxX = window.innerWidth - boxW;
            const maxY = window.innerHeight - boxH;

            const newLeft = Math.max(0, Math.min(maxX, startLeft + dx));
            const newTop  = Math.max(0, Math.min(maxY, startTop + dy));

            box.style.left = `${newLeft}px`;
            box.style.top = `${newTop}px`;
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            if (!moved) return;

            const rect = box.getBoundingClientRect();
            cachedBoxSettings.customX = Math.round(rect.left);
            cachedBoxSettings.customY = Math.round(rect.top);

            chrome.storage.local.set({ ed_box_settings: cachedBoxSettings }, () => {
                console.log('[AutoAnswer-ISO] Đã lưu vị trí:', {
                    x: cachedBoxSettings.customX,
                    y: cachedBoxSettings.customY
                });
            });
        });
    }

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'ED_ANSWERS_UPDATE' && Array.isArray(data.answers)) {
            displayAnswerOnPage(data.answers);
        } else if (data.type === 'ED_ANSWERS_CLEAR') {
            clearAnswerDisplay();
        }
    });

    let domObserverInstance = null;

    function initDOMObserver() {
        if (domObserverInstance) return;

        const config = { childList: true, subtree: true, attributes: true, characterData: true };
        const observer = new MutationObserver(function() {
            // Tạm thời comment kiểm tra test mode của engdis để box không bị xoá ở trang ets
            // const inTest = document.querySelector('div[title*="Test"], div[title*="review"]') !== null;
            // if (!inTest) clearAnswerDisplay();
        });

        const rootNode = document.documentElement || document.body;
        if (rootNode) {
            try {
                observer.observe(rootNode, config);
                domObserverInstance = observer;
            } catch (e) {
                console.warn('[AutoAnswer-ISO] Không thể observe:', e);
            }
        }

        // ====== TEST: TỰ ĐỘNG HIỆN BOX NGAY KHI MỞ CỬA SỔ ======
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDOMObserver, { once: true });
    } else {
        initDOMObserver();
    }

    window.addEventListener('resize', () => {
        const box = document.getElementById(answerBoxId);
        if (!box) return;
        if (cachedBoxSettings.customX === null) return;

        const boxW = box.offsetWidth;
        const boxH = box.offsetHeight;
        const maxX = window.innerWidth - boxW;
        const maxY = window.innerHeight - boxH;

        const newX = Math.max(0, Math.min(maxX, cachedBoxSettings.customX));
        const newY = Math.max(0, Math.min(maxY, cachedBoxSettings.customY));

        if (newX !== cachedBoxSettings.customX || newY !== cachedBoxSettings.customY) {
            cachedBoxSettings.customX = newX;
            cachedBoxSettings.customY = newY;
            box.style.left = `${newX}px`;
            box.style.top = `${newY}px`;
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDOMObserver, { once: true });
    } else {
        initDOMObserver();
    }

    console.log('[AutoAnswer-ISO] Đã cài đặt (drag enabled).');
})();