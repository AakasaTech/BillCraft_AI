import * as React from "react"
import { Dialog } from "radix-ui"
import { XIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const SheetRoot = Dialog.Root
const SheetTrigger = Dialog.Trigger
const SheetClose = Dialog.Close
const SheetPortal = Dialog.Portal

function SheetOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof Dialog.Overlay>) {
  return (
    <Dialog.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

const sheetVariants = cva(
  "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b",
        bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t",
        left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      },
    },
    defaultVariants: { side: "right" },
  }
)

function SheetContent({
  side = "right",
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content> & VariantProps<typeof sheetVariants> & { showClose?: boolean }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content data-slot="sheet-content" className={cn(sheetVariants({ side }), className)} {...props}>
        {showClose && (
          <Dialog.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        )}
        {children}
      </Dialog.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof Dialog.Title>) {
  return <Dialog.Title data-slot="sheet-title" className={cn("text-foreground font-semibold", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof Dialog.Description>) {
  return <Dialog.Description data-slot="sheet-description" className={cn("text-muted-foreground text-sm", className)} {...props} />
}

export {
  SheetRoot as Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
