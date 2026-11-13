import { FabricObject } from 'fabric';
import { AnchorSide, ConnectorConfig, LineEndType } from '../../types';
import { AnchorPoint, getObjectAnchorPorts, getObjectEdgePoint } from './anchors';
import { evaluateConnectorCompatibility } from './compatibility';
import {
  ConnectorRepositioningState,
  computeElbowPoints,
  getConnectorMidpoint,
  getCurveControlPoints,
  sideNormal,
} from './routing';

export function drawEndCap(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  fromPt: { x: number; y: number },
  type: LineEndType,
  color: string,
  lineWidth: number
) {
  if (type === 'none') return;
  const angle = Math.atan2(tip.y - fromPt.y, tip.x - fromPt.x);
  const size = Math.max(8, lineWidth * 3.2);

  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, lineWidth);
  ctx.setLineDash([]);

  if (type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.52);
    ctx.lineTo(-size * 0.78, 0);
    ctx.lineTo(-size, size * 0.52);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'open-arrow') {
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.52);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size * 0.52);
    ctx.stroke();
  } else if (type === 'circle') {
    ctx.beginPath();
    ctx.arc(-size * 0.45, 0, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 0.55, -size * 0.45);
    ctx.lineTo(-size * 1.1, 0);
    ctx.lineTo(-size * 0.55, size * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'bar') {
    ctx.beginPath();
    ctx.moveTo(-2, -size * 0.55);
    ctx.lineTo(-2, size * 0.55);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawConnectorPath(
  ctx: CanvasRenderingContext2D,
  conn: ConnectorConfig,
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): Array<{ x: number; y: number }> {
  ctx.beginPath();
  if (conn.routing === 'straight') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    return [p1, p2];
  }
  if (conn.routing === 'curved') {
    const { c1, c2 } = getCurveControlPoints(conn, p1, p2);
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
    const samples: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const mt = 1 - t;
      samples.push({
        x:
          mt * mt * mt * p1.x +
          3 * mt * mt * t * c1.x +
          3 * mt * t * t * c2.x +
          t * t * t * p2.x,
        y:
          mt * mt * mt * p1.y +
          3 * mt * mt * t * c1.y +
          3 * mt * t * t * c2.y +
          t * t * t * p2.y,
      });
    }
    return samples;
  }
  const pts = computeElbowPoints(p1, conn.fromSide, p2, conn.toSide, conn.elbowOffset || 0);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(10, d1 / 2, d2 / 2);
    if (r > 1) {
      ctx.arcTo(curr.x, curr.y, next.x, next.y, r);
    } else {
      ctx.lineTo(curr.x, curr.y);
    }
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  return pts;
}

/** Render all connectors onto a 2D context in scene coordinates. */
export function renderConnectorsOnContext(
  ctx: CanvasRenderingContext2D,
  connectors: ConnectorConfig[],
  objects: FabricObject[],
  selectedConnectorId: string | null | Set<string>,
  draftConnector?: {
    from: AnchorPoint;
    toPt: { x: number; y: number };
    toAnchor: AnchorPoint | null;
  } | null,
  repositioningConnector?: ConnectorRepositioningState | null
) {
  const objMap = new Map<string, FabricObject>();
  for (const o of objects) {
    const rec = o as unknown as Record<string, unknown>;
    if (rec.ngId && o.visible) objMap.set(String(rec.ngId), o);
  }

  for (const conn of connectors) {
    const fromObj = conn.fromId ? objMap.get(conn.fromId) : null;
    const toObj = conn.toId ? objMap.get(conn.toId) : null;
    if (!conn.fromPt && !fromObj) continue;
    if (!conn.toPt && !toObj) continue;

    const isRepositioning = repositioningConnector && repositioningConnector.connId === conn.id;
    let p1 = conn.fromPt
      ? { ...conn.fromPt }
      : getObjectEdgePoint(fromObj!, conn.fromSide, conn.fromRatio ?? 0.5);
    let p2 = conn.toPt
      ? { ...conn.toPt }
      : getObjectEdgePoint(toObj!, conn.toSide, conn.toRatio ?? 0.5);
    let fromSide = conn.fromSide || 'right';
    let toSide = conn.toSide || 'left';

    if (isRepositioning) {
      if (repositioningConnector.endpoint === 'from') {
        p1 = repositioningConnector.targetAnchor
          ? { x: repositioningConnector.targetAnchor.x, y: repositioningConnector.targetAnchor.y }
          : repositioningConnector.currentPt;
        if (repositioningConnector.targetAnchor) fromSide = repositioningConnector.targetAnchor.side;
      } else {
        p2 = repositioningConnector.targetAnchor
          ? { x: repositioningConnector.targetAnchor.x, y: repositioningConnector.targetAnchor.y }
          : repositioningConnector.currentPt;
        if (repositioningConnector.targetAnchor) toSide = repositioningConnector.targetAnchor.side;
      }
    }

    const isSelected =
      selectedConnectorId instanceof Set
        ? selectedConnectorId.has(conn.id)
        : conn.id === selectedConnectorId;
    const compat = evaluateConnectorCompatibility(conn, objMap);
    const isIncompatible = compat.applicable && compat.status === 0;

    const strokeColor = isIncompatible ? '#ef4444' : conn.stroke || '#5b84b1';
    const lineW = conn.strokeWidth || 2;
    const drawConn = isRepositioning ? { ...conn, fromSide, toSide } : conn;

    ctx.save();
    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 106, 43, 0.32)';
      ctx.lineWidth = lineW + 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawConnectorPath(ctx, drawConn, p1, p2);
      ctx.stroke();
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (conn.dash === 'dashed') ctx.setLineDash([lineW * 4, lineW * 2.5]);
    else if (conn.dash === 'dotted') ctx.setLineDash([lineW * 1.2, lineW * 2.2]);
    else ctx.setLineDash([]);

    const pts = drawConnectorPath(ctx, drawConn, p1, p2);
    ctx.stroke();

    if (pts.length >= 2) {
      drawEndCap(ctx, pts[0], pts[1], conn.startEnd, strokeColor, lineW);
      drawEndCap(
        ctx,
        pts[pts.length - 1],
        pts[pts.length - 2],
        conn.endEnd,
        strokeColor,
        lineW
      );
    }

    const mid = getConnectorMidpoint(pts);
    const pillText = isIncompatible
      ? `⚠ Incompatible (${compat.converterName} ↔ ${compat.controllerName})`
      : conn.label
      ? conn.label
      : isSelected && compat.applicable
      ? `✓ ${compat.portText}`
      : '';

    if (pillText) {
      const lblFontSize = Math.max(8, Number(conn.labelSize) || 11);
      const lblTextColor = conn.labelColor || '#1e293b';
      ctx.setLineDash([]);
      ctx.font = `600 ${lblFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const tw = ctx.measureText(pillText).width;
      const pw = tw + 14;
      const ph = Math.max(20, lblFontSize + 9);
      ctx.fillStyle = isIncompatible
        ? '#fef2f2'
        : isSelected && compat.applicable && !conn.label
        ? '#ecfdf5'
        : '#ffffff';
      ctx.strokeStyle = isIncompatible
        ? '#fca5a5'
        : isSelected && compat.applicable && !conn.label
        ? '#6ee7b7'
        : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mid.x - pw / 2, mid.y - ph / 2, pw, ph, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isIncompatible
        ? '#b91c1c'
        : isSelected && compat.applicable && !conn.label
        ? '#047857'
        : lblTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, mid.x, mid.y);
    }

    if (isSelected) {
      ctx.setLineDash([]);

      // Draw middle bend / curve adjustment handles for elbow (90°) and curved modes
      if (drawConn.routing === 'elbow' && pts.length >= 3) {
        const segA = pts[1];
        const segB = pts[2];
        const midX = (segA.x + segB.x) / 2;
        const midY = (segA.y + segB.y) / 2;
        const isHoriz = drawConn.fromSide === 'top' || drawConn.fromSide === 'bottom';
        const pillW = isHoriz ? 22 : 8;
        const pillH = isHoriz ? 8 : 22;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 4);
        ctx.fill();
        ctx.stroke();
      } else if (drawConn.routing === 'curved') {
        const { c1, c2, mid: curveMid } = getCurveControlPoints(drawConn, p1, p2);

        // Tangent lines from endpoints to c1 / c2
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(c1.x, c1.y);
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();

        // Hollow circle handles at c1 and c2
        for (const cp of [c1, c2]) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Solid circle handle at curve midpoint (t = 0.5)
        ctx.fillStyle = strokeColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(curveMid.x, curveMid.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const endpoints = [
        { pt: p1, ep: 'from' as const },
        { pt: p2, ep: 'to' as const },
      ];
      for (const { pt: ep, ep: epType } of endpoints) {
        const isDraggingThis = isRepositioning && repositioningConnector.endpoint === epType;
        ctx.fillStyle = isDraggingThis ? '#ff6a2b' : '#ffffff';
        ctx.strokeStyle = '#ff6a2b';
        ctx.lineWidth = isDraggingThis ? 3 : 2;
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, isDraggingThis ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  if (draftConnector) {
    const p1 = { x: draftConnector.from.x, y: draftConnector.from.y };
    const p2 = draftConnector.toAnchor
      ? { x: draftConnector.toAnchor.x, y: draftConnector.toAnchor.y }
      : draftConnector.toPt;
    const toSide: AnchorSide = draftConnector.toAnchor
      ? draftConnector.toAnchor.side
      : Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)
      ? p2.x > p1.x
        ? 'left'
        : 'right'
      : p2.y > p1.y
      ? 'top'
      : 'bottom';

    const tempConn: ConnectorConfig = {
      id: '__draft__',
      fromId: draftConnector.from.objectId,
      fromSide: draftConnector.from.side,
      fromRatio: draftConnector.from.ratio,
      toId: draftConnector.toAnchor?.objectId || '',
      toSide,
      toRatio: draftConnector.toAnchor?.ratio ?? 0.5,
      routing: 'elbow',
      startEnd: 'none',
      endEnd: 'arrow',
      dash: 'dashed',
      strokeWidth: 2,
      stroke: '#ff6a2b',
    };

    ctx.save();
    ctx.strokeStyle = '#ff6a2b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    const pts = drawConnectorPath(ctx, tempConn, p1, p2);
    ctx.stroke();
    if (pts.length >= 2) {
      drawEndCap(ctx, pts[pts.length - 1], pts[pts.length - 2], 'arrow', '#ff6a2b', 2);
    }
    ctx.restore();
  }
}

/** Draw hovered object edge anchor dots on the overlay context so users can grab any port to connect. */
export function renderAnchorPortsOverlay(
  ctx: CanvasRenderingContext2D,
  obj: FabricObject | null,
  activeAnchor: AnchorPoint | null,
  isAltFreeMode = false
) {
  if (!obj) return;
  ctx.save();
  let activeRendered = false;

  if (!isAltFreeMode) {
    const isSelected = obj.canvas ? obj.canvas.getActiveObject() === obj : false;
    const ports = getObjectAnchorPorts(obj, isSelected ? 28 : 0);
    for (const p of ports) {
      const isHit =
        activeAnchor &&
        activeAnchor.objectId === p.objectId &&
        activeAnchor.side === p.side &&
        Math.abs(activeAnchor.ratio - p.ratio) < 0.08 &&
        Math.hypot(activeAnchor.x - p.x, activeAnchor.y - p.y) < 8;
      if (isHit) activeRendered = true;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHit ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? '#ff6a2b' : '#ffffff';
      ctx.strokeStyle = '#ff6a2b';
      ctx.lineWidth = isHit ? 2.5 : 1.5;
      ctx.shadowColor = isHit ? 'rgba(255, 106, 43, 0.6)' : 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = isHit ? 8 : 2;
      ctx.fill();
      ctx.stroke();
    }
  }

  const objId = String((obj as unknown as Record<string, unknown>).ngId || '');
  if (activeAnchor && activeAnchor.objectId === objId && (isAltFreeMode || !activeRendered)) {
    ctx.beginPath();
    ctx.arc(activeAnchor.x, activeAnchor.y, isAltFreeMode ? 8 : 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6a2b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255, 106, 43, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

