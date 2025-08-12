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

/** Compat Safari (webkitAudioContext) */
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

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
  holo_clasico: 7.9,
  holo_puntos: 7.9,
  holo_arena: 10,
  vinil_blanco_laminado: 17,
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
let __audioCtx: AudioContext | null = null;
function tapFeedback() {
  try { if (navigator.vibrate) navigator.vibrate(10); } catch {}
  try {
    const Ctx = (window.AudioContext ?? window.webkitAudioContext) as
      | (new () => AudioContext)
      | undefined;
    if (!Ctx) return;

    if (!__audioCtx) __audioCtx = new Ctx();
    const ctx = __audioCtx!;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(660, t0);
    osc.frequency.linearRampToValueAtTime(880, t0 + 0.12);

    gain.gain.setVa
