export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  school_id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface CreateUserInput {
  school_id: string;
  email: string;
  name: string;
  role: UserRole;
}
