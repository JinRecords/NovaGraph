import type { VnnoxParsedUrl } from './types';

const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Decrypt VNNOX Care obfuscated project ID into actual numeric ID.
 * Matches the VNNOX Care client-side cryptoTech algorithm.
 */
export function decryptVnnoxId(encryptedId: string): string {
  if (!encryptedId || typeof encryptedId !== 'string') return '';
  const trimmed = encryptedId.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const n = ALPHABET.indexOf(trimmed[0]) + 1;
    const t = parseInt(trimmed[1], 16);
    if (isNaN(n) || isNaN(t) || n <= 0) return trimmed;
    const slice = trimmed.substring(2 + t);
    const decoded = atob(slice).split('');
    for (let r = 0; r < decoded.length; r++) {
      if (r % 2) {
        decoded.splice(r, n, '');
      }
    }
    const result = atob(decoded.join(''));
    return result || trimmed;
  } catch (e) {
    console.warn('[NovaGraph] Decryption error, using raw ID:', e);
    return trimmed;
  }
}

/**
 * Parses user-provided VNNOX Care link (au.vnnox.com, eu.vnnox.com, cn.vnnox.com, us.vnnox.com, etc.).
 */
export function parseVnnoxCareUrl(rawUrl: string): VnnoxParsedUrl | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  const domainMatch = trimmed.match(
    /(?:https?:\/\/)?([a-zA-Z0-9.\-_]+\.vnnox\.com)/i
  );
  const domain = domainMatch ? domainMatch[1] : 'au.vnnox.com';

  // Format: /care/#/<type>/share/<uid>/<encryptedId> or #/<type>/share/<uid>/<encryptedId>
  const shareMatch = trimmed.match(
    /(?:#|\/)?(?:care\/#\/)?([a-zA-Z0-9_\-]+)\/share\/([^\/\?#]+)\/([^\/\?#]+)/i
  );
  if (shareMatch) {
    const shareType = shareMatch[1];
    const uid = shareMatch[2];
    const encryptedId = shareMatch[3];
    const projectId = decryptVnnoxId(encryptedId);
    return {
      domain,
      uid,
      encryptedId,
      projectId,
      shareType,
      fullUrl: trimmed,
    };
  }

  // Fallback share format: /share/<uid>/<encryptedId>
  const simpleMatch = trimmed.match(/share\/([^\/\?#]+)\/([^\/\?#]+)/i);
  if (simpleMatch) {
    const uid = simpleMatch[1];
    const encryptedId = simpleMatch[2];
    const projectId = decryptVnnoxId(encryptedId);
    return {
      domain,
      uid,
      encryptedId,
      projectId,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  // View/Edit scheme URL: /view/6009 or /edit/6009 or ?projectId=6009
  const viewEditMatch =
    trimmed.match(/(?:view|edit)\/(\d+)/i) ||
    trimmed.match(/[?&]projectId=(\d+)/i) ||
    trimmed.match(/(?:schemeConf|care)\/(\d+)/i);
  if (viewEditMatch) {
    const projectId = viewEditMatch[1];
    return {
      domain,
      uid: '',
      encryptedId: projectId,
      projectId,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  // Raw numeric scheme ID
  if (/^\d+$/.test(trimmed)) {
    return {
      domain: 'au.vnnox.com',
      uid: '',
      encryptedId: trimmed,
      projectId: trimmed,
      shareType: 'schemeConf',
      fullUrl: trimmed,
    };
  }

  return null;
}

/**
 * Fetch scheme data from VNNOX Care gateway API.
 */
export async function fetchVnnoxCareData(
  parsed: VnnoxParsedUrl
): Promise<Record<string, unknown>> {
  const targetPath = `v1/pingboss-management-service/presalescontentinfo/${parsed.projectId}`;
  const b64 = btoa(targetPath);
  const targetUrl = `https://${parsed.domain}/gateway/apis?vnnox=${b64}`;

  // Try background script message first (bypasses novastar.show host page CSP and CORS)
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const bgResp = await new Promise<{
        ok: boolean;
        data?: unknown;
        error?: string;
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'FETCH_VNNOX_CARE',
            url: targetUrl,
            domain: parsed.domain,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              resolve(
                res || {
                  ok: false,
                  error: 'No response from background service worker',
                }
              );
            }
          }
        );
      });
      if (bgResp && bgResp.ok && bgResp.data) {
        return bgResp.data as Record<string, unknown>;
      }
    } catch (e) {
      console.warn(
        '[NovaGraph] Background fetch failed, attempting direct fetch:',
        e
      );
    }
  }

  // Direct fetch with regional mirrors fallback
  const domains = Array.from(
    new Set([
      parsed.domain,
      'au.vnnox.com',
      'eu.vnnox.com',
      'cn.vnnox.com',
      'us.vnnox.com',
    ])
  );

  for (const dom of domains) {
    try {
      const u = `https://${dom}/gateway/apis?vnnox=${b64}`;
      const res = await fetch(u, {
        method: 'GET',
        headers: {
          Action: '1',
          Referer: `https://${dom}/care/`,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept-Language': 'en-us',
          language: 'en-us',
        },
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          // ignore non-JSON response
        }
      }
    } catch {
      // ignore network failure on mirror
    }
  }

  throw new Error(
    `Failed to load VNNOX Care scheme data for ID ${parsed.projectId}`
  );
}

