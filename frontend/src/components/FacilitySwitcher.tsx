import { useState } from "react"
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function FacilitySwitcher() {
  const { user, switchFacility } = useAuth()
  const [switching, setSwitching] = useState<string | null>(null)

  if (!user) return null

  const memberships = user.facilities
  const active = user.active_facility

  // Single-facility users: show a flat label, no dropdown.
  if (memberships.length <= 1) {
    if (!active) return null
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{active.name}</span>
      </div>
    )
  }

  const onSwitch = async (facilityId: string) => {
    if (facilityId === active?.id) return
    setSwitching(facilityId)
    try {
      await switchFacility(facilityId)
    } finally {
      setSwitching(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate font-medium text-foreground">
            {active?.name ?? "Select facility"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch facility</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => {
          const isActive = m.id === active?.id
          const isLoading = switching === m.id
          return (
            <DropdownMenuItem
              key={m.id}
              onSelect={(e) => {
                e.preventDefault()
                void onSwitch(m.id)
              }}
              className={cn("flex items-center justify-between", isActive && "font-medium")}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate">{m.name}</div>
                {m.role && (
                  <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                )}
              </div>
              {isLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : isActive ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
