import type { Deal } from "./types";

export async function fetchDummyDeals(): Promise<Omit<Deal, "id" | "createdAt" | "updatedAt">[]> {
  return [
    {
      title: "Pokémon TCG Scarlet & Violet 151 Booster Bundle",
      source: "Dummy",
      productType: "Booster Bundle",
      setName: "151",
      price: 31.49,
      pricePerPack: 5.25,
      score: 94,
      seller: "Dummy",
      status: "Disponible",
      url: "#"
    },
    {
      title: "Pokémon ETB Surging Sparks",
      source: "Dummy",
      productType: "ETB",
      setName: "Surging Sparks",
      price: 42.9,
      pricePerPack: 4.77,
      score: 90,
      seller: "Dummy",
      status: "Oferta caliente",
      url: "#"
    }
  ];
}
