'use strict';

/** Minimal preload: exposes versions only. No Node access in the renderer. */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('clubDesktop', {
  versions: {
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron,
  },
});
