import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/client.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'operator';
    active: boolean;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Falta cabecera de autorización' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Token no especificado' });
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Token inválido o expirado' });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('name, role, active')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      res.status(403).json({ error: 'Usuario no tiene perfil en el sistema' });
      return;
    }

    if (!profile.active) {
      res.status(403).json({ error: 'Usuario inactivo' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
      name: profile.name,
      role: profile.role as 'admin' | 'operator',
      active: profile.active,
    };

    next();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

export function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acceso restringido a administradores' });
    return;
  }
  next();
}
