'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircleIcon, CheckCircle2Icon, FileUp, LucideIcon, RotateCcwIcon } from 'lucide-react';

export type DocumentPillState = 'missing' | 'generating' | 'ready' | 'stale' | 'failed';

const STATE_STYLES: Record<DocumentPillState, { className: string; icon: LucideIcon; spin?: boolean }> = {
  missing: { className: 'border-muted-foreground/30 text-muted-foreground', icon: FileUp },
  generating: { className: 'border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400', icon: RotateCcwIcon, spin: true },
  ready: { className: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2Icon },
  stale: { className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: AlertCircleIcon },
  failed: { className: 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400', icon: AlertCircleIcon },
};

type DocumentPillAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type DocumentPillProps = {
  label: string;
  state: DocumentPillState;
  title?: string;
  actions: DocumentPillAction[];
};

export function DocumentPill({ label, state, title, actions }: DocumentPillProps) {
  const { className, icon: Icon, spin } = STATE_STYLES[state];

  return (
    <div
      title={title}
      className={cn('inline-flex h-8 items-center gap-2 rounded-full border pl-3 pr-1.5 text-xs', className)}
    >
      <Icon className={cn('size-3.5 shrink-0', spin && 'animate-spin')} />
      <span className="font-medium whitespace-nowrap">{label}</span>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="sm"
          className="h-6 rounded-full px-2 text-[11px] font-semibold"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
