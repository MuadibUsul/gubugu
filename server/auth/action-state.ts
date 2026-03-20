export type SignInActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialSignInActionState = {
  status: 'idle',
} satisfies SignInActionState;
