'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import {
  initialSaveModerationDecisionActionState,
  type SaveModerationDecisionActionState,
} from '@/server/admin/moderation/action-state';
import { saveModerationDecisionAction } from '@/server/admin/moderation/actions';
import type { ModerationSubjectType } from '@/lib/moderation';

type AdminModerationDecisionFormProps = {
  subjectType: ModerationSubjectType;
  subjectId: string;
  reviewNote: string | null;
  disabled?: boolean;
  returnPath?: string;
};

function DecisionButtons({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={disabled || pending}
        name="decision"
        size="sm"
        type="submit"
        value="approved"
      >
        {pending ? '正在保存...' : '通过'}
      </Button>
      <Button
        disabled={disabled || pending}
        name="decision"
        size="sm"
        type="submit"
        value="rejected"
        variant="outline"
      >
        驳回
      </Button>
    </div>
  );
}

export function AdminModerationDecisionForm({
  subjectType,
  subjectId,
  reviewNote,
  disabled = false,
  returnPath = '/admin/moderation',
}: AdminModerationDecisionFormProps) {
  const [state, formAction] = useActionState<
    SaveModerationDecisionActionState,
    FormData
  >(saveModerationDecisionAction, initialSaveModerationDecisionActionState);

  return (
    <form action={formAction} className="space-y-3">
      <input name="subjectType" type="hidden" value={subjectType} />
      <input name="subjectId" type="hidden" value={subjectId} />
      <input name="returnPath" type="hidden" value={returnPath} />

      <div className="space-y-2">
        <label
          className="text-muted-foreground block text-[0.66rem] font-semibold tracking-[0.22em] uppercase"
          htmlFor={`${subjectType}-${subjectId}-review-note`}
        >
          审核备注
        </label>
        <textarea
          className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-[92px] w-full rounded-[1rem] border px-4 py-3 text-sm leading-6 outline-none transition focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
          defaultValue={reviewNote ?? ''}
          disabled={disabled}
          id={`${subjectType}-${subjectId}-review-note`}
          name="reviewNote"
          placeholder="可选：填写通过或驳回该内容的审核说明。"
        />
      </div>

      {state.status === 'error' && state.message ? (
        <div className="border-destructive/30 bg-destructive/8 text-foreground rounded-[1rem] border px-3 py-2 text-sm leading-6">
          {state.message}
        </div>
      ) : null}

      <DecisionButtons disabled={disabled} />
    </form>
  );
}
