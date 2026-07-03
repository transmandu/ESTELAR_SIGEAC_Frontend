import { cva, VariantProps } from 'class-variance-authority';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  titleIcon?: React.ReactNode;
  onBack?: () => void;
  backHref?: string;
  actions?: React.ReactNode;
  size?: VariantProps<typeof titleVariant>['size'];
}

const titleVariant = cva('font-semibold text-foreground', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

const subtitleVariant = cva(' text-muted-foreground', {
  variants: {
    size: {
      sm: 'text-[10px] font-mono',
      md: 'text-xs',
      lg: 'text-sm',
      xl: 'text-sm',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export default function SectionHeader({
  title,
  subtitle,
  titleIcon,
  onBack,
  backHref,
  actions,
  size,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
          </button>
        ) : backHref ? (
          <Link
            href={backHref}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {titleIcon}
        <div>
          <p className={titleVariant({ size })}>{title}</p>
          {subtitle && <p className={subtitleVariant({ size })}>{subtitle}</p>}
        </div>
      </div>
      {actions != null && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
