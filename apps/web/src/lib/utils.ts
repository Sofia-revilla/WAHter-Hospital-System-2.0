import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge"; // so a later "p-4" actually overrides an earlier "p-8"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
