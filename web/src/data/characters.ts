import type { Character } from "@/game/types";

/**
 * The full character roster (88 illustrated portraits, ~9.5KB webp each —
 * see /public/characters/*.webp — small enough that the PWA's runtime
 * image cache picks them all up after the first load, see
 * next.config.js). `image` is just a static asset path, so
 * swapping/adding artwork never touches game logic.
 *
 * No per-character attributes are stored (no `hasGlasses`, `hairColor`,
 * etc.) — see CLAUDE.md "Game rules" for why that data was removed.
 *
 * A single game never uses the whole roster — see `data/difficulty.ts`'s
 * `pickRandomCharacterIds`, which draws a random subset sized to the
 * chosen difficulty (15 / 20 / 30) from everything here, so the board
 * looks different game to game even at the same difficulty.
 */
export const CHARACTERS: Character[] = [
  { id: "aaron", name: "Aaron", image: "/characters/aaron.webp" },
  { id: "abdelrahman", name: "Abdelrahman", image: "/characters/abdelrahman.webp" },
  { id: "adel", name: "Adel", image: "/characters/adel.webp" },
  { id: "adrian", name: "Adrian", image: "/characters/adrian.webp" },
  { id: "ahmed", name: "Ahmed", image: "/characters/ahmed.webp" },
  { id: "alexander", name: "Alexander", image: "/characters/alexander.webp" },
  { id: "amal", name: "Amal", image: "/characters/amal.webp" },
  { id: "amelia", name: "Amelia", image: "/characters/amelia.webp" },
  { id: "amina", name: "Amina", image: "/characters/amina.webp" },
  { id: "amr", name: "Amr", image: "/characters/amr.webp" },
  { id: "antar", name: "Antar", image: "/characters/antar.webp" },
  { id: "arthur", name: "Arthur", image: "/characters/arthur.webp" },
  { id: "aya", name: "Aya", image: "/characters/aya.webp" },
  { id: "bianca", name: "Bianca", image: "/characters/bianca.webp" },
  { id: "charles", name: "Charles", image: "/characters/charles.webp" },
  { id: "chloe", name: "Chloe", image: "/characters/chloe.webp" },
  { id: "diana", name: "Diana", image: "/characters/diana.webp" },
  { id: "dina", name: "Dina", image: "/characters/dina.webp" },
  { id: "dylan", name: "Dylan", image: "/characters/dylan.webp" },
  { id: "edward", name: "Edward", image: "/characters/edward.webp" },
  { id: "eleanor", name: "Eleanor", image: "/characters/eleanor.webp" },
  { id: "elena", name: "Elena", image: "/characters/elena.webp" },
  { id: "ella", name: "Ella", image: "/characters/ella.webp" },
  { id: "esraa", name: "Esraa", image: "/characters/esraa.webp" },
  { id: "eva", name: "Eva", image: "/characters/eva.webp" },
  { id: "evelyn", name: "Evelyn", image: "/characters/evelyn.webp" },
  { id: "farida", name: "Farida", image: "/characters/farida.webp" },
  { id: "fatima", name: "Fatima", image: "/characters/fatima.webp" },
  { id: "francis", name: "Francis", image: "/characters/francis.webp" },
  { id: "grace", name: "Grace", image: "/characters/grace.webp" },
  { id: "hala", name: "Hala", image: "/characters/hala.webp" },
  { id: "hannah", name: "Hannah", image: "/characters/hannah.webp" },
  { id: "hany", name: "Hany", image: "/characters/hany.webp" },
  { id: "harper", name: "Harper", image: "/characters/harper.webp" },
  { id: "hassan", name: "Hassan", image: "/characters/hassan.webp" },
  { id: "hazel", name: "Hazel", image: "/characters/hazel.webp" },
  { id: "heba", name: "Heba", image: "/characters/heba.webp" },
  { id: "helen", name: "Helen", image: "/characters/helen.webp" },
  { id: "henry", name: "Henry", image: "/characters/henry.webp" },
  { id: "ibrahim", name: "Ibrahim", image: "/characters/ibrahim.webp" },
  { id: "jackson", name: "Jackson", image: "/characters/jackson.webp" },
  { id: "james", name: "James", image: "/characters/james.webp" },
  { id: "jasmine", name: "Jasmine", image: "/characters/jasmine.webp" },
  { id: "joseph", name: "Joseph", image: "/characters/joseph.webp" },
  { id: "karim", name: "Karim", image: "/characters/karim.webp" },
  { id: "khaled", name: "Khaled", image: "/characters/khaled.webp" },
  { id: "layla", name: "Layla", image: "/characters/layla.webp" },
  { id: "leah", name: "Leah", image: "/characters/leah.webp" },
  { id: "lily", name: "Lily", image: "/characters/lily.webp" },
  { id: "lucas", name: "Lucas", image: "/characters/lucas.webp" },
  { id: "mahmoud", name: "Mahmoud", image: "/characters/mahmoud.webp" },
  { id: "mariam", name: "Mariam", image: "/characters/mariam.webp" },
  { id: "martin", name: "Martin", image: "/characters/martin.webp" },
  { id: "mason", name: "Mason", image: "/characters/mason.webp" },
  { id: "matthew", name: "Matthew", image: "/characters/matthew.webp" },
  { id: "mona", name: "Mona", image: "/characters/mona.webp" },
  { id: "mostafa", name: "Mostafa", image: "/characters/mostafa.webp" },
  { id: "nabil", name: "Nabil", image: "/characters/nabil.webp" },
  { id: "nadia", name: "Nadia", image: "/characters/nadia.webp" },
  { id: "nora", name: "Nora", image: "/characters/nora.webp" },
  { id: "nour", name: "Nour", image: "/characters/nour.webp" },
  { id: "olivia", name: "Olivia", image: "/characters/olivia.webp" },
  { id: "omar", name: "Omar", image: "/characters/omar.webp" },
  { id: "owen", name: "Owen", image: "/characters/owen.webp" },
  { id: "patrick", name: "Patrick", image: "/characters/patrick.webp" },
  { id: "penelope", name: "Penelope", image: "/characters/penelope.webp" },
  { id: "rana", name: "Rana", image: "/characters/rana.webp" },
  { id: "rania", name: "Rania", image: "/characters/rania.webp" },
  { id: "roma", name: "Roma", image: "/characters/roma.webp" },
  { id: "ruben", name: "Ruben", image: "/characters/ruben.webp" },
  { id: "salah", name: "Salah", image: "/characters/salah.webp" },
  { id: "salma", name: "Salma", image: "/characters/salma.webp" },
  { id: "samer", name: "Samer", image: "/characters/samer.webp" },
  { id: "samir", name: "Samir", image: "/characters/samir.webp" },
  { id: "samuel", name: "Samuel", image: "/characters/samuel.webp" },
  { id: "scarlett", name: "Scarlett", image: "/characters/scarlett.webp" },
  { id: "sobhy", name: "Sobhy", image: "/characters/sobhy.webp" },
  { id: "sophia", name: "Sophia", image: "/characters/sophia.webp" },
  { id: "stella", name: "Stella", image: "/characters/stella.webp" },
  { id: "tarek", name: "Tarek", image: "/characters/tarek.webp" },
  { id: "tawfik", name: "Tawfik", image: "/characters/tawfik.webp" },
  { id: "thomas", name: "Thomas", image: "/characters/thomas.webp" },
  { id: "victor", name: "Victor", image: "/characters/victor.webp" },
  { id: "violet", name: "Violet", image: "/characters/violet.webp" },
  { id: "walid", name: "Walid", image: "/characters/walid.webp" },
  { id: "william", name: "William", image: "/characters/william.webp" },
  { id: "youssef", name: "Youssef", image: "/characters/youssef.webp" },
  { id: "ziad", name: "Ziad", image: "/characters/ziad.webp" },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
