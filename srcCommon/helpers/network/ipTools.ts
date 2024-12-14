import * as http from 'node:http';

export function getReqClientIP(req: http.IncomingMessage): { clientIP: string } {
  let reqIP = String(req.socket.remoteAddress);
  if (reqIP.startsWith('::ffff:')) {
    // IPv4 representado como IPv6
    reqIP = reqIP.substring(7);
  }
  let clientIP = reqIP;

  // Só aceita o cabeçalho "x-forwarded-for" se a requisição estiver vindo da LAN
  const fwIP = req.headers['x-forwarded-for']?.toString();
  if (fwIP && ipIsLAN(reqIP)) {
    clientIP = fwIP;
  }

  return {
    clientIP,
  };
}

export function ipIsLocalHost(ip: string): boolean {
  return (ip === '127.0.0.1') || (ip === '::1');
}

export function ipIsLAN(ip: string): boolean {
  return ipIsLocalHost(ip) || ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.');
}
