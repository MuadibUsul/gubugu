import { reviewModerationItemAction } from '@/server/admin/moderation/actions';
import type {
  ModerationQueueModule,
  ModerationStatus,
} from '@/lib/moderation';

type AdminModerationActionFormProps = {
  module: ModerationQueueModule;
  itemId: string;
  currentStatus: ModerationStatus;
  currentNote: string | null;
};

export function AdminModerationActionForm({
  module,
  itemId,
  currentStatus,
  currentNote,
}: AdminModerationActionFormProps) {
  return (
    <form action={reviewModerationItemAction} className="mt-4 space-y-3">
      <input name="module" type="hidden" value={module} />
      <input name="itemId" type="hidden" value={itemId} />
      <input name="nextPath" type="hidden" value="/admin/moderation" />

      <textarea
        className="border-border/70 bg-background/82 text-foreground focus-visible:border-ring focus-visible:ring-ring/35 min-h-24 w-full rounded-[1rem] border px-4 py-3 text-sm outline-none focus-visible:ring-2"
        defaultValue={currentNote ?? ''}
        name="reviewNote"
        placeholder="可选：填写审核备注"
      />

      <div className="flex flex-wrap gap-2">
        {(['approved', 'rejected', 'pending'] as const).map((decision) => (
          <button
            className={
              decision === currentStatus
                ? 'border-border bg-foreground text-background inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition'
                : decision === 'approved'
                  ? 'border-border/70 bg-background/78 text-foreground hover:bg-muted inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition'
                  : decision === 'rejected'
                    ? 'border-destructive/30 bg-destructive/8 text-foreground hover:bg-destructive/12 inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition'
                    : 'border-border/70 bg-card/78 text-muted-foreground hover:bg-muted inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition'
            }
            key={decision}
            name="decision"
            type="submit"
            value={decision}
          >
            {decision === 'approved'
              ? '通过'
              : decision === 'rejected'
                ? '驳回'
                : '重置为待审'}
          </button>
        ))}
      </div>
    </form>
  );
}
