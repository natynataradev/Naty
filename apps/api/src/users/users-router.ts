import { Router, type Response, type Router as RouterType } from 'express';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { requireAdminRole, type AuthenticatedRequest } from '../middleware/auth.js';

export const usersRouter: RouterType = Router();

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

usersRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  res.json(req.user);
});

usersRouter.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, active, created_at')
      .eq('school_id', SCHOOL_ID)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

usersRouter.post('/', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, role, password } = req.body as {
      email?: string;
      name?: string;
      role?: string;
      password?: string;
    };

    if (!email || !name || !role || !password) {
      res.status(400).json({ error: 'email, name, role y password son requeridos' });
      return;
    }
    if (!['admin', 'operator'].includes(role)) {
      res.status(400).json({ error: 'role debe ser admin u operator' });
      return;
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({ id: authUser.user.id, school_id: SCHOOL_ID, email, name, role, active: true })
      .select()
      .single();

    if (profileError) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

usersRouter.patch('/:id', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { active, name, role } = req.body as {
      active?: boolean;
      name?: string;
      role?: string;
    };

    const updates: Record<string, unknown> = {};
    if (active !== undefined) updates['active'] = active;
    if (name) updates['name'] = name;
    if (role && ['admin', 'operator'].includes(role)) updates['role'] = role;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params['id'])
      .eq('school_id', SCHOOL_ID)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
