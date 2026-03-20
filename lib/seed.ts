import type { Deal } from "./types";

export const seedDeals: Omit<Deal, "id" | "createdAt" | "updatedAt">[] = [
  {
    title: "Pokémon TCG Scarlet & Violet 151 Booster Bundle",
    source: "Amazon",
    productType: "Booster Bundle",
    setName: "151",
    price: 32.99,
    pricePerPack: 5.5,
    score: 92,
    seller: "Amazon",
    status: "Disponible",
    url: "#"
  },
  {
    title: "Pokémon ETB Surging Sparks",
    source: "Chollos",
    productType: "ETB",
    setName: "Surging Sparks",
    price: 44.9,
    pricePerPack: 4.99,
    score: 88,
    seller: "Tienda externa",
    status: "Oferta caliente",
    url: "#"
  },
  {
    title: "Pokémon Booster Box Temporal Forces",
    source: "Amazon",
    productType: "Booster Box",
    setName: "Temporal Forces",
    price: 129.95,
    pricePerPack: 3.61,
    score: 95,
    seller: "Amazon",
    status: "Disponible",
    url: "#"
  },
  {
    title: "Pack 10 sobres Pokémon variados",
    source: "Oferta externa",
    productType: "Booster Pack",
    setName: "Mixed",
    price: 39.9,
    pricePerPack: 3.99,
    score: 81,
    seller: "Marketplace",
    status: "Limitado",
    url: "#"
  }
];
