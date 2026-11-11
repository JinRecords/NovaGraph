import type { CanvasController } from '../../canvas/controller';
import { EGG_IMAGE_DATA_URL } from '../../canvas/eggData';

export function installGlobalShortcuts({
  controller,
  containerEl,
  showToast,
}: {
  controller: CanvasController;
  containerEl: HTMLElement;
  showToast: (text: string, kind?: 'info' | 'warn' | 'ok') => void;
}): () => void {
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        controller.resize(width, height);
      }
    }
  });
  ro.observe(containerEl);

  const handleWinResize = () => {
    const rect = containerEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      controller.resize(rect.width, rect.height);
    }
  };
  window.addEventListener('resize', handleWinResize);

  let eggKeyBuffer = '';
  controller.canvas.on('selection:cleared', () => {
    eggKeyBuffer = '';
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const pathTarget = (e.composedPath?.()[0] || e.target) as HTMLElement | null;
    const hostEl = document.getElementById('novagraph-extension-root');
    const shadowActive = hostEl?.shadowRoot?.activeElement;
    const isInput = Boolean(
      pathTarget?.tagName === 'INPUT' ||
      pathTarget?.tagName === 'TEXTAREA' ||
      pathTarget?.tagName === 'SELECT' ||
      pathTarget?.isContentEditable === true ||
      pathTarget?.getAttribute?.('contenteditable') === 'true' ||
      pathTarget?.closest?.('input, textarea, select, [contenteditable="true"]') ||
      shadowActive?.tagName === 'INPUT' ||
      shadowActive?.tagName === 'TEXTAREA' ||
      shadowActive?.tagName === 'SELECT'
    );
    if (isInput) return;

    const hasSelection = Boolean(
      controller.canvas.getActiveObject() ||
      controller.selectedConnectorId ||
      controller.multiSelectedConnectorIds.size > 0
    );

    if (!hasSelection && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (/^[0-9]$/.test(e.key)) {
        eggKeyBuffer += e.key;
        if (eggKeyBuffer.length > 16) eggKeyBuffer = eggKeyBuffer.slice(-16);
        if (eggKeyBuffer.endsWith('666888')) {
          eggKeyBuffer = '';
          controller.addImageFromDataUrl(EGG_IMAGE_DATA_URL, 'egg.jpg');
        }
      } else if (e.key.length === 1 && e.key !== 'Shift') {
        eggKeyBuffer = '';
      }
    } else {
      eggKeyBuffer = '';
    }

    if (e.key === 'Escape') {
      const editingObj = controller.canvas.getObjects().find((o: any) => o.isEditing) as any;
      if (editingObj) {
        editingObj.exitEditing();
        controller.canvas.requestRenderAll();
        return;
      }
      let changed = false;
      if (controller.canvas.getActiveObject()) {
        controller.canvas.discardActiveObject();
        changed = true;
      }
      if (controller.selectedConnectorId || controller.multiSelectedConnectorIds.size > 0) {
        controller.selectedConnectorId = null;
        controller.multiSelectedConnectorIds.clear();
        changed = true;
      }
      if (changed) {
        controller.canvas.requestRenderAll();
        controller.notifyChange(false);
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      controller.nudgeSelected(dx, dy);
      return;
    }

    if (e.code === 'Space' && !e.repeat) {
      controller.setSpacePressed(true);
    } else if ((e.key === 'v' || e.key === 'V') && !e.metaKey && !e.ctrlKey) {
      controller.setTool('select');
    } else if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) {
      controller.setTool('connect');
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && !isInput) {
      controller.deleteSelected();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      if (!isInput && !(controller.canvas.getActiveObject() as any)?.isEditing) {
        e.preventDefault();
        controller.selectAll();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) controller.redo();
      else controller.undo();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      controller.duplicateSelected();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      controller.copySelected();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
      controller.cutSelected();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
      let nativePasteTriggered = false;
      const markHandled = () => {
        nativePasteTriggered = true;
      };
      window.addEventListener('paste', markHandled, { once: true });
      setTimeout(() => {
        window.removeEventListener('paste', markHandled);
        if (!nativePasteTriggered) {
          controller.pasteAt();
        }
      }, 60);
    } else if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      controller.setZoom((controller.canvas.getZoom() || 1) * 1.15);
    } else if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      controller.setZoom((controller.canvas.getZoom() || 1) * 0.85);
    } else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      controller.zoomToFit();
    } else if ((e.metaKey || e.ctrlKey) && e.key === ']') {
      e.preventDefault();
      if (e.shiftKey) controller.bringToFront();
      else controller.bringForward();
    } else if ((e.metaKey || e.ctrlKey) && e.key === '[') {
      e.preventDefault();
      if (e.shiftKey) controller.sendToBack();
      else controller.sendBackwards();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      controller.setSpacePressed(false);
    }
  };

  const handleExternalHSeries = (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail && controller) {
      controller.addHSeriesConfigured(detail);
      showToast(`Added ${detail.host?.name || 'H Series'} system to canvas`, 'ok');
    }
  };

  const handleCopy = (e: ClipboardEvent) => {
    const pathTarget = (e.composedPath?.()[0] || e.target) as HTMLElement | null;
    const hostEl = document.getElementById('novagraph-extension-root');
    const shadowActive = hostEl?.shadowRoot?.activeElement;
    const isInput = Boolean(
      pathTarget?.tagName === 'INPUT' ||
      pathTarget?.tagName === 'TEXTAREA' ||
      pathTarget?.tagName === 'SELECT' ||
      pathTarget?.isContentEditable === true ||
      pathTarget?.getAttribute?.('contenteditable') === 'true' ||
      pathTarget?.closest?.('input, textarea, select, [contenteditable="true"]') ||
      shadowActive?.tagName === 'INPUT' ||
      shadowActive?.tagName === 'TEXTAREA' ||
      shadowActive?.tagName === 'SELECT'
    );
    if (isInput) {
      controller.markExternalClipboardChanged();
      return;
    }

    if (
      controller.canvas.getActiveObject() ||
      controller.selectedConnectorId ||
      controller.multiSelectedConnectorIds.size > 0
    ) {
      controller.copySelected();
      const clip = controller.getClipboardData();
      if (clip && e.clipboardData) {
        e.preventDefault();
        e.clipboardData.setData(
          'text/plain',
          JSON.stringify({
            __novagraph_clip__: true,
            clipboardData: clip,
          })
        );
      }
    }
  };

  const handleCut = (e: ClipboardEvent) => {
    const pathTarget = (e.composedPath?.()[0] || e.target) as HTMLElement | null;
    const hostEl = document.getElementById('novagraph-extension-root');
    const shadowActive = hostEl?.shadowRoot?.activeElement;
    const isInput = Boolean(
      pathTarget?.tagName === 'INPUT' ||
      pathTarget?.tagName === 'TEXTAREA' ||
      pathTarget?.tagName === 'SELECT' ||
      pathTarget?.isContentEditable === true ||
      pathTarget?.getAttribute?.('contenteditable') === 'true' ||
      pathTarget?.closest?.('input, textarea, select, [contenteditable="true"]') ||
      shadowActive?.tagName === 'INPUT' ||
      shadowActive?.tagName === 'TEXTAREA' ||
      shadowActive?.tagName === 'SELECT'
    );
    if (isInput) {
      controller.markExternalClipboardChanged();
      return;
    }

    if (
      controller.canvas.getActiveObject() ||
      controller.selectedConnectorId ||
      controller.multiSelectedConnectorIds.size > 0
    ) {
      controller.copySelected();
      controller.deleteSelected();
    }
    const clip = controller.getClipboardData();
    if (clip && !controller.hasExternalClipboardChangedSinceCopy() && e.clipboardData) {
      e.preventDefault();
      e.clipboardData.setData(
        'text/plain',
        JSON.stringify({
          __novagraph_clip__: true,
          clipboardData: clip,
        })
      );
    }
  };

  const handleWindowBlur = () => {
    controller.markExternalClipboardChanged();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      controller.markExternalClipboardChanged();
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const pathTarget = (e.composedPath?.()[0] || e.target) as HTMLElement | null;
    const hostEl = document.getElementById('novagraph-extension-root');
    const shadowActive = hostEl?.shadowRoot?.activeElement;
    const isInput = Boolean(
      pathTarget?.tagName === 'INPUT' ||
      pathTarget?.tagName === 'TEXTAREA' ||
      pathTarget?.tagName === 'SELECT' ||
      pathTarget?.isContentEditable === true ||
      pathTarget?.getAttribute?.('contenteditable') === 'true' ||
      pathTarget?.closest?.('input, textarea, select, [contenteditable="true"]') ||
      shadowActive?.tagName === 'INPUT' ||
      shadowActive?.tagName === 'TEXTAREA' ||
      shadowActive?.tagName === 'SELECT'
    );
    if (isInput) return;

    // 1. If user recently copied objects inside NovaGraph without external changes,
    // paste the newly copied selected object(s) immediately over any stale clipboard items!
    if (controller.hasClipboardData() && !controller.hasExternalClipboardChangedSinceCopy()) {
      e.preventDefault();
      await controller.pasteAt();
      return;
    }

    const clipData = e.clipboardData;

    // 2. Check if system clipboard has novagraph clip data (e.g. from another tab/window)
    if (clipData) {
      const text = clipData.getData('text/plain');
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.__novagraph_clip__) {
            e.preventDefault();
            if (parsed.clipboardData) {
              controller.setClipboardData(parsed.clipboardData);
            }
            await controller.pasteAt();
            return;
          }
        } catch {}
      }
    }

    // 3. Otherwise handle external image
    if (clipData) {
      const items = Array.from(clipData.items || []);
      const imgItem = items.find((item) => item.type.startsWith('image/'));
      if (imgItem) {
        e.preventDefault();
        const file = imgItem.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (dataUrl) {
              controller.addImageFromDataUrl(dataUrl);
              showToast('Image pasted to canvas', 'ok');
            }
          };
          reader.readAsDataURL(file);
        }
        return;
      }

      // 4. Otherwise handle external text
      const text = clipData.getData('text/plain');
      if (text && text.trim()) {
        e.preventDefault();
        controller.addText(text.trim());
        showToast('Text pasted to canvas', 'ok');
        return;
      }
    }

    // 5. Fallback to internal ctrl.pasteAt()
    if (controller.hasClipboardData()) {
      e.preventDefault();
      await controller.pasteAt();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('copy', handleCopy);
  window.addEventListener('cut', handleCut);
  window.addEventListener('paste', handlePaste);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('novagraph:add-h-series', handleExternalHSeries);
  window.addEventListener('novagraph:add-hseries', handleExternalHSeries);

  return () => {
    ro.disconnect();
    window.removeEventListener('resize', handleWinResize);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('copy', handleCopy);
    window.removeEventListener('cut', handleCut);
    window.removeEventListener('paste', handlePaste);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('novagraph:add-h-series', handleExternalHSeries);
    window.removeEventListener('novagraph:add-hseries', handleExternalHSeries);
  };
}
