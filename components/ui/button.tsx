import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] border text-sm font-semibold outline-none transition-[transform,border-color,background-color,color,filter] duration-150 ease-[var(--ease-fluid)] active:scale-[.97] disabled:pointer-events-none disabled:opacity-45 motion-reduce:transform-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground hover:brightness-[1.04]',
        secondary:
          'border-border bg-secondary text-secondary-foreground hover:border-input',
        outline:
          'border-input bg-card text-foreground hover:border-primary hover:text-primary',
        ghost:
          'border-transparent bg-transparent text-foreground hover:border-border hover:bg-muted',
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
