"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
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
import type { Deal, DealsResponse } from "@/lib/types";

const sourceStatus = [
  {
    name: "Amazon API",
    status: "Pending",
    detail: "Se conectará en la siguiente fase"
  },
  {
    name: "Webs de ofertas",
    status: "Pending",
    detail: "Scrapers modulares, RSS o parsers HTML"
  },
  {
    name: "Alertas",
    status: "Ready",
    detail: "UI preparada para Telegram y email"
  },
  {
    name: "Backend API",
    status: "Online",
    detail: "Endpoints /api/deals, /api/health y /api/refresh"
  }
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

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cls("rounded-[24px] border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

function Badge({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cls(
        "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700",
        className
      )}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </div>
      {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
    </div>
  );
}

export default function HomePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [query, setQuery] = useState("pokemon");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [tab, setTab] = useState<"deals" | "sources" | "architecture">("deals");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    try {
      setLoading(true);
      const response = await fetch("/api/deals", { cache: "no-store" });
      const data: DealsResponse = await response.json();
      setDeals(data.deals);
      setUpdatedAt(data.updatedAt);
    } catch (error) {
      console.error("Error cargando deals:", error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerRefresh() {
    try {
      setRefreshing(true);
      await fetch("/api/refresh", { method: "POST" });
      await loadDeals();
    } catch (error) {
      console.error("Error refrescando:", error);
    } finally {
      setRefreshing(false);
    }
  }

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesQuery = `${deal.title} ${deal.setName}`
        .toLowerCase()
        .includes(query.toLowerCase());
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
                  Fase 2: frontend conectado al backend interno
                </div>

                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  Pokemon Deals Radar
                </h1>

                <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                  Ahora la web ya consume datos desde la API interna de Next.js y queda preparada
                  para enchufar PostgreSQL, worker y scraping real en la siguiente fase.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge>API interna</Badge>
                  <Badge>GET /api/deals</Badge>
                  <Badge>POST /api/refresh</Badge>
                  <Badge>Preparado para DB</Badge>
                </div>

                <div className="text-sm text-slate-500">
                  {updatedAt ? `Última actualización: ${new Date(updatedAt).toLocaleString("es-ES")}` : "Cargando..."}
                </div>
              </div>

              <Card className="p-5">
                <div className="mb-1 text-sm text-slate-500">Mejor oferta detectada</div>
                <div className="mb-4 text-xs text-slate-400">
                  Ranking por score y precio por sobre
                </div>

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

                    <div className="text-sm text-slate-600">
                      €{topDeal.pricePerPack.toFixed(2)} por sobre
                    </div>

                    <a
                      href={topDeal.url}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                    >
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
            <SectionTitle
              icon={<Filter className="h-4 w-4" />}
              title="Filtros"
              subtitle="Filtra por búsqueda, tipo y fuente"
            />

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                    placeholder="151, ETB, booster..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Tipo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                >
                  <option value="all">Todos</option>
                  <option value="Booster Pack">Booster Pack</option>
                  <option value="Booster Bundle">Booster Bundle</option>
                  <option value="Booster Box">Booster Box</option>
                  <option value="ETB">ETB</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Fuente</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-400"
                >
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
                <button
                  type="button"
                  onClick={() => setAlertsEnabled(!alertsEnabled)}
                  className={cls(
                    "relative h-7 w-12 rounded-full transition",
                    alertsEnabled ? "bg-slate-900" : "bg-slate-300"
                  )}
                >
                  <span
                    className={cls(
                      "absolute top-1 h-5 w-5 rounded-full bg-white transition",
                      alertsEnabled ? "left-6" : "left-1"
                    )}
                  />
                </button>
              </div>

              <button
                onClick={triggerRefresh}
                disabled={refreshing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Bell className="h-4 w-4" />
                {refreshing ? "Actualizando..." : "Probar refresh backend"}
              </button>
            </div>
          </Card>

          <div className="space-y-6 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTab("deals")}
                className={cls(
                  "rounded-2xl px-4 py-2 text-sm font-medium",
                  tab === "deals" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"
                )}
              >
                Ofertas
              </button>
              <button
                onClick={() => setTab("sources")}
                className={cls(
                  "rounded-2xl px-4 py-2 text-sm font-medium",
                  tab === "sources" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"
                )}
              >
                Fuentes
              </button>
              <button
                onClick={() => setTab("architecture")}
                className={cls(
                  "rounded-2xl px-4 py-2 text-sm font-medium",
                  tab === "architecture" ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"
                )}
              >
                Arquitectura
              </button>

              <button
                onClick={loadDeals}
                disabled={loading}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
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
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="h-full p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <Badge>{deal.source}</Badge>
                          <Badge>{deal.score}/100</Badge>
                        </div>

                        <div className="mb-2 text-lg font-semibold leading-snug">{deal.title}</div>
                        <div className="mb-4 text-sm text-slate-500">
                          {deal.setName} · {deal.productType}
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-xs text-slate-500">Precio</div>
                            <div className="text-lg font-semibold">€{deal.price.toFixed(2)}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-xs text-slate-500">€/sobre</div>
                            <div className="text-lg font-semibold">
                              €{deal.pricePerPack.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {deal.seller}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-4 w-4" />
                            {badgeByScore(deal.score)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">{deal.status}</span>
                          <a
                            href={deal.url}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                          >
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
                    <p>La UI ya consume datos desde el backend interno.</p>
                    <p>Preparado para pasar a datos persistidos en PostgreSQL.</p>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon={<RefreshCw className="h-4 w-4" />} title="Backend" />
                  <div className="space-y-3 text-slate-700">
                    <p>GET /api/deals devuelve el catálogo actual.</p>
                    <p>GET /api/health sirve para checks de salud.</p>
                    <p>POST /api/refresh queda listo para enchufar el worker.</p>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle icon={<Database className="h-4 w-4" />} title="Datos" />
                  <div className="space-y-3 text-slate-700">
                    <p>Ahora mismo hay datos mock centralizados en lib/deals.ts.</p>
                    <p>La siguiente fase será PostgreSQL + price_history.</p>
                    <p>La estructura ya separa tipos y capa de datos.</p>
                  </div>
                </Card>

                <Card className="p-5">
                  <SectionTitle
                    icon={<TrendingDown className="h-4 w-4" />}
                    title="Siguiente fase"
                  />
                  <div className="space-y-3 text-slate-700">
                    <p>Conectar base de datos en Railway.</p>
                    <p>Añadir scraper/worker y cron jobs.</p>
                    <p>Reemplazar mocks por datos reales de ofertas.</p>
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
