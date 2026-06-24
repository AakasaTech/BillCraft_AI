import * as React from "react"
import { ScrollArea } from "radix-ui"
import { cn } from "@/lib/utils"

function ScrollAreaRoot({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof ScrollArea.Root>) {
  return (
    <ScrollArea.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollArea.Viewport data-slot="scroll-area-viewport" className="ring-ring/10 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-2">
        {children}
      </ScrollArea.Viewport>
      <ScrollBar />
      <ScrollArea.Corner />
    </ScrollArea.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<typeof ScrollArea.ScrollAreaScrollbar>) {
  return (
    <ScrollArea.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollArea.ScrollAreaThumb data-slot="scroll-area-thumb" className="bg-border relative flex-1 rounded-full" />
    </ScrollArea.ScrollAreaScrollbar>
  )
}

export { ScrollAreaRoot as ScrollArea, ScrollBar }
