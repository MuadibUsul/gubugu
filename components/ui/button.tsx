import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] border text-sm font-semibold transition-all duration-300 ease-[var(--ease-fluid)] outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:',
  {
    variants: {
      variant: {
        default:
          'border-[color:color-mix(in_oklab,var(--primary)_32%,white)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_82%,white),color-mix(in_oklab,var(--primary)_68%,var(--accent)))] text-primary-foreground hover:brightness-[1.03] hover:',
        secondary:
          'border-[color:color-mix(in_oklab,var(--secondary)_24%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-strong)_98%,transparent),color-mix(in_oklab,var(--secondary)_26%,var(--surface-soft)))] text-secondary-foreground hover:border-[color:color-mix(in_oklab,var(--secondary)_46%,white)] hover:',
        outline:
          'border-[color:color-mix(in_oklab,var(--border)_92%,white_10%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,transparent),color-mix(in_oklab,var(--background)_76%,var(--card)))] text-foreground hover:border-[color:color-mix(in_oklab,var(--primary)_28%,var(--border))] hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_98%,white),color-mix(in_oklab,var(--background)_70%,var(--card)))] hover:',
        ghost:
          'border border-transparent bg-transparent text-[color:color-mix(in_oklab,var(--foreground)_88%,var(--background))] hover:border-[color:color-mix(in_oklab,var(--border)_88%,white_8%)] hover:bg-[color:color-mix(in_oklab,var(--card)_68%,transparent)] hover:',
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
