'use client';
import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, CheckCircle2, Info, PlusCircle, Trash2, Calculator, Settings, Layers, ReceiptText } from "lucide-react";

/**
 * Calculadora de Stickers — v1.13.0 (UI Refresh)
 * - Solo estética: colores suaves tipo dashboard (inspiración de referencia)
 * - Cards redondeadas 3XL, sombras sutiles, acento esmeralda
 * - Header con iconos, fondo con patrón suave
 * - Mantiene todas las funcionalidades intactas
 */

// Mapa de stickers por hoja según tamaño (cm)
const PER_SHEET: Record<number, number> = {
  1: 50,
  2: 50,
  3: 30,
  4: 18,
  5: 13,
  6: 7,
  7: 6, // Confirmado
  8: 5,
  9: 2,
  10: 2,
};

// Acabados disponibles (tipado estricto)
const acabados = [
  { value: "vinil_blanco", label: "Vinil blanco" },
  { value: "holo_clasico", label: "Holo clásico" },
  { value: "holo_puntos", label: "Holo puntos" },
  { value: "holo_arena", label: "Holo arena" },
  { value: "vinil_blanco_laminado", label: "Vinil blanco laminado" },
] as const;

type Finish = typeof acabados[number]["value"];

// Costos por hoja por acabado (MXN)
const COST_PER_SHEET: Record<Finish, number> = {
  vinil_blanco: 5.9,
  holo_clasico: 6.3,
  holo_puntos: 8.3,
  holo_arena: 10,
  vinil_blanco_laminado: 11,
};

// Gastos fijos (MXN)
const FIXED_COSTS = [
  { key: "caja_envio", label: "Caja de envío", value: 20 },
  { key: "tapete_corte", label: "Tapete de corte", value: 0.76 },
  { key: "cinta_kraft", label: "Cinta kraft", value: 4 },
  { key: "guia_envio", label: "Guía de envío", value: 0.3 },
] as const;

// Costos variables por hoja (MXN)
const VARIABLE_RATES = {
  tinta: 0.25,
  corte: 0.13,
  cinta_magica: 0.7,
} as const;

// Impuestos
const IVA_RATE = 0.16;

// Cargo incluido por cotización en multicotización
const INCLUDED_FEE_PER_QUOTE = 80; // MXN

// Utilidades puras
const getStickersPerSheet = (sizeCm: number) => PER_SHEET[sizeCm] ?? 0;
const getMargin = (sizeCm: number) => (sizeCm <= 7 ? 0.46 : 0.33);
const getCostPerSheet = (finish: Finish) => COST_PER_SHEET[finish] ?? 0;
const getFinishLabel = (value: Finish) => acabados.find((a) => a.value === value)?.label ?? value;

const computeSheetsNeeded = (qty: number, sizeCm: number) => {
  const per = getStickersPerSheet(sizeCm);
  if (!qty || !per) return 0;
  return Math.ceil(qty / per);
};

const computeVariableCostsBySheet = (sheets: number) => {
  const tinta = sheets * VARIABLE_RATES.tinta;
  const corte = sheets * VARIABLE_RATES.corte;
  const cinta = sheets * VARIABLE_RATES.cinta_magica;
  const total = tinta + corte + cinta;
  return { tinta, corte, cinta, total };
};

// Plástico envoltorio: 2.1 por cada 100 stickers (ceil)
const computePackagingCost = (qty: number) => {
  if (qty <= 0) return 0;
  const blocks = Math.ceil(qty / 100);
  return blocks * 2.1;
};

// Totales de venta
const computeProfit = (operarios: number, marginRate: number) => operarios * marginRate;
const computeTotals = (operarios: number, marginRate: number, ivaRate = IVA_RATE) => {
  const profit = computeProfit(operarios, marginRate);
  const subtotal = operarios + profit;
  const iva = subtotal * ivaRate;
  const total = subtotal + iva;
  return { profit, subtotal, iva, total };
};

// División de beneficios (IVA + margen)
const ALELI_RATE = 0.55;
const PEPE_RATE = 0.45;
const computeBenefitSplit = (base: number) => ({
  aleli: base * ALELI_RATE,
  pepe: base * PEPE_RATE,
});

// Helpers para cotización sin envío (compat/tests)
const computeOperariosWithoutShipping = (qty: number, sizeCm: number, finish: Finish) => {
  const sheets = computeSheetsNeeded(qty, sizeCm);
  const costPer = getCostPerSheet(finish);
  const vinyl = sheets * costPer;
  const fixed = FIXED_COSTS.reduce((acc, c) => acc + c.value, 0);
  const vars = computeVariableCostsBySheet(sheets).total;
  const pack = computePackagingCost(qty);
  return vinyl + fixed + vars + pack; // sin envío
};

export const computeQuoteTotalNoShipping = (qty: number, sizeCm: number, finish: Finish) => {
  const operariosNoShip = computeOperariosWithoutShipping(qty, sizeCm, finish);
  const margin = getMargin(sizeCm);
  const { total } = computeTotals(operariosNoShip, margin, IVA_RATE);
  return Math.ceil(total);
};

// --- Cotización con $80 incluido por cotización ---
export const computeQuoteTotalWithIncludedFee = (qty: number, sizeCm: number, finish: Finish, fee = INCLUDED_FEE_PER_QUOTE) => {
  const operariosNoShip = computeOperariosWithoutShipping(qty, sizeCm, finish);
  const base = operariosNoShip + Math.max(0, fee);
  const margin = getMargin(sizeCm);
  const { total } = computeTotals(base, margin, IVA_RATE);
  return Math.ceil(total);
};

export const computeCombinedTotalIncluded = (totalsWithFee: number[], shipping: number, feePerQuote = INCLUDED_FEE_PER_QUOTE) => {
  const sum = totalsWithFee.reduce((a, b) => a + b, 0);
  const remainder = Math.max(0, Math.max(0, shipping) - feePerQuote * totalsWithFee.length);
  return Math.ceil(sum + remainder);
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatPercent(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)} MXN`;
  }
}

function formatCurrencyInt(n: number) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)} MXN`;
  }
}

// Tipo de ítem guardado
type SavedQuote = {
  id: number;
  clientName: string;
  sizeCm: number;
  qty: number;
  finish: Finish;
  finishLabel: string;
  marginRate: number;
  totalNoShippingRounded: number;      // referencia
  totalWithIncludedRounded: number;    // usado en multicotización
  profitIncluded: number;              // MXN
  ivaIncluded: number;                 // MXN
  includedFee: number;                 // MXN
};

// ---------- Feedback UX: vibración + beep suave (dulce) ----------
let __audioCtx: any | null = null;
function tapFeedback() {
  try { if (navigator.vibrate) navigator.vibrate(10); } catch {}
  try {
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!__audioCtx) __audioCtx = new Ctx();
    const ctx: any = __audioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(660, t0);
    osc.frequency.linearRampToValueAtTime(880, t0 + 0.12);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.03, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.20);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  } catch {}
}

// Construye el texto para WhatsApp (multicotización, humano y con costos)
function buildMultiText(quotes: SavedQuote[], shipping: number, feePerQuote = INCLUDED_FEE_PER_QUOTE) {
  const lines: string[] = [];
  lines.push("Perfecto, ya tenemos tu cotización:");
  if (quotes.length === 0) {
    lines.push("— Sin cotizaciones guardadas —");
  } else {
    let suma = 0;
    for (const q of quotes) {
      suma += q.totalWithIncludedRounded;
      lines.push(`- ${q.sizeCm} cm · ${q.qty} stickers · ${q.finishLabel} — ${formatCurrencyInt(q.totalWithIncludedRounded)}`);
    }
    const remaining = Math.max(0, shipping - feePerQuote * quotes.length);
    const totalFinal = Math.ceil(suma + remaining);
    lines.push(`Total por todo: ${formatCurrencyInt(totalFinal)}`);
    if (remaining <= 0) lines.push("Envío gratis 🙌");
  }
  return lines.join("\n");
}

// Texto para WhatsApp (cotización simple)
function buildSingleText(sizeCm: number, qty: number, finishLabel: string, totalRounded: number, shipping: number) {
  const lines: string[] = [];
  lines.push("Perfecto, ya tenemos tu cotización:");
  lines.push(`- ${sizeCm} cm · ${qty} stickers · ${finishLabel} — ${formatCurrencyInt(totalRounded)}`);
  if (shipping <= 0) lines.push("Envío gratis 🙌");
  return lines.join("\n");
}

export default function StickerCalculator() {
  const [clientName, setClientName] = useState<string>("");
  const [sizeCm, setSizeCm] = useState<number>(5);
  const [qty, setQty] = useState<number>(100);
  const [finish, setFinish] = useState<Finish>(acabados[0].value);
  const [shipping, setShipping] = useState<number>(159);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [printText, setPrintText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLTextAreaElement>(null);

  const margin = getMargin(sizeCm);

  const stickersPerSheet = getStickersPerSheet(sizeCm);
  const sheetsNeeded = computeSheetsNeeded(qty, sizeCm);
  const costPerSheet = getCostPerSheet(finish);
  const totalVinylCost = sheetsNeeded * costPerSheet;
  const fixedTotal = FIXED_COSTS.reduce((acc, c) => acc + c.value, 0);

  const variableBySheet = computeVariableCostsBySheet(sheetsNeeded);
  const packaging = computePackagingCost(qty);
  const variablesTotal = variableBySheet.total + packaging;

  const operariosTotal = totalVinylCost + fixedTotal + variablesTotal + shipping;

  const { profit, subtotal, iva, total } = computeTotals(operariosTotal, margin);
  const totalRounded = Math.ceil(total);

  const benefitBase = profit + iva;
  const { aleli, pepe } = computeBenefitSplit(benefitBase);
  const pricePerSticker = qty > 0 ? totalRounded / qty : 0;

  const handleSizeSlider = (values: number[]) => {
    const v = clamp(Math.round(values[0] ?? sizeCm), 1, 10);
    setSizeCm(v);
  };

  const handleSizeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value.replace(/[^0-9-]/g, ""), 10);
    if (Number.isNaN(raw)) return setSizeCm(1);
    setSizeCm(clamp(raw, 1, 10));
  };

  const handleQtyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    const n = Number(raw);
    if (Number.isNaN(n)) return setQty(0);
    setQty(Math.max(0, Math.floor(n)));
  };

  const handleShippingInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (Number.isFinite(n)) setShipping(Math.max(0, n));
  };

  const onSaveQuote = () => {
    const totalNoShip = computeQuoteTotalNoShipping(qty, sizeCm, finish);

    const operariosNoShip = computeOperariosWithoutShipping(qty, sizeCm, finish);
    const baseIncl = operariosNoShip + INCLUDED_FEE_PER_QUOTE;
    const { profit, iva, total } = computeTotals(baseIncl, getMargin(sizeCm), IVA_RATE);

    const item: SavedQuote = {
      id: Date.now(),
      clientName: clientName.trim(),
      sizeCm,
      qty,
      finish,
      finishLabel: getFinishLabel(finish),
      marginRate: getMargin(sizeCm),
      totalNoShippingRounded: totalNoShip,
      totalWithIncludedRounded: Math.ceil(total),
      profitIncluded: profit,
      ivaIncluded: iva,
      includedFee: INCLUDED_FEE_PER_QUOTE,
    };
    setSavedQuotes((prev) => [...prev, item]);
  };

  const removeQuote = (id: number) => {
    setSavedQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  const reset = () => {
    setClientName("");
    setSizeCm(5);
    setQty(100);
    setFinish(acabados[0].value);
    setShipping(159);
  };

  const sumWithFee = savedQuotes.reduce((a, b) => a + b.totalWithIncludedRounded, 0);
  const remainingShipping = Math.max(0, shipping - INCLUDED_FEE_PER_QUOTE * savedQuotes.length);
  const combinedTotal = Math.ceil(sumWithFee + remainingShipping);

  const multiBenefitBase = savedQuotes.reduce((a, b) => a + b.profitIncluded + b.ivaIncluded, 0);
  const { aleli: multiAleli, pepe: multiPepe } = computeBenefitSplit(multiBenefitBase);

  const handleGeneratePrintTextMulti = () => {
    const txt = buildMultiText(savedQuotes, shipping, INCLUDED_FEE_PER_QUOTE);
    setPrintText(txt);
    setCopied(false);
  };

  const handleGeneratePrintTextSingle = () => {
    const txt = buildSingleText(sizeCm, qty, getFinishLabel(finish), totalRounded, shipping);
    setPrintText(txt);
    setCopied(false);
  };

  const handleCopy = async () => {
    const text = printText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      return;
    } catch {
      try {
        const ta = printAreaRef.current ?? document.createElement("textarea");
        if (!printAreaRef.current) {
          (ta as HTMLTextAreaElement).value = text;
          (ta as HTMLTextAreaElement).style.position = "fixed";
          (ta as HTMLTextAreaElement).style.opacity = "0";
          document.body.appendChild(ta);
        }
        (ta as HTMLTextAreaElement).focus();
        (ta as HTMLTextAreaElement).select();
        const ok = document.execCommand("copy");
        if (!printAreaRef.current) document.body.removeChild(ta);
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          return;
        }
      } catch {}
    }
    setCopied(false);
  };

  return (
    <div className="relative min-h-screen w-full text-slate-900 bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Fondo con patrón mejorado */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.1) 1px, transparent 0)",
          backgroundSize: "800px 800px, 600px 600px, 32px 32px",
        }}
      />

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Header mejorado */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-4"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg mb-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-emerald-800 to-slate-900 bg-clip-text text-transparent">
              Calculadora Felpuditos
            </h1>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
              Calcula cotizaciones de stickers de manera profesional y precisa
            </p>
          </motion.div>
          
          <div className="flex items-center justify-center gap-3">
            <Badge className="rounded-full bg-emerald-100 px-4 py-2 text-emerald-700 font-medium">v1.14.0</Badge>
            <Badge className="rounded-full bg-blue-100 px-4 py-2 text-blue-700 font-medium">Interfaz Mejorada</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:gap-12">
          {/* Panel de controles */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-xl shadow-emerald-500/5 ring-1 ring-slate-200/50">
              <CardHeader className="pb-6 pt-8">
                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                  <div className="p-2 rounded-xl bg-emerald-100">
                    <Settings className="h-5 w-5 text-emerald-600" />
                  </div>
                  Configuración
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Ajusta los parámetros de tu cotización</p>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                {/* Cliente */}
                <div className="space-y-3">
                  <Label htmlFor="clientName" className="text-sm font-medium text-slate-700">Nombre del cliente</Label>
                  <Input 
                    id="clientName" 
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)} 
                    placeholder="Ej. María González" 
                    className="rounded-2xl border-slate-200 bg-white/50 px-4 py-3 text-base focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-300 transition-all duration-200" 
                  />
                </div>

                {/* Tamaño */}
                <div className="space-y-3">
                  <Label htmlFor="size" className="text-sm font-medium text-slate-700">Tamaño del sticker</Label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <Slider 
                          id="size" 
                          min={1} 
                          max={10} 
                          step={1} 
                          value={[sizeCm]} 
                          onValueChange={handleSizeSlider} 
                          className="py-2" 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min={1} 
                          max={10} 
                          step={1} 
                          value={sizeCm} 
                          onChange={handleSizeInput} 
                          className="w-16 rounded-xl text-center font-semibold border-slate-300" 
                        />
                        <span className="text-sm font-medium text-slate-600">cm</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>1 cm</span>
                      <span className="font-medium text-emerald-600">{sizeCm} cm seleccionado</span>
                      <span>10 cm</span>
                    </div>
                  </div>
                </div>

                {/* Cantidad */}
                <div className="space-y-3">
                  <Label htmlFor="qty" className="text-sm font-medium text-slate-700">Cantidad de stickers</Label>
                  <div className="relative">
                    <Input 
                      id="qty" 
                      type="number" 
                      inputMode="numeric" 
                      placeholder="Ej. 500" 
                      value={qty} 
                      onChange={handleQtyInput} 
                      className="rounded-2xl border-slate-200 bg-white/50 px-4 py-3 text-base font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-300 transition-all duration-200" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">uds</div>
                  </div>
                  <p className="text-xs text-slate-500">💡 Acepta cualquier cantidad, incluso números grandes</p>
                </div>

                {/* Acabado */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Tipo de acabado</Label>
                  <Select value={finish} onValueChange={(v) => setFinish(v as Finish)}>
                    <SelectTrigger className="rounded-2xl border-slate-200 bg-white/50 px-4 py-3 text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 transition-all duration-200">
                      <SelectValue placeholder="Selecciona un acabado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl">
                      {acabados.map((a) => (
                        <SelectItem key={a.value} value={a.value} className="rounded-xl focus:bg-emerald-50 focus:text-emerald-900">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                            {a.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Margen (auto) */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Margen de ganancia</Label>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-emerald-700">{formatPercent(margin)}</span>
                      <Badge 
                        variant="secondary" 
                        className={`rounded-full px-3 py-1 font-medium ${
                          sizeCm <= 7 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {sizeCm <= 7 ? "Tamaño pequeño" : "Tamaño grande"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      🎯 {sizeCm <= 7 ? "1–7 cm: Margen del 46%" : "8–10 cm: Margen del 33%"}
                    </p>
                  </div>
                </div>

                {/* Envío (editable) */}
                <div className="space-y-3">
                  <Label htmlFor="shipping" className="text-sm font-medium text-slate-700">Costo de envío</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                      <Input 
                        id="shipping" 
                        type="number" 
                        step="0.01" 
                        value={shipping} 
                        onChange={handleShippingInput} 
                        className="rounded-2xl border-slate-200 bg-white/50 pl-8 pr-12 py-3 text-base font-medium focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-300 transition-all duration-200" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">MXN</span>
                    </div>
                    <Badge variant="outline" className="rounded-full border-emerald-200 text-emerald-700 px-3 py-1">Editable</Badge>
                  </div>
                  <p className="text-xs text-slate-500">💰 Valor por defecto: $159 MXN</p>
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <motion.div 
                    whileTap={{ scale: 0.95 }} 
                    whileHover={{ scale: 1.02 }}
                    onClick={tapFeedback}
                  >
                    <Button 
                      onClick={onSaveQuote} 
                      className="gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg hover:from-emerald-700 hover:to-emerald-800 px-6 py-3 text-base font-medium transition-all duration-200"
                    >
                      <PlusCircle className="h-5 w-5" /> Guardar cotización
                    </Button>
                  </motion.div>
                  <motion.div 
                    whileTap={{ scale: 0.95 }} 
                    whileHover={{ scale: 1.02 }}
                    onClick={tapFeedback}
                  >
                    <Button 
                      variant="secondary" 
                      onClick={reset} 
                      className="gap-3 rounded-2xl bg-slate-100 text-slate-700 shadow-md hover:bg-slate-200 px-6 py-3 text-base font-medium transition-all duration-200"
                    >
                      <RotateCcw className="h-5 w-5" /> Restablecer
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Panel de resultados */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-500/5 ring-1 ring-slate-200/50">
              <CardHeader className="pb-6 pt-8">
                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <Layers className="h-5 w-5 text-blue-600" />
                  </div>
                  Resultados y Costos
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Desglose detallado de tu cotización</p>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                {/* Producción básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stickers por hoja</p>
                    <p className="mt-2 text-3xl font-bold text-slate-800">{stickersPerSheet}</p>
                    <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{width: `${(stickersPerSheet / 50) * 100}%`}}></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hojas necesarias</p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-3xl font-bold text-slate-800">{sheetsNeeded}</p>
                      <Badge className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-200" variant="outline">
                        <CheckCircle2 className="h-3.5 w-3.5" /> redondeado
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Nota de redondeo */}
                <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-lg bg-blue-100">
                      <Info className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">Nota:</span> Las hojas fraccionadas siempre se redondean hacia arriba para garantizar la cantidad solicitada.
                    </div>
                  </div>
                </div>

                {/* Costos por vinil */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Costo por hoja</p>
                    <p className="mt-2 text-xl font-bold text-slate-800">{formatCurrency(costPerSheet)}</p>
                    <p className="text-xs text-slate-500 mt-1">Según acabado seleccionado</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Costo total vinil</p>
                    <p className="mt-2 text-xl font-bold text-slate-800">{formatCurrency(totalVinylCost)}</p>
                    <p className="text-xs text-slate-500 mt-1">{sheetsNeeded} hojas × {formatCurrency(costPerSheet)}</p>
                  </div>
                </div>

                {/* Gastos fijos */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-700">📋 Gastos fijos</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(fixedTotal)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {FIXED_COSTS.map((c) => (
                      <div key={c.key} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/50 border border-slate-100">
                        <span className="text-slate-600 font-medium">{c.label}</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Costos variables */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-700">⚙️ Costos variables</p>
                    <p className="text-xl font-bold text-slate-800">{formatCurrency(variablesTotal)}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <span className="text-slate-600 font-medium">🖨️ Tinta ({formatCurrency(VARIABLE_RATES.tinta)}/hoja)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(variableBySheet.tinta)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <span className="text-slate-600 font-medium">✂️ Corte ({formatCurrency(VARIABLE_RATES.corte)}/hoja)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(variableBySheet.corte)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <span className="text-slate-600 font-medium">🎗️ Cinta mágica ({formatCurrency(VARIABLE_RATES.cinta_magica)}/hoja)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(variableBySheet.cinta)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/50 border border-slate-100">
                      <span className="text-slate-600 font-medium">📦 Plástico envoltorio (2.10/100 stickers)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(packaging)}</span>
                    </div>
                  </div>
                </div>

                {/* Costos operarios */}
                <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm">
                  <p className="text-sm font-semibold text-orange-800 mb-4">🏭 Costos operarios totales</p>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/60 border border-orange-100">
                      <span className="text-orange-700 font-medium">Vinil</span>
                      <span className="font-semibold text-orange-800">{formatCurrency(totalVinylCost)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/60 border border-orange-100">
                      <span className="text-orange-700 font-medium">Fijos</span>
                      <span className="font-semibold text-orange-800">{formatCurrency(fixedTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/60 border border-orange-100">
                      <span className="text-orange-700 font-medium">Variables</span>
                      <span className="font-semibold text-orange-800">{formatCurrency(variablesTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/60 border border-orange-100">
                      <span className="text-orange-700 font-medium">Envío</span>
                      <span className="font-semibold text-orange-800">{formatCurrency(shipping)}</span>
                    </div>
                  </div>
                  <div className="text-center py-3 rounded-xl bg-orange-100 border border-orange-200">
                    <span className="text-2xl font-black text-orange-900">{formatCurrency(operariosTotal)}</span>
                    <p className="text-xs text-orange-700 mt-1">Total de costos de producción</p>
                  </div>
                </div>

                {/* Venta: margen, IVA y total (vertical) */}
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700 mb-4">💰 Resumen de venta</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">Margen de ganancia</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(profit)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600 font-medium">Subtotal (operarios + margen)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-600 font-medium">IVA (16%)</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(iva)}</span>
                    </div>
                  </div>
                  <div className="mt-6 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl opacity-10"></div>
                    <div className="relative flex items-center justify-between rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100 p-6">
                      <div>
                        <span className="text-emerald-900 font-semibold text-lg">TOTAL al cliente</span>
                        <p className="text-xs text-emerald-700 mt-1">Precio final con IVA incluido</p>
                      </div>
                      <span className="text-5xl font-black tracking-tight text-emerald-900">{formatCurrencyInt(totalRounded)}</span>
                    </div>
                  </div>

                  {/* Desglose de beneficios */}
                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">💎 Desglose de beneficios</p>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-600 font-medium">Costo por sticker (cliente)</span>
                        <span className="font-semibold text-slate-800">{qty > 0 ? formatCurrency(pricePerSticker) : "—"}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-green-50 border border-green-200">
                        <span className="text-green-700 font-medium">💚 Aleli 55% de (IVA + margen)</span>
                        <span className="font-bold text-green-800 text-lg">{formatCurrency(aleli)}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-green-50 border border-green-200">
                        <span className="text-green-700 font-medium">💚 Pepe 45% de (IVA + margen)</span>
                        <span className="font-bold text-green-800 text-lg">{formatCurrency(pepe)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Imprimir cotización (simple) */}
                  <div className="mt-6">
                    <motion.div 
                      whileTap={{ scale: 0.95 }} 
                      whileHover={{ scale: 1.02 }}
                      onClick={tapFeedback}
                    >
                      <Button 
                        onClick={handleGeneratePrintTextSingle} 
                        className="w-full gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:from-blue-700 hover:to-blue-800 px-6 py-3 text-base font-medium transition-all duration-200"
                      >
                        <ReceiptText className="h-5 w-5" /> Generar cotización
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Cotización múltiple */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12"
        >
          <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50">
            <CardHeader className="pb-6 pt-8">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                <div className="p-2 rounded-xl bg-purple-100">
                  <ReceiptText className="h-5 w-5 text-purple-600" />
                </div>
                Cotización Múltiple
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">Combina varias cotizaciones en una sola propuesta</p>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              {savedQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
                    <ReceiptText className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-base text-slate-600 mb-2">No hay cotizaciones guardadas</p>
                  <p className="text-sm text-slate-500">Configura los parámetros y presiona <strong>Guardar cotización</strong> para comenzar.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {savedQuotes.map((q, index) => (
                      <motion.div 
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group"
                      >
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="font-semibold text-slate-800">
                                {q.clientName ? `${q.clientName} · ` : ""}{q.sizeCm} cm · {q.qty.toLocaleString()} uds
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"></div>
                                {q.finishLabel}
                              </span>
                              <span>Margen: {formatPercent(q.marginRate)}</span>
                              <span>Hojas: {computeSheetsNeeded(q.qty, q.sizeCm)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-800">{formatCurrencyInt(q.totalWithIncludedRounded)}</p>
                              <p className="text-xs text-slate-500">(incluye ${INCLUDED_FEE_PER_QUOTE} envío)</p>
                            </div>
                            <motion.div 
                              whileTap={{ scale: 0.95 }} 
                              whileHover={{ scale: 1.05 }}
                              onClick={tapFeedback}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Borrar cotización"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200"
                                onClick={() => removeQuote(q.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Resumen rápido */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Suma cotizaciones</p>
                      <p className="mt-2 text-2xl font-bold text-slate-800">{formatCurrencyInt(sumWithFee)}</p>
                      <p className="text-xs text-slate-500 mt-1">Con ${INCLUDED_FEE_PER_QUOTE} c/u incluido</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Envío restante</p>
                      <p className="mt-2 text-2xl font-bold text-slate-800">{formatCurrencyInt(remainingShipping)}</p>
                      <p className="text-xs text-slate-500 mt-1">{remainingShipping <= 0 ? "Envío gratis" : "Costo adicional"}</p>
                    </div>
                    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-5 shadow-sm">
                      <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Total cotizaciones</p>
                      <p className="mt-2 text-2xl font-bold text-purple-800">{savedQuotes.length}</p>
                      <p className="text-xs text-purple-600 mt-1">Elementos guardados</p>
                    </div>
                  </div>

                  {/* Beneficio total de la multicotización */}
                  <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
                    <p className="text-sm font-semibold text-green-800 mb-4">💰 Beneficio total multicotización</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center py-4 rounded-xl bg-white/60 border border-green-200">
                        <p className="text-xs text-green-600 font-medium uppercase tracking-wide">IVA + Margen Total</p>
                        <p className="text-xl font-bold text-green-800 mt-1">{formatCurrency(multiBenefitBase)}</p>
                      </div>
                      <div className="text-center py-4 rounded-xl bg-green-100 border border-green-300">
                        <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Aleli 55%</p>
                        <p className="text-xl font-bold text-green-900 mt-1">{formatCurrency(multiAleli)}</p>
                      </div>
                      <div className="text-center py-4 rounded-xl bg-green-100 border border-green-300">
                        <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Pepe 45%</p>
                        <p className="text-xl font-bold text-green-900 mt-1">{formatCurrency(multiPepe)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Imprimir cotización (múltiple) */}
          <div className="mt-6 space-y-4">
            <motion.div 
              whileTap={{ scale: 0.95 }} 
              whileHover={{ scale: 1.02 }}
              onClick={tapFeedback}
            >
              <Button 
                onClick={handleGeneratePrintTextMulti} 
                className="w-full gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:from-purple-700 hover:to-purple-800 px-6 py-3 text-base font-medium transition-all duration-200"
              >
                <ReceiptText className="h-5 w-5" /> Generar cotización múltiple
              </Button>
            </motion.div>

            {printText && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1 rounded-lg bg-blue-100">
                    <ReceiptText className="h-4 w-4 text-blue-600" />
                  </div>
                  <label className="text-sm font-semibold text-slate-700">Texto para WhatsApp</label>
                </div>
                <textarea
                  ref={printAreaRef}
                  readOnly
                  value={printText}
                  className="w-full h-40 resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                />
                <div className="mt-4 flex justify-end">
                  <motion.div 
                    whileTap={{ scale: 0.95 }} 
                    whileHover={{ scale: 1.02 }}
                    onClick={tapFeedback}
                  >
                    <Button 
                      onClick={handleCopy} 
                      className={`gap-2 rounded-2xl px-6 py-2 text-base font-medium transition-all duration-200 ${
                        copied 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-slate-800 hover:bg-slate-900 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> ¡Copiado!
                        </>
                      ) : (
                        <>
                          <ReceiptText className="h-4 w-4" /> Copiar texto
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Footer mejorado */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-200 px-6 py-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700">v1.14.0</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <span className="text-sm text-slate-600">Interfaz Renovada • Felpuditos</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// -----------------------------
// Tests ligeros (en consola)
// -----------------------------
if (typeof window !== "undefined") {
  // Producción y reglas
  console.assert(getStickersPerSheet(7) === 6, "7 cm debe ser 6 por hoja");
  console.assert(computeSheetsNeeded(51, 1) === 2, "51 de 1 cm → 2 hojas (50/hoja)");
  console.assert(computeSheetsNeeded(100, 3) === 4, "100 de 3 cm → 4 hojas (30/hoja)");
  console.assert(getMargin(7) === 0.46 && getMargin(8) === 0.33, "Margen según tamaño correcto (46% / 33%)");

  const v10 = computeVariableCostsBySheet(10);
  console.assert(Math.abs(v10.total - (10*0.25 + 10*0.13 + 10*0.7)) < 1e-9, "Cálculo variables/hoja x10 correcto");

  console.assert(Math.abs(computePackagingCost(0) - 0) < 1e-9, "Empaque 0 uds → 0");
  console.assert(Math.abs(computePackagingCost(1) - 2.1) < 1e-9, "Empaque 1–100 uds → 2.1");
  console.assert(Math.abs(computePackagingCost(100) - 2.1) < 1e-9, "Empaque 100 uds → 2.1");
  console.assert(Math.abs(computePackagingCost(101) - 4.2) < 1e-9, "Empaque 101–200 uds → 4.2");

  const t = computeTotals(100, 0.46, 0.16);
  console.assert(Math.abs(t.profit - 46) < 1e-9, "Margen 46% de 100 → 46");
  console.assert(Math.abs(t.subtotal - 146) < 1e-9, "Subtotal 100+46 → 146");
  console.assert(Math.abs(t.iva - 23.36) < 1e-9, "IVA 16% de 146 → 23.36");
  console.assert(Math.abs(t.total - 169.36) < 1e-9, "Total 146+23.36 → 169.36");
  console.assert(Math.ceil(t.total) === 170, "Total redondeado hacia arriba → 170");

  const base = t.profit + t.iva;
  const split = computeBenefitSplit(base);
  console.assert(Math.abs(split.aleli + split.pepe - base) < 1e-9, "Suma Aleli+Pepe = IVA+margen");

  const q1 = computeQuoteTotalNoShipping(100, 1, "vinil_blanco");
  console.assert(q1 === 70, `Cotización sin envío 100x1cm vinil blanco → 70 (obtenido ${q1})`);

  const q2 = computeQuoteTotalNoShipping(45, 7, "holo_clasico");
  console.assert(q2 === 168, `Cotización sin envío 45x7cm holo clásico → 168 (obtenido ${q2})`);

  const combinedClassic = computeCombinedTotalIncluded([q1, q2], 159, 0);
  console.assert(combinedClassic === 397, `Combinado clásico (70+168 + 159 envío) → 397 (obtenido ${combinedClassic})`);

  const q1inc = computeQuoteTotalWithIncludedFee(100, 5, "vinil_blanco", 80);
  console.assert(q1inc === 277, `Incluido $80 → 100x5cm vinil blanco → 277 (obtenido ${q1inc})`);
  const q2inc = computeQuoteTotalWithIncludedFee(100, 7, "vinil_blanco", 80);
  console.assert(q2inc === 383, `Incluido $80 → 100x7cm vinil blanco → 383 (obtenido ${q2inc})`);
  const combInc = computeCombinedTotalIncluded([q1inc, q2inc], 159, 80);
  console.assert(combInc === 660, `Combinado con $80 c/u y envío 159 → 660 (obtenido ${combInc})`);

  const combOne = computeCombinedTotalIncluded([q1inc], 159, 80);
  console.assert(combOne === 356, `Una sola cotización (277) + envío restante 79 → 356 (obtenido ${combOne})`);

  const fakeA: SavedQuote = { id:1, clientName:"", sizeCm:5, qty:100, finish:"vinil_blanco", finishLabel:"Vinil blanco", marginRate:0.46, totalNoShippingRounded:0, totalWithIncludedRounded:277, profitIncluded:0, ivaIncluded:0, includedFee:80 };
  const fakeB: SavedQuote = { id:2, clientName:"", sizeCm:7, qty:45, finish:"holo_clasico", finishLabel:"Holo clásico", marginRate:0.46, totalNoShippingRounded:0, totalWithIncludedRounded:383, profitIncluded:0, ivaIncluded:0, includedFee:80 };
  const txtMulti = buildMultiText([fakeA, fakeB], 159, 80);
  const expectedTotal = computeCombinedTotalIncluded([fakeA.totalWithIncludedRounded, fakeB.totalWithIncludedRounded], 159, 80);
  console.assert(txtMulti.includes("Perfecto, ya tenemos tu cotización:"), "Texto múltiple inicia OK");
  console.assert(txtMulti.includes(formatCurrencyInt(fakeA.totalWithIncludedRounded)), "Incluye costo A");
  console.assert(txtMulti.includes(formatCurrencyInt(fakeB.totalWithIncludedRounded)), "Incluye costo B");
  console.assert(txtMulti.includes(formatCurrencyInt(expectedTotal)), "Incluye total final");

  const txtSingle = buildSingleText(5, 100, "Vinil blanco", 277, 0);
  console.assert(txtSingle.includes("Envío gratis"), "Simple marca envío gratis si shipping=0");
}
