import { createReportAction } from '@/server/social/actions';

export function ReportForm({
  reason,
  targetId,
  targetType,
}: {
  reason: string;
  targetId: string;
  targetType: 'post' | 'exchange_listing' | 'exchange' | 'message';
}) {
  return (
    <details className="mt-3 text-xs">
      <summary className="text-muted-foreground cursor-pointer">举报</summary>
      <form action={createReportAction} className="mt-2 flex flex-wrap gap-2">
        <input name="targetType" type="hidden" value={targetType} />
        <input name="targetId" type="hidden" value={targetId} />
        <input name="reason" type="hidden" value={reason} />
        <input
          className="border-input bg-background w-48 rounded border px-2 py-1"
          maxLength={1000}
          name="details"
          placeholder="说明原因"
          required
        />
        <button className="text-[var(--destructive)]" type="submit">
          提交
        </button>
      </form>
    </details>
  );
}
