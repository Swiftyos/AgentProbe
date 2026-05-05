/**
 * Public UI surface for the dashboard. Wraps shadcn/ui primitives so the
 * higher-level views can import a single namespace (Button, Card, Modal,
 * StatTile, StatusPill, etc.) regardless of which shadcn component (or local
 * composition) backs each piece.
 */
import type { InputHTMLAttributes, ReactNode } from "react";
import type { RunSummary } from "../api/types.ts";
import { Badge } from "../components/ui/badge.tsx";
import {
  Button as ShadcnButton,
  type ButtonProps as ShadcnButtonProps,
} from "../components/ui/button.tsx";
import {
  Card as ShadcnCard,
  CardContent as ShadcnCardContent,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from "../components/ui/card.tsx";
import { Checkbox as ShadcnCheckbox } from "../components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Textarea as ShadcnTextarea } from "../components/ui/textarea.tsx";
import { cn } from "../lib/utils.ts";

// Re-export shadcn primitives so views can pull them from the same module.
export { Badge } from "../components/ui/badge.tsx";
export {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card.tsx";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog.tsx";
export { Input } from "../components/ui/input.tsx";
export { Label } from "../components/ui/label.tsx";
export {
  Select as SelectRoot,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SimpleSelect,
} from "../components/ui/select.tsx";
export { Separator } from "../components/ui/separator.tsx";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.tsx";

// ---------------------------------------------------------------------------
// Compatibility wrappers — keep the old API surface used across views.
// ---------------------------------------------------------------------------

type LegacyVariant = "primary" | "secondary" | "ghost" | "danger";
type LegacySize = "sm" | "md";

const legacyVariantMap: Record<LegacyVariant, ShadcnButtonProps["variant"]> = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
};

const legacySizeMap: Record<LegacySize, ShadcnButtonProps["size"]> = {
  sm: "sm",
  md: "default",
};

export type ButtonProps = Omit<ShadcnButtonProps, "variant" | "size"> & {
  variant?: LegacyVariant | ShadcnButtonProps["variant"];
  size?: LegacySize | ShadcnButtonProps["size"];
};

function resolveVariant(
  variant: ButtonProps["variant"],
): ShadcnButtonProps["variant"] {
  if (!variant) return "default";
  if (variant in legacyVariantMap) {
    return legacyVariantMap[variant as LegacyVariant];
  }
  return variant as ShadcnButtonProps["variant"];
}

function resolveSize(size: ButtonProps["size"]): ShadcnButtonProps["size"] {
  if (!size) return "default";
  if (size in legacySizeMap) {
    return legacySizeMap[size as LegacySize];
  }
  return size as ShadcnButtonProps["size"];
}

export function Button({ variant, size, ...rest }: ButtonProps) {
  return (
    <ShadcnButton
      variant={resolveVariant(variant)}
      size={resolveSize(size)}
      {...rest}
    />
  );
}

export function Card({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <ShadcnCard className={className} {...rest} />;
}

export function PageHeader({
  eyebrow,
  title,
  actions,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground break-words">
          {title}
        </h1>
        {meta ? (
          <div className="text-sm text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "danger" | "info" | "accent";
  hint?: ReactNode;
}) {
  const toneCls: Record<NonNullable<typeof tone>, string> = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
    info: "text-info",
    accent: "text-primary",
  };
  return (
    <ShadcnCard className="px-4 py-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums",
          toneCls[tone ?? "default"],
        )}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </ShadcnCard>
  );
}

const statusVariantMap: Record<
  string,
  {
    variant: "success" | "destructive" | "info" | "secondary" | "warning";
    label: string;
    pulse?: boolean;
  }
> = {
  pass: { variant: "success", label: "Pass" },
  fail: { variant: "destructive", label: "Fail" },
  running: { variant: "info", label: "Running", pulse: true },
  pending: { variant: "secondary", label: "Pending" },
  cancelled: { variant: "warning", label: "Cancelled" },
  errored: { variant: "destructive", label: "Error" },
};

export function StatusPill({ run }: { run: RunSummary }) {
  let key = "pending";
  if (run.status === "running") key = "running";
  else if (run.status === "cancelled") key = "cancelled";
  else if (run.passed === true) key = "pass";
  else if (run.passed === false) key = "fail";
  else if (run.status === "error" || run.status === "runtime_error")
    key = "errored";

  const cfg = statusVariantMap[key] ?? statusVariantMap.pending;
  return (
    <Badge
      variant={cfg.variant}
      className={cn(
        "uppercase tracking-wider text-[10px] px-2 py-0.5 font-semibold gap-1",
        cfg.pulse ? "animate-pulse" : null,
      )}
    >
      {cfg.pulse ? (
        <span className="inline-block size-1.5 rounded-full bg-current" />
      ) : null}
      {cfg.label}
    </Badge>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive px-3 py-2 text-sm mb-4">
      {message}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      aria-hidden
    />
  );
}

export function PageHeaderSkeleton({
  withMeta = false,
}: {
  withMeta?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-48" />
        {withMeta ? <Skeleton className="h-4 w-24" /> : null}
      </div>
    </div>
  );
}

export function StatTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {Array.from({ length: count }, (_, i) => (
        <ShadcnCard key={i} className="px-4 py-3 shadow-sm">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-7 w-20" />
        </ShadcnCard>
      ))}
    </div>
  );
}

export function RunsTableSkeleton({
  rows = 5,
  selectable = true,
}: {
  rows?: number;
  selectable?: boolean;
}) {
  return (
    <ShadcnCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
              {selectable ? <th className="px-3 py-2 w-8" /> : null}
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Preset</th>
              <th className="px-3 py-2">Started</th>
              <th className="px-3 py-2 text-right">Pass / Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                {selectable ? (
                  <td className="px-3 py-2 align-middle">
                    <Skeleton className="h-4 w-4" />
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-32" />
                </td>
                <td className="px-3 py-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                </td>
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Skeleton className="ml-auto h-4 w-10" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ShadcnCard>
  );
}

export function CardSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <ShadcnCard className={cn("px-4 py-4 space-y-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-1/3" : i === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </ShadcnCard>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <ShadcnCard className="px-6 py-12 text-center">
      <div className="text-foreground font-semibold mb-1">{title}</div>
      {description ? (
        <div className="text-sm text-muted-foreground mb-4 mx-auto max-w-md">
          {description}
        </div>
      ) : null}
      {action}
    </ShadcnCard>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-xs uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      {children}
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

// Use shadcn Input/Textarea directly. TextInput keeps the legacy import path.
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} />;
}

export function Select({
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-background bg-[length:16px] bg-[right_8px_center] bg-no-repeat pl-3 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        // Inline chevron icon as data URL so it always matches the muted color.
        '[background-image:url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23737382%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpolyline%20points%3D%276%209%2012%2015%2018%209%27%2F%3E%3C%2Fsvg%3E")]',
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <ShadcnTextarea {...props} />;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const widths: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className={cn("sm:rounded-lg", widths[size])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto -mx-6 px-6">
          {children}
        </div>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <ShadcnCheckbox
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <span>{label}</span>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  id?: string;
}) {
  const inputId = id ?? `cb-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex items-center gap-2 select-none">
      <ShadcnCheckbox
        id={inputId}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
      />
      {label ? (
        <Label htmlFor={inputId} className="text-sm font-normal cursor-pointer">
          {label}
        </Label>
      ) : null}
    </div>
  );
}

export function Tag({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "info" | "warn" | "success";
}) {
  const map: Record<string, "secondary" | "info" | "warning" | "success"> = {
    default: "secondary",
    info: "info",
    warn: "warning",
    success: "success",
  };
  return (
    <Badge variant={map[tone]} className="font-mono uppercase text-[10px]">
      {children}
    </Badge>
  );
}

export {
  ShadcnCard as RawCard,
  ShadcnCardContent as RawCardContent,
  ShadcnCardHeader as RawCardHeader,
  ShadcnCardTitle as RawCardTitle,
};
