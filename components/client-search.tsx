'use client'

import * as React from "react"
import { Check, ChevronsUpDown, User, Building2, Store } from "lucide-react"
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
import type { Cliente, TipoCliente } from "@/lib/types/database"

interface ClientSearchProps {
  clientes: Cliente[]
  value: string | null
  onSelect: (clienteId: string | null, cliente: Cliente | null) => void
  placeholder?: string
  className?: string
}

const tipoIcons: Record<TipoCliente, typeof User> = {
  retail: User,
  gremio: Building2,
  franquicia: Store,
}

const tipoLabels: Record<TipoCliente, string> = {
  retail: "Retail",
  gremio: "Gremio",
  franquicia: "Franquicia",
}

export function ClientSearch({
  clientes,
  value,
  onSelect,
  placeholder = "Buscar cliente...",
  className,
}: ClientSearchProps) {
  const [open, setOpen] = React.useState(false)
  const selectedClient = clientes.find((c) => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-12 rounded-xl border-border/60 bg-secondary/30 text-[15px] hover:bg-secondary/50 transition-colors",
            !value && "text-muted-foreground/60",
            className
          )}
        >
          {selectedClient ? (
            <div className="flex items-center gap-2.5 truncate">
              {React.createElement(tipoIcons[selectedClient.tipo], {
                className: "h-4 w-4 shrink-0 text-muted-foreground",
              })}
              <span className="truncate text-foreground">{selectedClient.nombre}</span>
              {selectedClient.nombre_negocio && (
                <span className="text-muted-foreground/70 text-[13px] truncate">
                  ({selectedClient.nombre_negocio})
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar por nombre..." />
          <CommandList>
            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
            <CommandGroup>
              {clientes.map((cliente) => {
                const Icon = tipoIcons[cliente.tipo]
                return (
                  <CommandItem
                    key={cliente.id}
                    value={`${cliente.nombre} ${cliente.nombre_negocio || ""}`}
                    onSelect={() => {
                      onSelect(
                        cliente.id === value ? null : cliente.id,
                        cliente.id === value ? null : cliente
                      )
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === cliente.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-[14px]">{cliente.nombre}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {cliente.nombre_negocio
                          ? `${cliente.nombre_negocio} — ${tipoLabels[cliente.tipo]}`
                          : tipoLabels[cliente.tipo]}
                      </span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
