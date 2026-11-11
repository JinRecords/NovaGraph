import { FabricObject, Group } from 'fabric';
import { h } from 'preact';
import type { CanvasController } from '../canvas/controller';
import type { ConnectorConfig } from '../types';
import {
  CanvasInspector,
  ConnectorInspector,
  FrameInspector,
  ImageInspector,
  LedScreenInspector,
  ProductInspector,
  ShapeAndTextInspector,
  StickyNoteInspector,
} from './inspector/index';

export function Inspector({
  controller,
  activeObject,
  activeConnector,
}: {
  controller: CanvasController;
  activeObject: FabricObject | null;
  activeConnector: ConnectorConfig | null;
}) {
  // 1. Single connector selected
  if (activeConnector) {
    return (
      <ConnectorInspector
        controller={controller}
        activeConnector={activeConnector}
      />
    );
  }

  // 1b. Multiple connectors selected without active Fabric object
  const selState = controller.getSelectionState();
  const multiConns = selState.selectedConnectors;
  if (!activeObject && multiConns && multiConns.length > 1) {
    return (
      <ConnectorInspector
        controller={controller}
        activeConnector={null}
      />
    );
  }

  // 2. Active Fabric object selected
  if (activeObject) {
    const rec = (activeObject as unknown as Record<string, unknown>) || {};

    if (rec.ngType === 'product') {
      return (
        <ProductInspector
          controller={controller}
          activeObject={activeObject as Group}
        />
      );
    }

    if (rec.ngType === 'ledScreen') {
      return (
        <LedScreenInspector
          controller={controller}
          activeObject={activeObject as Group}
        />
      );
    }

    if (rec.ngType === 'stickyNote') {
      return (
        <StickyNoteInspector
          controller={controller}
          activeObject={activeObject as Group}
        />
      );
    }

    if (rec.ngType === 'frame') {
      return (
        <FrameInspector
          controller={controller}
          activeObject={activeObject as Group}
        />
      );
    }

    if (rec.ngType === 'shape' || rec.ngType === 'text') {
      return (
        <ShapeAndTextInspector
          controller={controller}
          activeObject={activeObject}
        />
      );
    }

    if (rec.ngType === 'image') {
      return (
        <ImageInspector
          controller={controller}
          activeObject={activeObject}
        />
      );
    }
  }

  // 3. Default: Canvas settings
  return <CanvasInspector controller={controller} />;
}
