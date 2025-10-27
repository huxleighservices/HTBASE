import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", props.className)}
      {...props}
    >
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
      <path d="M2 7l10 5" />
      <path d="M12 12v10" />
      <path d="M22 7l-10 5" />
      <path d="M17 4.5l-5 2.5-5-2.5" />
      <path d="M7 19.5l5-2.5 5 2.5" />
    </svg>
  );
}
