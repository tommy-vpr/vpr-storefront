import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const originalHash = '696a0071e054d5771c457d3962622995a0c694af96e7e9f268ac21accd7a84e9';
const marker = '    });\n};\nexport const connect =';
const replacement = '    });\n    // VPR compatibility fix: return the startup probe to its pool.\n    result.release();\n};\nexport const connect =';

/** Narrow compatibility fix for the installed 3.90.2 startup-client leak.
 * Fail on dependency drift so an upgrade requires review instead of a blind patch.
 * Upstream: https://github.com/payloadcms/payload/issues/15674
 */
export function patchPayloadPostgres(source, version) {
  if (version !== '3.90.2') throw new Error('Review the Payload startup-client compatibility fix for version ' + version);
  const normalized = source.replaceAll('\r\n', '\n');
  const unpatched = normalized.includes(replacement) ? normalized.replace(replacement, marker) : normalized;
  if (createHash('sha256').update(unpatched).digest('hex') !== originalHash || !unpatched.includes(marker)) {
    throw new Error('Payload connect.js changed; refusing to apply an unreviewed patch');
  }
  return unpatched.replace(marker, replacement);
}

export function patchInstalledPayload() {
  const require = createRequire(import.meta.url);
  const dist = path.dirname(require.resolve('@payloadcms/db-postgres'));
  const version = JSON.parse(readFileSync(path.join(dist, '../package.json'), 'utf8')).version;
  const target = path.join(dist, 'connect.js');
  const source = readFileSync(target, 'utf8');
  const patched = patchPayloadPostgres(source, version);
  if (patched !== source) writeFileSync(target, patched);
  console.log('[payload-postgres] startup-client release verified');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) patchInstalledPayload();
