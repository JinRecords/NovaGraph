import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';
import { t } from '../i18n';

export interface ContextMenuProps {
  x: number;
  y: number;
  scenePt?: { x: number; y: number };
  targetType: 'object' | 'connector' | 'canvas' | 'frame' | 'product';
  targetConnector?: any;
  controller: CanvasController;
  onClose: () => void;
}

export function ContextMenu({ x, y, scenePt, targetType, targetConnector, controller, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const mountTimeRef = useRef(Date.now());

  // Position adjustment so menu never goes outside the viewport
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
  const menuW = 210;
  const menuH = 340;
  const left = Math.max(10, Math.min(x, winW - menuW - 14));
  const top = Math.max(10, Math.min(y, winH - menuH - 14));

  useEffect(() => {
    mountTimeRef.current = Date.now();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const act = (fn: () => void) => {
    fn();
    onClose();
  };

  const isObject = targetType === 'object' || targetType === 'product' || targetType === 'frame';
  const isConnector = targetType === 'connector' || (targetType !== 'canvas' && (Boolean(controller.selectedConnectorId) || controller.multiSelectedConnectorIds.size > 0));

  return (
    <>
      {/* Invisible backdrop to dismiss menu on any outside click without Shadow DOM retargeting issues */}
      <div
        className="ng-context-menu-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999998,
          background: 'transparent',
          cursor: 'default',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (Date.now() - mountTimeRef.current > 250) {
            onClose();
          }
        }}
      />

      <div
        ref={menuRef}
        className="ng-context-menu"
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${top}px`,
          zIndex: 9999999,
          width: `${menuW}px`,
          background: '#18181b',
          color: '#f4f4f5',
          border: '1px solid #27272a',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)',
          padding: '5px',
          fontSize: '12px',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Object, Frame & Connector Layering Actions */}
        {(isObject || isConnector) && (
          <>
            <div className="ng-ctx-item" onClick={() => act(() => controller.bringToFront())}>
              <span>{t('ctxBringFront')}</span>
              <span className="ng-ctx-key">⌘⇧]</span>
            </div>
            <div className="ng-ctx-item" onClick={() => act(() => controller.bringForward())}>
              <span>{t('ctxBringForward')}</span>
              <span className="ng-ctx-key">⌘]</span>
            </div>
            <div className="ng-ctx-item" onClick={() => act(() => controller.sendBackwards())}>
              <span>{t('ctxSendBackward')}</span>
              <span className="ng-ctx-key">⌘[</span>
            </div>
            <div className="ng-ctx-item" onClick={() => act(() => controller.sendToBack())}>
              <span>{t('ctxSendBack')}</span>
              <span className="ng-ctx-key">⌘⇧[</span>
            </div>
            <div className="ng-ctx-divider" />
          </>
        )}

        {/* Connector Actions */}
        {isConnector && (
          <>
            <div
              className="ng-ctx-item"
              onClick={() =>
                act(() => {
                  const conns = controller.connectors.filter(
                    (c) =>
                      controller.selectedConnectorId === c.id ||
                      controller.multiSelectedConnectorIds.has(c.id) ||
                      targetConnector?.id === c.id
                  );
                  for (const conn of conns) {
                    controller.updateConnector(conn.id, { routing: 'straight' });
                  }
                })
              }
            >
              <span>{t('ctxStraightLine')}</span>
            </div>
            <div
              className="ng-ctx-item"
              onClick={() =>
                act(() => {
                  const conns = controller.connectors.filter(
                    (c) =>
                      controller.selectedConnectorId === c.id ||
                      controller.multiSelectedConnectorIds.has(c.id) ||
                      targetConnector?.id === c.id
                  );
                  for (const conn of conns) {
                    controller.updateConnector(conn.id, { routing: 'elbow' });
                  }
                })
              }
            >
              <span>{t('ctxElbowLine')}</span>
            </div>
            <div
              className="ng-ctx-item"
              onClick={() =>
                act(() => {
                  const conns = controller.connectors.filter(
                    (c) =>
                      controller.selectedConnectorId === c.id ||
                      controller.multiSelectedConnectorIds.has(c.id) ||
                      targetConnector?.id === c.id
                  );
                  for (const conn of conns) {
                    controller.updateConnector(conn.id, { routing: 'curved' });
                  }
                })
              }
            >
              <span>{t('ctxCurvedLine')}</span>
            </div>
            <div
              className="ng-ctx-item"
              onClick={() =>
                act(() => {
                  const conns = controller.connectors.filter(
                    (c) =>
                      controller.selectedConnectorId === c.id ||
                      controller.multiSelectedConnectorIds.has(c.id) ||
                      targetConnector?.id === c.id
                  );
                  for (const conn of conns) {
                    controller.updateConnector(conn.id, {
                      fromId: conn.toId,
                      toId: conn.fromId,
                      fromSide: conn.toSide,
                      toSide: conn.fromSide,
                      fromRatio: conn.toRatio,
                      toRatio: conn.fromRatio,
                    });
                  }
                })
              }
            >
              <span>{t('ctxReverseDirection')}</span>
            </div>
            <div className="ng-ctx-divider" />
          </>
        )}

        {/* Clipboard actions */}
        {(isObject || isConnector) && (
          <>
            <div className="ng-ctx-item" onClick={() => act(() => controller.cutSelected())}>
              <span>{t('ctxCut')}</span>
              <span className="ng-ctx-key">⌘X</span>
            </div>
            <div className="ng-ctx-item" onClick={() => act(() => controller.copySelected())}>
              <span>{t('ctxCopy')}</span>
              <span className="ng-ctx-key">⌘C</span>
            </div>
            <div className="ng-ctx-item" onClick={() => act(() => controller.duplicateSelected())}>
              <span>{t('ctxDuplicate')}</span>
              <span className="ng-ctx-key">⌘D</span>
            </div>
            {isObject && (
              <div className="ng-ctx-item" onClick={() => act(() => controller.copyAsPng())}>
                <span>{t('ctxCopyAsPng')}</span>
              </div>
            )}
            <div className="ng-ctx-divider" />
          </>
        )}

        {/* Canvas actions */}
        <div className="ng-ctx-item" onClick={() => act(() => controller.pasteAt(scenePt))}>
          <span>{t('ctxPaste')}</span>
          <span className="ng-ctx-key">⌘V</span>
        </div>
        <div className="ng-ctx-item" onClick={() => act(() => controller.selectAll())}>
          <span>{t('ctxSelectAll')}</span>
          <span className="ng-ctx-key">⌘A</span>
        </div>

        {targetType === 'canvas' && (
          <>
            <div className="ng-ctx-item" onClick={() => act(() => controller.addFrame())}>
              <span>{t('ctxAddFrame')}</span>
            </div>
            <div className="ng-ctx-item" onClick={() => act(() => controller.zoomToFit())}>
              <span>{t('ctxZoomToFit')}</span>
            </div>
          </>
        )}

        {/* Reset Properties */}
        {isObject && (
          <div className="ng-ctx-item" onClick={() => act(() => controller.resetSelectedProperties())}>
            <span>{t('ctxResetProps')}</span>
          </div>
        )}

        {/* Delete Action */}
        {(isObject || isConnector) && (
          <>
            <div className="ng-ctx-divider" />
            <div
              className="ng-ctx-item ng-ctx-danger"
              onClick={() => act(() => controller.deleteSelected())}
            >
              <span>{t('ctxDelete')}</span>
              <span className="ng-ctx-key">⌫</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

