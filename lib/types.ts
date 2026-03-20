export type Deal = {
  id: number;
  title: string;
  source: string;
  productType: string;
  setName: string;
  price: number;
  pricePerPack: number;
  score: number;
  seller: string;
  status: string;
  url: string;
};

export type DealsResponse = {
  ok: boolean;
  count: number;
  updatedAt: string;
  deals: Deal[];
};
