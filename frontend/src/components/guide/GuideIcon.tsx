import { BookOpen, CheckSquare, Rocket, Send, ShoppingCart, Trophy } from "lucide-react";
import type { GuideIcon as Kind } from "@/content/siteGuide";

const ICONS = { welcome: Rocket, buy: ShoppingCart, lessons: BookOpen, tests: CheckSquare, rating: Trophy, telegram: Send } as const;

export default function GuideIcon({ kind, className }: { kind: Kind; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon className={className} aria-hidden="true" />;
}
