import {
  Accessibility,
  Bath,
  Bed,
  Bike,
  BookOpen,
  Bus,
  Car,
  ChefHat,
  Church,
  Clipboard,
  Coffee,
  Cross,
  Dumbbell,
  Flower2,
  Gamepad2,
  Heart,
  HeartPulse,
  Mic,
  Pill,
  PawPrint,
  Phone,
  Scissors,
  Shield,
  ShowerHead,
  Sparkles,
  Stethoscope,
  Sun,
  Trees,
  Tv,
  Users,
  Utensils,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react"

/**
 * Maps amenity slugs / labels to dedicated Lucide icons so the
 * facility detail page (and any other amenity render) shows a
 * specific visual cue per amenity instead of a generic dot.
 *
 * Match is case-insensitive substring — the order of keys is the
 * lookup priority. Add more rows as we see new amenity names in
 * the ingest pipeline; the fallback is Heart (a soft "wellness"
 * icon) so unknown amenities still render with something.
 */

interface AmenityRule {
  /** Lowercase substring that must appear in the amenity name. */
  match: string
  icon: LucideIcon
}

// Order matters — first match wins. Put more-specific keywords first.
const RULES: AmenityRule[] = [
  // Health / clinical
  { match: "24-hour nurs", icon: HeartPulse },
  { match: "nurse on", icon: HeartPulse },
  { match: "skilled nurs", icon: HeartPulse },
  { match: "medication", icon: Pill },
  { match: "physician", icon: Stethoscope },
  { match: "physical therapy", icon: Stethoscope },
  { match: "occupational therapy", icon: Stethoscope },
  { match: "speech therapy", icon: Mic },
  { match: "hospice", icon: Cross },
  { match: "podiatry", icon: Stethoscope },
  { match: "wound care", icon: Cross },
  { match: "diabetes", icon: HeartPulse },

  // Dining / kitchen
  { match: "chef", icon: ChefHat },
  { match: "private dining", icon: Utensils },
  { match: "restaurant", icon: Utensils },
  { match: "three meal", icon: Utensils },
  { match: "meal", icon: Utensils },
  { match: "dining", icon: Utensils },
  { match: "kitchen", icon: ChefHat },
  { match: "snack", icon: Coffee },
  { match: "coffee", icon: Coffee },
  { match: "cafe", icon: Coffee },

  // Room features
  { match: "private room", icon: Bed },
  { match: "private bath", icon: Bath },
  { match: "walk-in shower", icon: ShowerHead },
  { match: "shower", icon: ShowerHead },
  { match: "bath", icon: Bath },
  { match: "kitchenette", icon: ChefHat },

  // Tech
  { match: "wi-fi", icon: Wifi },
  { match: "wifi", icon: Wifi },
  { match: "cable", icon: Tv },
  { match: "tv", icon: Tv },
  { match: "telephone", icon: Phone },
  { match: "phone", icon: Phone },

  // Recreation / fitness
  { match: "fitness", icon: Dumbbell },
  { match: "exercise", icon: Dumbbell },
  { match: "gym", icon: Dumbbell },
  { match: "yoga", icon: Sun },
  { match: "pool", icon: Bath },
  { match: "biking", icon: Bike },
  { match: "walking", icon: Trees },
  { match: "garden", icon: Flower2 },
  { match: "outdoor", icon: Trees },
  { match: "courtyard", icon: Trees },

  // Social / activities
  { match: "activities director", icon: Sparkles },
  { match: "social", icon: Users },
  { match: "club", icon: Users },
  { match: "game", icon: Gamepad2 },
  { match: "movie", icon: Tv },
  { match: "library", icon: BookOpen },
  { match: "book", icon: BookOpen },
  { match: "religious", icon: Church },
  { match: "chapel", icon: Church },
  { match: "worship", icon: Church },
  { match: "music", icon: Mic },

  // Services
  { match: "transportation", icon: Bus },
  { match: "shuttle", icon: Bus },
  { match: "parking", icon: Car },
  { match: "valet", icon: Car },
  { match: "housekeeping", icon: Sparkles },
  { match: "laundry", icon: Sparkles },
  { match: "salon", icon: Scissors },
  { match: "barber", icon: Scissors },
  { match: "beauty", icon: Scissors },
  { match: "maintenance", icon: Wrench },
  { match: "concierge", icon: Clipboard },

  // Accessibility / safety
  { match: "wheelchair", icon: Accessibility },
  { match: "accessible", icon: Accessibility },
  { match: "emergency", icon: Shield },
  { match: "secured", icon: Shield },
  { match: "security", icon: Shield },
  { match: "call system", icon: Shield },

  // Misc
  { match: "pet", icon: PawPrint },
  { match: "lgbtq", icon: Heart },
]

/**
 * Pick the best Lucide icon for an amenity name. Falls back to Heart
 * so unknown amenities never crash the UI.
 */
export function amenityIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Heart
  const needle = name.toLowerCase()
  for (const rule of RULES) {
    if (needle.includes(rule.match)) return rule.icon
  }
  return Heart
}
