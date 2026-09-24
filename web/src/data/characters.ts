import type { Character } from "@/game/types";

/**
 * The full character roster (48 illustrated portraits, ~5KB webp each —
 * see /public/characters/*.webp — small enough that the PWA's runtime
 * image cache picks them all up after the first load, see
 * next.config.js). `image` is just a static asset path, so
 * swapping/adding artwork never touches game logic.
 *
 * `id` mirrors the source artwork's filename (lowercased); `name` is the
 * Arabic display name shown in the UI (see CLAUDE.md "Coding conventions"
 * — all UI copy is Arabic), independent of the asset filename.
 *
 * No per-character attributes are stored (no `hasGlasses`, `hairColor`,
 * etc.) — see CLAUDE.md "Game rules" for why that data was removed.
 *
 * A single game never uses the whole roster — see `data/difficulty.ts`'s
 * `pickRandomCharacterIds`, which draws a random subset sized to the
 * chosen difficulty (15 / 20 / 30, clamped to the roster size) from
 * everything here, so the board looks different game to game even at the
 * same difficulty.
 */
export const CHARACTERS: Character[] = [
  { id: "abdelrahman", name: "عبد الرحمن", image: "/characters/abdelrahman.webp" },
  { id: "adel", name: "عادل", image: "/characters/adel.webp" },
  { id: "ahmed", name: "أحمد", image: "/characters/ahmed.webp" },
  { id: "ahmed2", name: "أحمد", image: "/characters/ahmed2.webp" },
  { id: "ali", name: "علي", image: "/characters/ali.webp" },
  { id: "amr", name: "عمرو", image: "/characters/amr.webp" },
  { id: "aya", name: "آية", image: "/characters/aya.webp" },
  { id: "ayman", name: "أيمن", image: "/characters/ayman.webp" },
  { id: "dina", name: "دينا", image: "/characters/dina.webp" },
  { id: "donia", name: "دنيا", image: "/characters/donia.webp" },
  { id: "esraa", name: "إسراء", image: "/characters/esraa.webp" },
  { id: "farah", name: "فرح", image: "/characters/farah.webp" },
  { id: "fathy", name: "فتحي", image: "/characters/fathy.webp" },
  { id: "fatma", name: "فاطمة", image: "/characters/fatma.webp" },
  { id: "gamal", name: "جمال", image: "/characters/gamal.webp" },
  { id: "hala", name: "هالة", image: "/characters/hala.webp" },
  { id: "hamdy", name: "حمدي", image: "/characters/hamdy.webp" },
  { id: "hassan", name: "حسن", image: "/characters/hassan.webp" },
  { id: "heba", name: "هبة", image: "/characters/heba.webp" },
  { id: "hossam", name: "حسام", image: "/characters/hossam.webp" },
  { id: "huda", name: "هدى", image: "/characters/huda.webp" },
  { id: "ibrahim", name: "إبراهيم", image: "/characters/ibrahim.webp" },
  { id: "karim", name: "كريم", image: "/characters/karim.webp" },
  { id: "khaled", name: "خالد", image: "/characters/khaled.webp" },
  { id: "maher", name: "ماهر", image: "/characters/maher.webp" },
  { id: "mahmoud", name: "محمود", image: "/characters/mahmoud.webp" },
  { id: "mariam", name: "مريم", image: "/characters/mariam.webp" },
  { id: "menna", name: "منة", image: "/characters/menna.webp" },
  { id: "mohamed", name: "محمد", image: "/characters/mohamed.webp" },
  { id: "mona", name: "منى", image: "/characters/mona.webp" },
  { id: "mostafa", name: "مصطفى", image: "/characters/mostafa.webp" },
  { id: "nabil", name: "نبيل", image: "/characters/nabil.webp" },
  { id: "nadia", name: "نادية", image: "/characters/nadia.webp" },
  { id: "nour", name: "نور", image: "/characters/nour.webp" },
  { id: "omar", name: "عمر", image: "/characters/omar.webp" },
  { id: "ragab", name: "رجب", image: "/characters/ragab.webp" },
  { id: "rania", name: "رانيا", image: "/characters/rania.webp" },
  { id: "reem", name: "ريم", image: "/characters/reem.webp" },
  { id: "salma", name: "سلمى", image: "/characters/salma.webp" },
  { id: "samir", name: "سمير", image: "/characters/samir.webp" },
  { id: "sayed", name: "سيد", image: "/characters/sayed.webp" },
  { id: "seif", name: "سيف", image: "/characters/seif.webp" },
  { id: "sherif", name: "شريف", image: "/characters/sherif.webp" },
  { id: "tarek", name: "طارق", image: "/characters/tarek.webp" },
  { id: "walid", name: "وليد", image: "/characters/walid.webp" },
  { id: "yasmine", name: "ياسمين", image: "/characters/yasmine.webp" },
  { id: "yehia", name: "يحيى", image: "/characters/yehia.webp" },
  { id: "youssef", name: "يوسف", image: "/characters/youssef.webp" },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
