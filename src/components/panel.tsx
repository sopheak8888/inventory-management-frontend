import { cn } from "@/lib/utils";

/**
 * The mockup's core surface: a hairline-bordered, square, transparent box with
 * blueprint registration marks sitting just outside each corner.
 */
export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("blueprint border border-border bg-card", className)} {...props}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </div>
  );
}

export function PanelTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("font-heading text-[17px] leading-tight font-semibold", className)}
      {...props}
    />
  );
}

export function Kicker({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("kicker", className)} {...props} />;
}
