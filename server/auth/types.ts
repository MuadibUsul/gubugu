export type AuthProvider = 'local';

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  handle: string | null;
  displayLabel: string;
  provider: AuthProvider;
};
