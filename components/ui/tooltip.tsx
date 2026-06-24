import * as React from "react"
import { Tooltip } from "radix-ui"
import { cn } from "@/lib/utils"

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentPropsWithoutRef<typeof Tooltip.Provider>) {
  return <Tooltip.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

const TooltipRoot = Tooltip.Root
const TooltipTrigger = Tooltip.Trigger

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tooltip.Content>) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance",
          className
        )}
        {...props}
      >
        {children}
        <Tooltip.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </Tooltip.Content>
    </Tooltip.Portal>
  )
}

export { TooltipProvider, TooltipRoot as Tooltip, TooltipTrigger, TooltipContent }
