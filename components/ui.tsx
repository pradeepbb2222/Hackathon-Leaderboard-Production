"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-saffron text-[#1a0c04] hover:brightness-110",
        emerald: "bg-emerald text-[#04140e] hover:brightness-110",
        ghost: "border border-white/10 bg-white/5 text-ink hover:bg-white/10",
        danger: "bg-danger text-[#2a060c] hover:brightness-110",
        quiet: "text-ink hover:bg-white/10",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function Input(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-ink outline-none placeholder:text-white/35",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-ink outline-none placeholder:text-white/35",
        props.className,
      )}
    />
  );
}

export function Label(props: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root {...props} className={cn("mb-1.5 block text-sm text-muted", props.className)} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "saffron" | "emerald" | "neon" | "danger" | "gold";
}) {
  const tones = {
    neutral: "border-white/15 text-muted",
    saffron: "border-saffron/40 text-saffron",
    emerald: "border-emerald/40 text-emerald",
    neon: "border-neon/40 text-neon",
    danger: "border-danger/50 text-danger",
    gold: "border-gold/50 text-gold",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}

export function Switch(props: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        "relative h-6 w-11 rounded-full border border-white/15 bg-white/10 transition data-[state=checked]:bg-emerald",
        props.className,
      )}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-[1.35rem] data-[state=checked]:bg-[#04140e]" />
    </SwitchPrimitive.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="frame fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(100%-1.5rem,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-auto p-5">
          <DialogPrimitive.Title className="font-display text-2xl">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description> : null}
          <div className="mt-4">{children}</div>
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-muted hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
