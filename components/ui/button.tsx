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
          'border-[color:color-mix(in_oklab,var(--primary)_40%,white)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_94%,white),color-mix(in_oklab,var(--accent)_34%,var(--primary)))] text-primary-foreground shadow-[0_20px_44px_-22px_color-mix(in_oklab,var(--primary)_62%,transparent),inset_0_1px_0_color-mix(in_oklab,white_42%,transparent)] hover:brightness-[1.04] hover:shadow-[0_28px_58px_-20px_color-mix(in_oklab,var(--primary)_72%,transparent),inset_0_1px_0_color-mix(in_oklab,white_48%,transparent)]',
        secondary:
          'border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--secondary)_76%,white),color-mix(in_oklab,var(--surface-strong)_82%,var(--secondary)))] text-secondary-foreground shadow-[0_18px_40px_-26px_color-mix(in_oklab,var(--accent)_32%,transparent),inset_0_1px_0_color-mix(in_oklab,white_20%,transparent)] hover:border-[color:color-mix(in_oklab,var(--accent)_56%,white)] hover:shadow-[0_24px_50px_-22px_color-mix(in_oklab,var(--accent)_44%,transparent)]',
        outline:
          'border-[color:color-mix(in_oklab,var(--accent)_22%,var(--border))] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_92%,transparent),color-mix(in_oklab,var(--background)_72%,var(--card)))] text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_12%,transparent)] hover:border-[color:color-mix(in_oklab,var(--accent)_48%,white)] hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_96%,white),color-mix(in_oklab,var(--background)_68%,var(--card)))] hover:shadow-[0_20px_42px_-28px_color-mix(in_oklab,var(--accent)_34%,transparent)]',
        ghost:
          'border border-transparent bg-transparent text-[color:color-mix(in_oklab,var(--foreground)_90%,var(--background))] hover:border-[color:color-mix(in_oklab,var(--accent)_18%,var(--border))] hover:bg-[color:color-mix(in_oklab,var(--card)_72%,transparent)] hover:shadow-[0_14px_32px_-26px_color-mix(in_oklab,var(--accent)_24%,transparent)]',
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
