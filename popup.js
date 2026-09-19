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

chrome.storage.local.get('ed_box_settings', (result) => {
  const settings = Object.assign({}, defaultSettings, result?.ed_box_settings || {});
  document.getElementById('textColor').value = settings.textColor;
  document.getElementById('bgColor').value = settings.bgColor;
  document.getElementById('borderColor').value = settings.borderColor;
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('fontFamily').value = settings.fontFamily;
  document.getElementById('position').value = settings.position;
});

document.getElementById('saveBtn').addEventListener('click', () => {
  chrome.storage.local.get('ed_box_settings', (result) => {
    const old = result?.ed_box_settings || {};
    const positionChanged = old.position !== document.getElementById('position').value;

    const newSettings = {
      textColor: document.getElementById('textColor').value,
      bgColor: document.getElementById('bgColor').value,
      borderColor: document.getElementById('borderColor').value,
      fontSize: document.getElementById('fontSize').value,
      fontFamily: document.getElementById('fontFamily').value,
      position: document.getElementById('position').value,
      customX: positionChanged ? null : (old.customX ?? null),
      customY: positionChanged ? null : (old.customY ?? null)
    };

    chrome.storage.local.set({ ed_box_settings: newSettings }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Đã lưu cấu hình!';
      setTimeout(() => { status.textContent = ''; }, 1500);
    });
  });
});

document.getElementById('resetPosBtn').addEventListener('click', () => {
  chrome.storage.local.get('ed_box_settings', (result) => {
    const cur = result?.ed_box_settings || {};
    cur.customX = null;
    cur.customY = null;
    chrome.storage.local.set({ ed_box_settings: cur }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Đã reset vị trí!';
      setTimeout(() => { status.textContent = ''; }, 1500);
    });
  });
});