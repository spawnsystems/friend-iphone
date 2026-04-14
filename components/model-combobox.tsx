'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IPHONE_MODELS } from "@/lib/types/database"

interface ModelComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const ModelCombobox = React.forwardRef<HTMLButtonElement, ModelComboboxProps>(
  function ModelCombobox(
    { value, onChange, placeholder = "Seleccionar modelo...", className },
    ref
  ) {
    const [open, setOpen] = React.useState(false)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal h-12 rounded-xl border-border/60 bg-secondary/30 text-[15px] hover:bg-secondary/50 transition-colors",
              !value && "text-muted-foreground/60",
              className
            )}
          >
            {value ? (
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">{value}</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar modelo..." />
            <CommandList>
              <CommandEmpty>No se encontro el modelo.</CommandEmpty>
              <CommandGroup>
                {IPHONE_MODELS.map((model) => (
                  <CommandItem
                    key={model}
                    value={model}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {model}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)
