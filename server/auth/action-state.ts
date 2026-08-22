export type AuthActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialAuthActionState = {
  status: 'idle',
} satisfies AuthActionState;
