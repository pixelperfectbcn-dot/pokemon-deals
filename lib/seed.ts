import type { Deal } from "./types";

export const seedDeals: Omit<Deal, "id" | "createdAt" | "updatedAt">[] = [
  {
    title: "Pokémon TCG Scarlet & Violet 151 Booster Bundle",
    source: "Seed",
    productType: "Booster Bundle",
    setName: "151",
    price: 32.99,
    pricePerPack: 5.5,
    score: 92,
    seller: "Seed",
    status: "Disponible",
    url: "#"
  },
  {
    title: "Pokémon ETB Surging Sparks",
    source: "Seed",
    productType: "ETB",
    setName: "Surging Sparks",
    price: 44.9,
    pricePerPack: 4.99,
    score: 88,
    seller: "Seed",
    status: "Oferta caliente",
    url: "#"
  }
];
