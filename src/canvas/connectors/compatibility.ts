import { FabricObject } from 'fabric';
import { checkCompatibility } from '../../data/catalog';
import { CompatibilityResult, ConnectorConfig, ProductItem } from '../../types';

/** Check compatibility for a connector linking two canvas objects. */
export function evaluateConnectorCompatibility(
  conn: ConnectorConfig,
  objectMap: Map<string, FabricObject>
): CompatibilityResult {
  const fromObj = objectMap.get(conn.fromId) as unknown as Record<string, unknown> | undefined;
  const toObj = objectMap.get(conn.toId) as unknown as Record<string, unknown> | undefined;
  const prodA = fromObj?.ngProduct as ProductItem | undefined;
  const prodB = toObj?.ngProduct as ProductItem | undefined;
  if (!prodA || !prodB) return { applicable: false, status: 1, portText: '' };
  return checkCompatibility(prodA.model, prodB.model);
}

