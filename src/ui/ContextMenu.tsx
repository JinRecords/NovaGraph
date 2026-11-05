import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { CanvasController } from '../canvas/controller';

export interface ContextMenuProps {
  x: number;
  y: number;
  targetType: 'object' | 'connector' | 'canvas' | 'frame' | 'product';
  controller: CanvasController;
  onClose: () => void;
}

export function ContextMenu({ x, y, targetType, controller, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position adjustment so menu never goes outside the viewport
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 900;
  const menuW = 210;
  const menuH = 340;
  const left = Math.min(x, winW - menuW - 12);
  const top = Math.min(y, winH - menuH - 12);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleDown, true);
    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.removeEventListener('mousedown', handleDown, true);
      window.removeEventListener('keydown', handleKey, true);
    };
  }, [onClose]);

  const act = (fn: () => void) => {
    fn();
    onClose();
  };

  const isObject = targetType === 'object' || targetType === 'product' || targetType === 'frame';
  const isConnector = targetType === 'connector';

  return (
    <div
      ref={menuRef}
      className="ng-context-menu"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 1000000,
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
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Object & Frame Actions */}
      {isObject && (
        <>
          <div className="ng-ctx-item" onClick={() => act(() => controller.bringToFront())}>
            <span>Bring to Front</span>
            <span className="ng-ctx-key">⌘⇧]</span>
          </div>
          <div className="ng-ctx-item" onClick={() => act(() => controller.bringForward())}>
            <span>Bring Forward</span>
            <span className="ng-ctx-key">⌘]</span>
          </div>
          <div className="ng-ctx-item" onClick={() => act(() => controller.sendBackwards())}>
            <span>Send Backward</span>
            <span className="ng-ctx-key">⌘[</span>
          </div>
          <div className="ng-ctx-item" onClick={() => act(() => controller.sendToBack())}>
            <span>Send to Back</span>
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
                const conn = controller.connectors.find((c) => c.id === controller.selectedConnectorId);
                if (conn) controller.updateConnector(conn.id, { routing: 'straight' });
              })
            }
          >
            <span>Straight Line</span>
          </div>
          <div
            className="ng-ctx-item"
            onClick={() =>
              act(() => {
                const conn = controller.connectors.find((c) => c.id === controller.selectedConnectorId);
                if (conn) controller.updateConnector(conn.id, { routing: 'elbow' });
              })
            }
          >
            <span>Elbow Line (90°)</span>
          </div>
          <div
            className="ng-ctx-item"
            onClick={() =>
              act(() => {
                const conn = controller.connectors.find((c) => c.id === controller.selectedConnectorId);
                if (conn) controller.updateConnector(conn.id, { routing: 'curved' });
              })
            }
          >
            <span>Curved Line</span>
          </div>
          <div
            className="ng-ctx-item"
            onClick={() =>
              act(() => {
                const conn = controller.connectors.find((c) => c.id === controller.selectedConnectorId);
                if (conn) {
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
            <span>Reverse Direction</span>
          </div>
          <div className="ng-ctx-divider" />
        </>
      )}

      {/* Clipboard actions */}
      {(isObject || isConnector) && (
        <>
          <div className="ng-ctx-item" onClick={() => act(() => controller.cutSelected())}>
            <span>Cut</span>
            <span className="ng-ctx-key">⌘X</span>
          </div>
          <div className="ng-ctx-item" onClick={() => act(() => controller.copySelected())}>
            <span>Copy</span>
            <span className="ng-ctx-key">⌘C</span>
          </div>
          <div className="ng-ctx-item" onClick={() => act(() => controller.duplicateSelected())}>
            <span>Duplicate</span>
            <span className="ng-ctx-key">⌘D</span>
          </div>
          {isObject && (
            <div className="ng-ctx-item" onClick={() => act(() => controller.copyAsPng())}>
              <span>Copy as PNG</span>
            </div>
          )}
          <div className="ng-ctx-divider" />
        </>
      )}

      {/* Canvas actions */}
      <div className="ng-ctx-item" onClick={() => act(() => controller.pasteAt())}>
        <span>Paste</span>
        <span className="ng-ctx-key">⌘V</span>
      </div>

      {targetType === 'canvas' && (
        <>
          <div className="ng-ctx-item" onClick={() => act(() => controller.addFrame())}>
            <span>Add Frame</span>
          </div>
          <div className="ng-ctx-item" onClick={() => act(() => controller.zoomToFit())}>
            <span>Zoom to Fit</span>
          </div>
        </>
      )}

      {/* Reset Properties */}
      {isObject && (
        <div className="ng-ctx-item" onClick={() => act(() => controller.resetSelectedProperties())}>
          <span>Reset Properties</span>
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
            <span>Delete</span>
            <span className="ng-ctx-key">⌫</span>
          </div>
        </>
      )}
    </div>
  );
}
