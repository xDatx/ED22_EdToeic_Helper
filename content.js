(function() {
    'use strict';

    window.myBearerToken = localStorage.getItem('myBearerToken') || null;
    window.myEduSessionKey = localStorage.getItem('myEduSessionKey') || null;
    let lastProcessedItemKey = null;

    // Pattern 1: Engdis
    const engdisPattern = /https:\/\/[a-zA-Z0-9.-]*engdis\.com\/api\/practiceManager\/GetItem\/(\d+)\/([a-zA-Z0-9]+)\/(\d+)\/0\/(\d+)\/\?_=\d+/;

    // Pattern 2: TOEIC SBC — CHÚ Ý: viewMode (không phải viewModel)
    const toeicSbcPattern = /https?:\/\/[a-zA-Z0-9.-]*toeicsbc\.com\/LearningService\.svc\/script\/GetItem\?itemId=(\d+)&itemCode=([a-zA-Z0-9]+)&itemType=(\d+)&viewMode=(\d+)&userTestId=(\d+)/i;

    function clickNextButton() {
        const nextButton = document.querySelector('#learning__nextItem, #learning__submitTestItem, #btnNext, .nextBtn, a.next');
        if (nextButton) {
            nextButton.click();
            console.log("[AutoAnswer-MAIN] Đã nhấn 'Next'.");
        }
    }

    async function processAndFetchAnswers(originalUrl, type) {
        let modifiedUrl = originalUrl;
        const headers = { 'Content-Type': 'application/json' };

        if (type === 'ENGDIS') {
            if (!window.myBearerToken) return;
            modifiedUrl = originalUrl.replace(/\/0\/\d+\/\?_=/, '/0/6/?_=');
            headers['Authorization'] = `Bearer ${window.myBearerToken}`;
        } else if (type === 'TOEIC_SBC') {
            // Đổi viewMode từ 1 sang 14 để lấy đáp án đúng
            modifiedUrl = originalUrl.replace(/viewMode=\d+/i, 'viewMode=14');
            if (window.myEduSessionKey) {
                headers['edusoft-sessionkey'] = window.myEduSessionKey;
            }
        }

        console.log(`[AutoAnswer-MAIN] URL chuẩn hoá (${type}):`, modifiedUrl);

        try {
            const response = await fetch(modifiedUrl, {
                method: 'GET',
                headers: headers,
                credentials: 'omit',
                mode: 'cors'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const resData = await response.json();
            console.log(`[AutoAnswer-MAIN] Response raw (${type}):`, resData);

            const itemData = resData?.d?.i || resData?.i || resData?.d || resData;
            const allCorrectAnswers = [];

            if (itemData?.q && Array.isArray(itemData.q) && itemData.q.length > 0) {
                itemData.q.forEach(q => {
                    if (q.al && Array.isArray(q.al)) {
                        const sortedAl = q.al.slice().sort((a, b) => (a.id || 0) - (b.id || 0));

                        sortedAl.forEach(blank => {
                            if (blank.a && Array.isArray(blank.a) && blank.a.length > 0) {
                                const correctOptions = blank.a.filter(opt => opt.c === "1" || opt.c === 1);

                                if (correctOptions.length > 0) {
                                    correctOptions.forEach(opt => {
                                        if (opt.txt) allCorrectAnswers.push(opt.txt.trim());
                                    });
                                } else if (blank.a.length === 1 && blank.a[0].txt) {
                                    allCorrectAnswers.push(blank.a[0].txt.trim());
                                }
                            }
                        });
                    }
                });
            }

            const finalAnswers = allCorrectAnswers.length > 0
                ? [...new Set(allCorrectAnswers)]
                : ['Không có đáp án'];

            console.log("[AutoAnswer-MAIN] Đáp án đúng:", finalAnswers.join(" / "));

            window.postMessage({
                type: 'ED_ANSWERS_UPDATE',
                answers: finalAnswers
            }, '*');

        } catch(error) {
            console.error(`[AutoAnswer-MAIN] Lỗi fetch:`, error);
        }
    }

    function checkAndTriggerFetch(url) {
        if (typeof url !== 'string') return;

        // Bắt Engdis
        const matchEngdis = url.match(engdisPattern);
        if (matchEngdis) {
            const key = `ENGDIS_${matchEngdis[1]}_${matchEngdis[2]}`;
            if (key !== lastProcessedItemKey) {
                lastProcessedItemKey = key;
                processAndFetchAnswers(url, 'ENGDIS');
            }
            return;
        }

        // Bắt TOEIC SBC
        const matchToeic = url.match(toeicSbcPattern);
        if (matchToeic) {
            const key = `TOEIC_${matchToeic[1]}_${matchToeic[2]}`;
            if (key !== lastProcessedItemKey) {
                lastProcessedItemKey = key;
                console.log('[AutoAnswer-MAIN] MATCH TOEIC SBC:', key);
                processAndFetchAnswers(url, 'TOEIC_SBC');
            }
            return;
        }
    }

    // Hook XHR
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        const lower = (header || '').toLowerCase();
        if (lower === 'authorization' && typeof value === 'string' && value.startsWith('Bearer ')) {
            const token = value.substring(7);
            if (window.myBearerToken !== token) {
                window.myBearerToken = token;
                localStorage.setItem('myBearerToken', token);
            }
        }
        if (lower === 'edusoft-sessionkey' && typeof value === 'string') {
            if (window.myEduSessionKey !== value) {
                window.myEduSessionKey = value;
                localStorage.setItem('myEduSessionKey', value);
            }
        }
        originalSetRequestHeader.apply(this, arguments);
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        try { checkAndTriggerFetch(url); } catch (e) {}
        originalXhrOpen.apply(this, [method, url, ...args]);
    };

    // Hook fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = input instanceof Request ? input.url : input;
        try { checkAndTriggerFetch(url); } catch (e) {}

        if (init && init.headers) {
            try {
                const headers = new Headers(init.headers);
                const authHeader = headers.get('Authorization');
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    if (window.myBearerToken !== token) {
                        window.myBearerToken = token;
                        localStorage.setItem('myBearerToken', token);
                    }
                }
                const sesKey = headers.get('edusoft-sessionkey') || headers.get('Edusoft-SessionKey');
                if (sesKey && window.myEduSessionKey !== sesKey) {
                    window.myEduSessionKey = sesKey;
                    localStorage.setItem('myEduSessionKey', sesKey);
                }
            } catch (e) {}
        }
        return originalFetch.apply(this, arguments);
    };

    // Hook response để bắt header Edusoft-SessionKey từ server trả về
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 2) {
                try {
                    const sesKey = this.getResponseHeader('Edusoft-SessionKey');
                    if (sesKey && window.myEduSessionKey !== sesKey) {
                        window.myEduSessionKey = sesKey;
                        localStorage.setItem('myEduSessionKey', sesKey);
                        console.log('[AutoAnswer-MAIN] Captured Edusoft-SessionKey:', sesKey);
                    }
                } catch (e) {}
            }
        });
        originalXhrSend.apply(this, arguments);
    };

    document.addEventListener('keydown', (event) => {
        if (event.key === 'f' || event.key === 'F') {
            if (event.target && /input|textarea/i.test(event.target.tagName)) return;
            event.preventDefault();
            clickNextButton();
        }
    });

    console.log('[AutoAnswer-MAIN] Đã hook Engdis + TOEIC SBC (viewMode fix).');
})();