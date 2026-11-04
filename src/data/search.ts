import { ProductItem } from '../types';

/** Normalize a string by lowercasing and stripping spaces, dashes, underscores, parentheses, and punctuation. */
export function normalizeCompact(s: string): string {
  return s
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9]+/g, '');
}

/** Bounded Damerau-Levenshtein distance between two short strings. */
export function editDistance(a: string, b: string, maxDist = 4): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const dp: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    let rowMin = maxDist + 1;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
  }
  return dp[la][lb];
}

/** Check if all characters of `sub` appear in order inside `target`. */
function isSubsequence(sub: string, target: string): boolean {
  let i = 0;
  for (let j = 0; j < target.length && i < sub.length; j++) {
    if (sub[i] === target[j]) i++;
  }
  return i === sub.length;
}

/**
 * Score a product against a user search query.
 * Higher score = better match; 0 = no match.
 * Tolerates missing dashes ('cvt10s' -> 'CVT10-S'), missing spaces ('mctrl600' -> 'MCTRL 600'),
 * extra spaces ('mx 2000 pro' -> 'MX2000 Pro'), capitalization, and minor typos ('mctrl66o', 'novaprouhd').
 */
export function scoreProductMatch(product: ProductItem, rawQuery: string): number {
  const qTrim = rawQuery.trim().toLowerCase();
  if (!qTrim) return 1;

  const modelLower = product.model.toLowerCase();
  const seriesLower = product.series.toLowerCase();
  const modelCompact = normalizeCompact(product.model);
  const seriesCompact = normalizeCompact(product.series);
  const fullCompact = modelCompact + seriesCompact;
  const qCompact = normalizeCompact(qTrim);

  if (!qCompact) return 1;

  // 1. Exact compact match (e.g., "cvt10s" == "CVT10-S", "mctrl660pro" == "MCTRL660 Pro")
  if (modelCompact === qCompact) return 1000;

  // 2. Prefix match on compact model (e.g., "mx2000" -> "MX2000 Pro")
  if (modelCompact.startsWith(qCompact)) {
    return 900 - (modelCompact.length - qCompact.length);
  }

  // 3. Direct substring on raw model or compact model
  if (modelLower.includes(qTrim)) {
    return 840 - modelLower.indexOf(qTrim);
  }
  if (modelCompact.includes(qCompact)) {
    return 800 - modelCompact.indexOf(qCompact);
  }

  // 4. Multi-token match (every token in query matches model or series)
  const tokens = qTrim
    .split(/[\s\-_/]+/)
    .map(normalizeCompact)
    .filter(Boolean);

  if (tokens.length > 1) {
    let allMatch = true;
    let tokenScore = 0;
    for (const tk of tokens) {
      if (modelCompact.includes(tk)) {
        tokenScore += 120;
      } else if (seriesCompact.includes(tk)) {
        tokenScore += 70;
      } else {
        // Try fuzzy token against model words
        const modelTokens = product.model
          .split(/[\s\-_/()+]+/)
          .map(normalizeCompact)
          .filter(Boolean);
        const bestDist = Math.min(...modelTokens.map((mt) => editDistance(tk, mt, 2)));
        if (tk.length >= 3 && bestDist <= 1) {
          tokenScore += 65;
        } else {
          allMatch = false;
          break;
        }
      }
    }
    if (allMatch) return Math.min(780, 500 + tokenScore);
  }

  // 5. Substring in series + model combined
  if (fullCompact.includes(qCompact)) {
    return 620;
  }

  // 6. Fuzzy edit distance against compact model or its prefix of similar length
  const allowedDist = qCompact.length >= 7 ? 2 : qCompact.length >= 4 ? 1 : 0;
  if (allowedDist > 0) {
    const dFull = editDistance(qCompact, modelCompact, allowedDist);
    if (dFull <= allowedDist) {
      return 550 - dFull * 80;
    }
    if (modelCompact.length > qCompact.length) {
      const prefix = modelCompact.slice(0, qCompact.length);
      const dPref = editDistance(qCompact, prefix, allowedDist);
      if (dPref <= allowedDist) {
        return 500 - dPref * 80;
      }
      // Sliding window of length qCompact.length
      for (let i = 1; i <= modelCompact.length - qCompact.length; i++) {
        const win = modelCompact.slice(i, i + qCompact.length);
        const dWin = editDistance(qCompact, win, allowedDist);
        if (dWin <= allowedDist) {
          return 440 - dWin * 80 - i;
        }
      }
    }
  }

  // 7. Subsequence match on compact model (e.g. "mx40p" -> "mx40pro", "et4sg" -> "et4sgp2")
  if (qCompact.length >= 3 && isSubsequence(qCompact, modelCompact)) {
    return 320 - (modelCompact.length - qCompact.length);
  }

  return 0;
}

export function searchProducts(
  products: ProductItem[],
  query: string,
  seriesFilter: string = 'ALL'
): ProductItem[] {
  const pool =
    seriesFilter && seriesFilter !== 'ALL'
      ? products.filter((p) => p.series === seriesFilter)
      : products;

  if (!query.trim()) return pool;

  const scored: Array<{ item: ProductItem; score: number }> = [];
  for (const item of pool) {
    const score = scoreProductMatch(item, query);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.model.localeCompare(b.item.model));
  return scored.map((s) => s.item);
}
