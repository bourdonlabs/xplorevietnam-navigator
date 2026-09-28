import * as React from "react";
import { cn } from "@/lib/utils";

type Div = React.ComponentProps<"div">;
export const Card = ({ className, ...p }: Div) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: Div) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.ComponentProps<"h3">) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...p} />
);
export const CardContent = ({ className, ...p }: Div) => <div className={cn("p-6 pt-0", className)} {...p} />;
