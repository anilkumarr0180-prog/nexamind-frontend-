export type UserRole = 'USER' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';

export interface SafeUser {
  id: string;
  name?: string | null;
  email: string;
  status: UserStatus | string;
  roles: UserRole[] | string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name?: string;
  email: string;
  password: string;
}
