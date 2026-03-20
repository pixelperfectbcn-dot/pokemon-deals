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
  createdAt?: string;
  updatedAt?: string;
};

export type PriceHistoryItem = {
  id: number;
  dealId: number;
  title: string;
  price: number;
  pricePerPack: number;
  observedAt: string;
};

export type DealsResponse = {
  ok: boolean;
  count: number;
  updatedAt: string;
  deals: Deal[];
};

export type HistoryResponse = {
  ok: boolean;
  count: number;
  items: PriceHistoryItem[];
};
