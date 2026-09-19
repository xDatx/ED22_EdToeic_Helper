# ED22 & EDToeic Helper

A Manifest V3 Chrome Extension that intercepts network requests (XHR/Fetch) to extract and display practice test answers directly on Engdis and TOEIC SBC learning platforms.

## Features

- Hooks `XMLHttpRequest` and `fetch` in the `MAIN` world to capture `Bearer` authentication tokens and `Edusoft-SessionKey`.
- Intercepts practice item URLs and queries the API with modified parameters (`viewMode=14` for TOEIC SBC) to retrieve correct answers.
- Displays a draggable, customizable floating UI overlay in an `ISOLATED` world.
- Configuration popup to adjust text color, background color, borders, font size, and default corner anchors.
- Press `F` to auto-trigger the Next/Submit action (ignored while typing in input/textarea).

## Supported Hosts

- `ed22.engdis.com`
- `edtoeic.engdis.com`
- `ets.toeicolpc.com`
- `applicationservices.toeicsbc.com`

## Installation

1. Clone or download this repository.
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the extension directory.

## Usage

1. Log in and open a supported test or learning module.
2. The extension automatically detects question requests and overlays the answers on-screen.
3. Click the extension toolbar icon to open the settings popup and customize the UI appearance.
4. Drag the answer box anywhere on the screen to save a custom coordinate. Click **Reset vị trí** in the popup to revert to screen corners.
5. Press `F` to jump to the next item.

## Project Structure

```
├── manifest.json         # Manifest V3 extension configuration
├── content.js            # Injected script running in the MAIN world (network hooking)
├── content-isolated.js   # Isolated script rendering UI overlay & drag events
├── popup.html            # Configuration popup UI
└── popup.js              # Configuration persistence via chrome.storage.local
```

## Disclaimer

This project is intended strictly for educational purposes and reverse-engineering research on web APIs and browser extensions. Use at your own risk.
