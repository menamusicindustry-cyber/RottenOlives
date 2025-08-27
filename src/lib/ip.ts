import crypto from 'crypto';
function sha256(input: string) { return crypto.createHash('sha256').update(input).digest('hex'); }
export function parseClientIp(raw?: string | null) { if (!raw) return null; const ip = raw.split(',')[0].trim(); return ip || null; }
export function ipVersion(ip: string): 4 | 6 | null { return ip.includes(':') ? 6 : ip.includes('.') ? 4 : null; }
export function subnetOf(ip: string): string | null {
  if (ipVersion(ip) === 4) { const p = ip.split('.'); if (p.length !== 4) return null; return `${p[0]}.${p[1]}.${p[2]}.0/24`; }
  if (ipVersion(ip) === 6) { const p = ip.split(':'); while (p.length < 8) p.push('0'); return `${p[0]}:${p[1]}:${p[2]}:${p[3]}::/64`; }
  return null;
}
export function hashIp(ip: string, salt = process.env.IP_HASH_SALT || '') { return sha256(`${ip}|${salt}`); }
export function hashSubnet(subnet: string, salt = process.env.IP_HASH_SALT || '') { return sha256(`${subnet}|${salt}`); }
