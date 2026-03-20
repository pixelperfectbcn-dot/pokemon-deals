"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  Globe,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  TrendingDown
} from "lucide-react";
import type { Deal, DealsResponse, HistoryResponse, PriceHistoryItem } from "@/lib/types";
import { normalizeText } from "@/lib/text";

const sourceStatus = [
  { name: "Amazon API", status: "Pending", detail: "Se conectará en la siguiente fase" },
  { name: "Webs de ofertas", status: "Dummy source", detail: "Refresh ya simula una fuente externa" },
  { name: "Alertas", status: "Ready", detail: "UI preparada para Telegram y email" },
  { name: "PostgreSQL", status: "Online", detail: "Deals y snapshots persistidos en base de datos" }
];

function badgeByScore(score: number) {
  if (score >= 90) return "Excelente";
  if (score >= 80) return "Muy buena";
  if (score >= 70) return "Buena";
  return "Media";
}

function cls(...values: string[]) {
  return values.filter(Boolean).join(" ");
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cls("rounded-[24px] border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cls("inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700", className)}>
      {children}
    </span>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-lg font-semibold">{icon}{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

export default function HomePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const [query, setQuery] = useState("pokemon");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [tab, setTab] = useState<"deals" | "sources" | "architecture" | "history">("deals");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [dealsRes, historyRes] = await Promise.all([
        fetch("/api/deals", { cache: "no-store" }),
        fetch("/api/history", { cache: "no-store" })
      ]);

      const dealsData: DealsResponse = await dealsRes.json();
      const historyData: HistoryResponse = await historyRes.json();

      setDeals(dealsData.deals ?? []);
      setUpdatedAt(dealsData.updatedAt ?? "");
      setHistory(historyData.items ?? []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      setDeals([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  async function triggerRefresh() {
    try {
      setRefreshing(true);
      await fetch("/api/refresh", { method: "POST" });
      await loadAll();
    } catch (error) {
      console.error("Error refrescando:", error);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const haystack = normalizeText(`${deal.title} ${deal.setName}`);
      const needle = normalizeText(query);
      const matchesQuery = haystack.includes(needle);
      const matchesType = type === "all" || deal.productType === type;
      const matchesSource = source === "all" || deal.source === source;
      return matchesQuery && matchesType && matchesSource;
    });
  }, [deals, query, type, source]);

  const topDeal = [...filteredDeals].sort((a, b) => b.score - a.score)[0];

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden bg-gradient-to-r from-white to-slate-100">
            <div className="grid gap-6 p-6 md:grid-cols-3 md:p-8">
              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ShieldCheck className="h-4 w-4" />
                  Fase 4: histórico de precios + refresh de fuente
                </div>

                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Pokemon Deals Radar</h1>

                <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                  Ya guardas el estado actual del deal y también snapshots de precio en price_history.
                  El botón de actualización simula la llegada de una fuente externa y persiste cambios.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge>PostgreSQL</Badge>
                  <Badge>price_history</Badge>
                  <Badge>GET /api/history</Badge>
                  <Badge>POST /api/refresh</Badge>
                </div>

                <div className="text-sm text-slate-500">
                  {updatedAt ? `Última actualización: ${new Date(updatedAt).toLocaleString("es-ES")}` : "Cargando..."}
                </div>
              </div>

              <Card className="p-5">
                <div className="mb-1 text-sm text-slate-500">Mejor oferta detectada</div>
                <div className="mb-4 text-xs text-slate-400">Ranking por score y precio por sobre</div>

                {loading ? (
                  <div className="text-slate-500">Cargando ofertas...</div>
                ) : topDeal ? (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-500">{topDeal.source}</div>
                    <div className="text-xl font-semibold leading-snug">{topDeal.title}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">€{topDeal.price.toFixed(2)}</span>
                      <Badge>{badgeByScore(topDeal.score)}</Badge>
                    </div>
                    <div className="text-sm text-slate-600">€{topDeal.pricePerPack.toFixed(2)} por sobre</div>
                    <a href={topDeal.url} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
                      <ExternalLink className="h-4 w-4" />
                      Ver oferta
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-500">No hay resultados para ese filtro.</div>
                )}
              </Card>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="p-5 lg:col-span-1">
            <SectionTitle icon={<Filter className="h-4 w-4" />} title="Filtros" subtitle="Filtra por búsqueda, tipo y fuente" />
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none placeholder:text-slate-400 focus:border-slate-400" placeholder="151, ETB, booster..." />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Tipo</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400">
                  <option value="all">Todos</option>
                  <option value="Booster Pack">Booster Pack</option>
                  <option value="Booster Bundle">Booster Bundle</option>
                  <option value="Booster Box">Booster Box</option>
                  <option value="ETB">ETB</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Fuente</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400">
                  <option value="all">Todas</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Chollos">Chollos</option>
                  <option value="Oferta externa">Oferta externa</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-medium">Alertas activas</div>
                  <div className="text-xs text-slate-500">Telegram / email</div>
                </div>
                <button type="button" onClick={() => setAlertsEnabled(!alertsEnabled)} className={cls("relative h-7 w-12 rounded-full transition", alertsEnabled ? "bg-slate-900" : "bg-slate-300")}>
                  <span className={cls("absolute top-1 h-5 w-5 rounded-full bg-white transition", alertsEnabled ? "left-6" : "left-1")} />
                </button>
              </div>

              <button onClick={triggerRefresh} disabled={refreshing} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                <Bell className="h-4 w-4" />
                {refreshing ? "Actualizando..." : "Actualizar fuente"}
              </button>
            </div>
          </Card>

          <div className="space-y-6 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-2">
              {["deals", "history", "sources", "architecture"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t as "deals" | "history" | "sources" | "architecture")}
                  className={cls("rounded-2xl px-4 py-2 text-sm font-medium", tab === t ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700")}
                >
                  {t === "deals" ? "Ofertas" : t === "history" ? "Histórico" : t === "sources" ? "Fuentes" : "Arquitectura"}
                </button>
              ))}

              <button onClick={loadAll} disabled={loading} className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
                <RefreshCw className={cls("h-4 w-4", loading ? "animate-spin" : "")} />
                Recargar API
              </button>
            </div>

            {tab === "deals" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {loading ? (
                  <Card className="p-5 md:col-span-2 xl:col-span-3">
                    <div className="text-slate-500">Cargando ofertas desde /api/deals...</div>
                  </Card>
                ) : (
                  filteredDeals.map((deal) => (
                    <motion.div key={deal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="h-full p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <Badge>{deal.source}</Badge>
                          <Badge>{deal.score}/100</Badge>
                        </div>

                        <div className="mb-2 text-lg font-semibold leading-snug">{deal.title}</div>
                        <div className="mb-4 text-sm text-slate-500">{deal.setName} · {deal.productType}</div>

                        <div className="mb-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-xs text-slate-500">Precio</div>
                            <div className="text-lg font-semibold">€{deal.price.toFixed(2)}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-xs text-slate-500">€/sobre</div>
                            <div className="text-lg font-semibold">€{deal.pricePerPack.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1"><Package className="h-4 w-4" />{deal.seller}</span>
                          <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" />{badgeByScore(deal.score)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">{deal.status}</span>
                          <a href={deal.url} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                            <ExternalLink className="h-4 w-4" />
                            Ver
                          </a>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {tab === "history" && (
              <div className="grid gap-4">
                {loading ? (
                  <Card className="p-5">
                    <div className="text-slate-500">Cargando histórico...</div>
                  </Card>
                ) : history.length === 0 ? (
                  <Card className="p-5">
                    <div className="text-slate-500">Aún no hay snapshots. Pulsa "Actualizar fuente".</div>
                  </Card>
                ) : (
                  history.map((item) => (
                    <Card key={item.id} className="p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-lg font-semibold">{item.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <Clock3 className="h-4 w-4" />
                            {new Date(item.observedAt).toLocaleString("es-ES")}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:w-[260px]">
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-xs text-slate-500">Precio</div>
                            <div className="text-lg font-semibold">€{item.price.toFixed(2)}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-xs text-slate-500">€/sobre</div>
                            <div className="text-lg font-semibold">€{item.pricePerPack.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {tab === "sources" && (
              <div className="grid gap-4 md:grid-cols-2">
                {sourceStatus.map((item) => (
                  <Card key={item.name} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold">{item.name}</div>
                        <div className="mt-1 text-slate-600">{item.detail}</div>
                      </div>
                      <Badge>{item.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {tab === "architecture" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-5">
                  <SectionTitle icon={<Globe className="h-4 w-4" />} title="Frontend" />
                  <div className="space-y-3 text-slate-700">
                    <p>Next.js para la web pública y panel privado.</p>
                    <p>Búsqueda normalizada sin problema de tildes.</p>
                    <p>La UI consume deals e histórico desde PostgreSQL.</p>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon={<RefreshCw className="h-4 w-4" />} title="Backend" />
                  <div className="space-y-3 text-slate-700">
                    <p>GET /api/deals consulta la base de datos.</p>
                    <p>GET /api/history devuelve snapshots recientes.</p>
                    <p>POST /api/refresh simula una fuente externa.</p>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon={<Database className="h-4 w-4" />} title="Datos" />
                  <div className="space-y-3 text-slate-700">
                    <p>Deals persistidos en PostgreSQL.</p>
                    <p>price_history guarda la evolución de precios.</p>
                    <p>Los snapshots solo se insertan cuando cambia el precio.</p>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon={<TrendingDown className="h-4 w-4" />} title="Siguiente fase" />
                  <div className="space-y-3 text-slate-700">
                    <p>Añadir scraper/worker separado.</p>
                    <p>Conectar fuentes reales.</p>
                    <p>Activar alertas por precio y producto.</p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
