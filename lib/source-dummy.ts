import type { Deal } from "./types";

export async function fetchDummyDeals(): Promise<Omit<Deal, "id" | "createdAt" | "updatedAt">[]> {
  return [
    {
      title: "Pokémon TCG Scarlet & Violet 151 Booster Bundle",
      source: "Amazon",
      productType: "Booster Bundle",
      setName: "151",
      price: 31.49,
      pricePerPack: 5.25,
      score: 94,
      seller: "Amazon",
      status: "Disponible",
      url: "#"
    },
    {
      title: "Pokémon ETB Surging Sparks",
      source: "Chollos",
      productType: "ETB",
      setName: "Surging Sparks",
      price: 42.9,
      pricePerPack: 4.77,
      score: 90,
      seller: "Tienda externa",
      status: "Oferta caliente",
      url: "#"
    },
    {
      title: "Pokémon Booster Box Temporal Forces",
      source: "Amazon",
      productType: "Booster Box",
      setName: "Temporal Forces",
      price: 127.95,
      pricePerPack: 3.55,
      score: 96,
      seller: "Amazon",
      status: "Disponible",
      url: "#"
    },
    {
      title: "Pack 10 sobres Pokémon variados",
      source: "Oferta externa",
      productType: "Booster Pack",
      setName: "Mixed",
      price: 38.9,
      pricePerPack: 3.89,
      score: 82,
      seller: "Marketplace",
      status: "Limitado",
      url: "#"
    }
  ];
}
