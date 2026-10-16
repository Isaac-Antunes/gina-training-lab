import type { NextFunction, Request, Response } from 'express';

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** Tira a porta do cabeçalho Host: "localhost:3000" → "localhost", "[::1]:3000" → "[::1]". */
function hostnameOf(hostHeader: string): string {
  const value = hostHeader.trim().toLowerCase();
  if (value.startsWith('[')) return value.slice(0, value.indexOf(']') + 1);
  return value.split(':')[0];
}

/**
 * Aceita só nomes de loopback (e o HOST configurado). Barra DNS rebinding: uma página
 * externa que aponte um domínio para 127.0.0.1 chega aqui com outro Host.
 */
export function isAllowedHost(hostHeader: string | undefined, extraHosts: string[] = []): boolean {
  if (!hostHeader) return false;
  const hostname = hostnameOf(hostHeader);
  return [...LOOPBACK_HOSTS, ...extraHosts.map((h) => h.toLowerCase())].includes(hostname);
}

export function hostGuard(extraHosts: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isAllowedHost(req.headers.host, extraHosts)) {
      return res.status(403).json({ error: 'Host não permitido.', code: 'HOST_NOT_ALLOWED' });
    }
    next();
  };
}
