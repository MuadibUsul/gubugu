import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.15rem] border text-sm font-semibold tracking-[0.02em] transition-all duration-300 ease-[var(--ease-fluid)] outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:hover:-translate-y-0.5',
  {
    variants: {
      variant: {
        default:
          'border-[color:color-mix(in_oklab,var(--primary)_32%,white)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_82%,white),color-mix(in_oklab,var(--primary)_68%,var(--accent)))] text-primary-foreground shadow-[0_16px_34px_-18px_color-mix(in_oklab,var(--primary)_34%,transparent),inset_0_1px_0_color-mix(in_oklab,white_28%,transparent)] hover:brightness-[1.03] hover:shadow-[0_22px_42px_-18px_color-mix(in_oklab,var(--primary)_42%,transparent)]',
        secondary:
          'border-[color:color-mix(in_oklab,var(--secondary)_24%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_98%,transparent),color-mix(in_oklab,var(--secondary)_26%,var(--surface-soft)))] text-secondary-foreground shadow-[0_14px_30px_-22px_color-mix(in_oklab,var(--secondary)_18%,transparent),inset_0_1px_0_color-mix(in_oklab,white_14%,transparent)] hover:border-[color:color-mix(in_oklab,var(--secondary)_46%,white)] hover:shadow-[0_20px_40px_-22px_color-mix(in_oklab,var(--secondary)_22%,transparent)]',
        outline:
          'border-[color:color-mix(in_oklab,var(--border)_92%,white_10%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--background)_76%,var(--card)))] text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_10%,transparent)] hover:border-[color:color-mix(in_oklab,var(--primary)_28%,var(--border))] hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_98%,white),color-mix(in_oklab,var(--background)_70%,var(--card)))] hover:shadow-[0_16px_34px_-24px_color-mix(in_oklab,var(--shadow-tint)_22%,transparent)]',
        ghost:
          'border border-transparent bg-transparent text-[color:color-mix(in_oklab,var(--foreground)_88%,var(--background))] hover:border-[color:color-mix(in_oklab,var(--border)_88%,white_8%)] hover:bg-[color:color-mix(in_oklab,var(--card)_68%,transparent)] hover:shadow-[0_10px_24px_-22px_color-mix(in_oklab,var(--shadow-tint)_20%,transparent)]',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
