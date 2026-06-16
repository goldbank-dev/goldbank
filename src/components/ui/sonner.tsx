/**
 * Sonner Toast Component (shadcn/ui wrapper)
 * Docs: https://sonner.emilkowal.ski/
 * shadcn: https://ui.shadcn.com/docs/components/sonner
 */

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

type Toaster = ToasterProps

const Toaster = ({ ...props }: Toaster) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
