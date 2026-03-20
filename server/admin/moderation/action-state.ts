export type SaveModerationDecisionActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialSaveModerationDecisionActionState = {
  status: 'idle',
} satisfies SaveModerationDecisionActionState;
