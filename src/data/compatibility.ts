import type {
  CompatDevice,
  CompatibilityResult,
  CompatRule,
} from '../types';
import {
  STATIC_COMPAT_CONTROLLERS,
  STATIC_COMPAT_CONVERTERS,
  STATIC_COMPAT_RULES,
} from './compatFallback';

/** Normalize model name for matching against compatibility converter/controller entries. */
export function normCompatToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function matchConverterId(model: string, converters: CompatDevice[]): CompatDevice | null {
  const n = normCompatToken(model);
  if (n.startsWith('cvt10')) return converters.find((c) => c.id === 'cvt10') || null;
  if (n.startsWith('cvt4k')) return converters.find((c) => c.id === 'cvt4k') || null;
  for (const c of converters) {
    if (normCompatToken(c.id) === n || normCompatToken(c.name) === n) return c;
  }
  return null;
}

export function matchControllerId(model: string, controllers: CompatDevice[]): CompatDevice | null {
  const n = normCompatToken(model);
  if (n === 'mx2000pro' || n === 'mx6000pro') {
    return controllers.find((c) => c.id === 'mx2000/6000pro') || null;
  }
  if (n.includes('16xrj45') && n.includes('2xfiber')) {
    return controllers.find((c) => c.id === 'h_16') || null;
  }
  if (n.includes('4xfiber') && n.includes('enhanced')) {
    return controllers.find((c) => c.id === 'h_4e') || null;
  }
  if (n.includes('4xfiber')) {
    return controllers.find((c) => c.id === 'h_4') || null;
  }
  for (const c of controllers) {
    if (normCompatToken(c.id) === n || normCompatToken(c.name) === n) return c;
  }
  return null;
}

/**
 * Evaluate compatibility between two connected models (in either direction)
 * using the website's Fiber Converter Compatible Tools matrix.
 */
export function checkCompatibility(
  modelA: string,
  modelB: string,
  bundle: {
    compatConverters?: CompatDevice[];
    compatControllers?: CompatDevice[];
    compatRules?: Record<string, CompatRule>;
  } | null = null
): CompatibilityResult {
  if (!modelA || !modelB) {
    return { applicable: false, status: 1, portText: '' };
  }
  const compatConverters =
    bundle?.compatConverters && bundle.compatConverters.length > 0
      ? bundle.compatConverters
      : STATIC_COMPAT_CONVERTERS;
  const compatControllers =
    bundle?.compatControllers && bundle.compatControllers.length > 0
      ? bundle.compatControllers
      : STATIC_COMPAT_CONTROLLERS;
  const compatRules =
    bundle?.compatRules && Object.keys(bundle.compatRules).length > 0
      ? bundle.compatRules
      : STATIC_COMPAT_RULES;

  // Try (A = converter, B = controller) and (B = converter, A = controller).
  // Prefer pairing where one is specifically a dedicated CVT converter if possible.
  const convA = matchConverterId(modelA, compatConverters);
  const ctrlB = matchControllerId(modelB, compatControllers);
  const convB = matchConverterId(modelB, compatConverters);
  const ctrlA = matchControllerId(modelA, compatControllers);

  let conv: CompatDevice | null = null;
  let ctrl: CompatDevice | null = null;

  if (convA && ctrlB && (convA.id.startsWith('cvt') || !(convB && convB.id.startsWith('cvt')))) {
    conv = convA;
    ctrl = ctrlB;
  } else if (convB && ctrlA) {
    conv = convB;
    ctrl = ctrlA;
  } else if (convA && ctrlB) {
    conv = convA;
    ctrl = ctrlB;
  }

  if (!conv || !ctrl) {
    return { applicable: false, status: 1, portText: '' };
  }

  const key = `${conv.id}_${ctrl.id}`;
  const rule = compatRules[key];
  if (rule) {
    return {
      applicable: true,
      status: rule.status,
      portText: rule.text,
      converterName: conv.name,
      controllerName: ctrl.name,
    };
  }
  if (conv.id === ctrl.id) {
    return {
      applicable: true,
      status: 2,
      portText: 'Compatible (Same Model Interconnection / Cascade)',
      converterName: conv.name,
      controllerName: ctrl.name,
    };
  }
  return {
    applicable: true,
    status: 0,
    portText: 'Incompatible',
    converterName: conv.name,
    controllerName: ctrl.name,
  };
}

