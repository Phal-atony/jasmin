"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { isValidUid, isValidServerId, formatUsd } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { QrCode, ArrowRight, Lock, Check, Smartphone, Search, UserRoundCheck, AlertCircle, Tag, Loader2 } from "lucide-react";
import Image from "next/image";

// Games that support automatic nickname lookup via /api/lookup-uid
const LOOKUP_SLUGS = new Set(["mobile-legends", "free-fire", "genshin-impact", "honkai-star-rail"]);
// MLBB & similar games that use a separate "Zone ID" instead of a server dropdown
const ZONE_ID_SLUGS = new Set(["mobile-legends"]);

interface Product {
  id: string;
  name: string;
  amount: number;
  bonus: number;
  priceUsd: number;
  badge: string | null;
  imageUrl: string | null;
}

interface Game {
  id: string;
  slug: string;
  name: string;
  currencyName: string;
  uidLabel: string;
  uidExample: string | null;
  requiresServer: boolean;
  servers: string[];
}

export default function TopUpForm({ game, products }: { game: Game; products: Product[] }) {
  const { format, currency, toKhr } = useCurrency();
  const [selected, setSelected] = useState<string | null>(products[0]?.id ?? null);
  const [uid, setUid] = useState("");
  const [serverId, setServerId] = useState(
    ZONE_ID_SLUGS.has(game.slug) ? "" : (game.servers[0] ?? "")
  );
  const [method, setMethod] = useState<"KHPAY">("KHPAY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoApplied, setPromoApplied] = useState<{
    code: string;
    discountUsd: number;
    finalAmountUsd: number;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // ── Nickname auto-lookup (debounced 800 ms) ──
  const supportsLookup = LOOKUP_SLUGS.has(game.slug);
  const useZoneField = ZONE_ID_SLUGS.has(game.slug);

  type NicknameStatus = "idle" | "checking" | "verified" | "not_found";
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>("idle");
  const [nickname, setNickname] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset lookup when UID or server changes
  const resetLookup = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setNicknameStatus("idle");
    setNickname(null);
  }, []);

  // Fire debounced lookup whenever uid/serverId become valid
  useEffect(() => {
    if (!supportsLookup) return;

    // Clear any in-flight lookup
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const uidValid = isValidUid(uid);
    const serverValid = !useZoneField || serverId.trim().length > 0;

    if (!uidValid || !serverValid) {
      // Not ready — stay idle
      if (nicknameStatus !== "idle") {
        setNicknameStatus("idle");
        setNickname(null);
      }
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setNicknameStatus("checking");
      setNickname(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/lookup-uid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameSlug: game.slug,
            uid: uid.trim(),
            server: serverId.trim() || undefined,
          }),
          signal: controller.signal,
        });
        const data = await res.json();

        // Guard: component may have unmounted or user typed again
        if (controller.signal.aborted) return;

        if (data.verified && data.nickname) {
          setNickname(data.nickname);
          setNicknameStatus("verified");
        } else {
          setNicknameStatus("not_found");
        }
      } catch {
        // Aborted or network failure — silently go idle
        if (!controller.signal.aborted) {
          setNicknameStatus("not_found");
        }
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, serverId, game.slug, supportsLookup, useZoneField]);

  const selectedProduct = products.find((p) => p.id === selected);

  const needsServer = game.requiresServer || useZoneField;
  const canSubmit =
    !!selected &&
    isValidUid(uid) &&
    (!needsServer || serverId.trim().length > 0);

  async function applyPromo() {
    if (!promoInput.trim() || !selectedProduct) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoApplied(null);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput.trim(),
          orderAmountUsd: selectedProduct.priceUsd,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid promo code");
      setPromoApplied(data);
    } catch (err: any) {
      setPromoError(err.message);
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setPromoApplied(null);
    setPromoInput("");
    setPromoError(null);
  }

  // Reset promo when product changes
  const effectivePrice = promoApplied ? promoApplied.finalAmountUsd : (selectedProduct?.priceUsd ?? 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          productId: selected,
          playerUid: uid.trim(),
          serverId: needsServer ? serverId.trim() : undefined,
          paymentMethod: method,
          promoCode: promoApplied?.code || undefined,
          playerNickname: nickname || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">
        {/* Left column: steps */}
        <div className="space-y-8">
      {/* Step 1: Pick package */}
      <div className="fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full font-extrabold text-white shadow-lg shadow-pink-300/40" style={{background:"linear-gradient(135deg,#E91E8C,#FF6EB4)"}}>
            <span className="absolute inset-0 rounded-full bg-pink-500/40 animate-ping" />
            <span className="relative">1</span>
          </div>
          <h2 className="font-display text-xl font-extrabold text-pink-800">Choose Package</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {products.map((p) => {
            const isSelected = selected === p.id;
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`group relative overflow-hidden text-left rounded-xl border-2 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-0.5 ${
                  isSelected
                    ? "border-pink-400 bg-gradient-to-br from-pink-500/15 to-pink-400/5 shadow-lg shadow-pink-300/30 ring-1 ring-pink-400/50"
                    : "border-pink-200 bg-white hover:border-pink-400 hover:shadow-md hover:shadow-pink-200/60"
                }`}
              >
                {isSelected && (
                  <span className="pointer-events-none absolute inset-0 opacity-60">
                    <span className="absolute -inset-y-1 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-pink-300/50 to-transparent animate-shimmer" />
                  </span>
                )}
                {isSelected && (
                  <span className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-white shadow-md shadow-pink-300/50">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {p.badge && (
                  <div className="absolute -top-2 right-3">
                    {p.badge === "Hot" && <span className="badge-hot">Hot</span>}
                    {p.badge === "Best Value" && <span className="badge-best">Best</span>}
                    {p.badge === "Pass" && <span className="badge-pass">Pass</span>}
                    {!["Hot", "Best Value", "Pass"].includes(p.badge) && (
                      <span className="badge-best">{p.badge}</span>
                    )}
                  </div>
                )}

                {p.amount > 0 ? (
                  <>
                  {p.imageUrl && (
                    <div className="mb-2 w-full flex justify-center">
                      <Image
                        src={p.imageUrl ?? ""}
                        alt={p.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 object-contain rounded-lg"
                      />
                  </div>
                )}
                    <div className={`font-display font-bold text-2xl sm:text-3xl leading-none transition-colors ${
                      isSelected ? "text-pink-600" : "text-pink-800"
                    }`}>
                      {p.amount.toLocaleString()}
                    </div>
                    {p.bonus > 0 && (
                      <div className="text-xs text-pink-400 mt-1 font-semibold">
                        + {p.bonus} bonus
                      </div>
                    )}
                    <div className="text-[10px] text-pink-500 uppercase tracking-wider mt-1">
                      {game.currencyName}
                    </div>
                  </>
                ) : (
                  <>
                    {p.imageUrl && (
                      <div className="mb-2 w-full flex justify-center">
                        <Image
                          src={p.imageUrl ?? ""}
                          alt={p.name}
                          className="h-14 w-14 object-contain rounded-lg"
                        />
                      </div>
                    )}
                    <div className="font-semibold text-sm leading-tight">{p.name}</div>
                  </>
               )}

                <div className={`mt-3 pt-3 border-t font-mono font-bold text-sm sm:text-base transition-colors ${
                  isSelected
                    ? "border-pink-400/40 text-pink-600"
                    : "border-pink-200/60 text-pink-600"
                }`}>
                  {format(p.priceUsd)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: UID */}
      <div className="fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full font-extrabold text-white shadow-lg shadow-pink-300/40" style={{background:"linear-gradient(135deg,#E91E8C,#FF6EB4)"}}>
            2
          </div>
          <h2 className="font-display text-xl font-extrabold text-pink-800">Enter Account Info</h2>
        </div>

        <div className="card p-5 sm:p-6 space-y-4">
          <div className={useZoneField ? "grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_140px] gap-3" : ""}>
            <div>
              <label className="label">
                {useZoneField ? "User ID" : game.uidLabel}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={uid}
                onChange={(e) => setUid(e.target.value)}
                placeholder={useZoneField ? "12345678" : (game.uidExample || "Enter your player ID")}
                className="input font-mono text-lg py-3.5"
                required
              />
              {!uid && game.uidExample && !useZoneField && (
                <p className="text-xs text-pink-500 mt-1.5">
                  Example: <span className="font-mono text-pink-800/70">{game.uidExample}</span>
                </p>
              )}
              {uid && !isValidUid(uid) && (
                <p className="text-xs text-red-500 mt-1">
                  UID should be 6–20 digits.
                </p>
              )}
            </div>
            {useZoneField && (
              <div>
                <label className="label">Zone ID</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  placeholder="1234"
                  className="input font-mono text-lg py-3.5"
                  required
                />
              </div>
            )}
          </div>

          {game.requiresServer && !useZoneField && (
            <div>
              <label className="label">Server</label>
              <select
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                className="input"
                required
              >
                {game.servers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Auto-lookup status indicator */}
          {supportsLookup && nicknameStatus !== "idle" && (
            <div className="pt-1">
              {nicknameStatus === "checking" && (
                <span className="inline-flex items-center gap-2 text-sm text-pink-500 animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Verifying account…
                </span>
              )}

              {nicknameStatus === "verified" && nickname && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-green-600 bg-green-100 px-3 py-1.5 text-sm text-green-600 animate-scale-in">
                  <UserRoundCheck className="h-4 w-4" strokeWidth={2} />
                  <span className="text-pink-500">Player:</span>
                  <span className="font-semibold text-green-700">{nickname}</span>
                </span>
              )}

              {nicknameStatus === "not_found" && (
                <span className="inline-flex items-center gap-2 rounded-lg border border-yellow-600 bg-yellow-100 px-3 py-1.5 text-sm text-yellow-600">
                  <AlertCircle className="h-4 w-4" strokeWidth={2} />
                  Couldn&apos;t verify — double-check your UID
                </span>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Promo Code */}
      <div className="fade-up" style={{ animationDelay: "140ms" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-50 border border-pink-200 text-pink-500">
            <Tag className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <h3 className="font-display text-sm font-semibold text-pink-500">Have a promo code?</h3>
        </div>

        {promoApplied ? (
          <div className="flex items-center gap-3 rounded-xl border border-green-600 bg-green-100 p-3">
            <Tag className="h-4 w-4 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-mono font-bold text-green-600 text-sm">{promoApplied.code}</span>
              <span className="text-xs text-green-600/80 ml-2">
                −{format(promoApplied.discountUsd)} off
              </span>
            </div>
            <button
              type="button"
              onClick={removePromo}
              className="text-xs text-pink-500 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
              placeholder="Enter code"
              className="input font-mono uppercase text-sm flex-1"
            />
            <button
              type="button"
              onClick={applyPromo}
              disabled={promoLoading || !promoInput.trim() || !selectedProduct}
              className="btn-ghost text-sm shrink-0"
            >
              {promoLoading ? "..." : "Apply"}
            </button>
          </div>
        )}
        {promoError && (
          <p className="mt-2 text-xs text-red-500">{promoError}</p>
        )}
      </div>

      {/* Step 3: Payment */}
      <div className="fade-up" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full font-extrabold text-white shadow-lg shadow-pink-300/40" style={{background:"linear-gradient(135deg,#E91E8C,#FF6EB4)"}}>
            3
          </div>
          <h2 className="font-display text-xl font-extrabold text-pink-800">Choose Payment</h2>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setMethod("KHPAY")}
            className={`group relative rounded-xl border-2 p-4 sm:p-5 text-left transition-all duration-300 hover:-translate-y-0.5 ${
              method === "KHPAY"
                ? "border-pink-400 bg-gradient-to-br from-pink-500/15 to-pink-400/5 shadow-lg shadow-pink-300/20"
                : "border-pink-200 bg-white hover:border-pink-400 hover:shadow-md hover:shadow-pink-200/60"
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-400/10 border border-pink-400/30 text-pink-600 transition-transform duration-300 group-hover:scale-110">
                <QrCode className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base">KHQR</span>
                  <span className="rounded-full border border-green-600 bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                    Instant
                  </span>
                </div>
                <div className="text-xs text-pink-500 mt-0.5">
                  ដំណើរការគ្រប់ធនាគារទាំងអស់នៅកម្ពុជា
                </div>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  method === "KHPAY" ? "border-pink-500 bg-pink-500" : "border-pink-200"
                }`}
              >
                {method === "KHPAY" && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
            </div>

            <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:pl-16">
              {[
                { name: "KHQR",   color: "text-[#006FCF]" },
                
              ].map((w) => (
                <span
                  key={w.name}
                  className="inline-flex items-center gap-1 rounded-md border border-pink-200 bg-pink-50/50 px-2 py-1 text-[10px] font-semibold"
                >
                  <Smartphone className={`h-2.5 w-2.5 ${w.color}`} strokeWidth={2.5} />
                  <span className={w.color}>{w.name}</span>
                </span>
              ))}
              <span className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium text-pink-500">
                
              </span>
            </div>
          </button>
        </div>
      </div>

        </div>{/* end left column */}

        {/* Right column: sticky order summary (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <div className="card p-6 border border-pink-400/20">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-pink-500 mb-4">ការបញ្ជាទិញ</h3>

              {selectedProduct ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-500">{game.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-pink-500">កញ្ចប់</span>
                    <span className="font-medium">
                      {selectedProduct.amount > 0
                        ? `${selectedProduct.amount.toLocaleString()} ${game.currencyName}`
                        : selectedProduct.name}
                    </span>
                  </div>
                  {selectedProduct.bonus > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-pink-500">Bonus</span>
                      <span className="text-pink-400 font-semibold">+{selectedProduct.bonus}</span>
                    </div>
                  )}
                  {uid && (
                    <div className="flex justify-between text-sm">
                      <span className="text-pink-500">Player ID:</span>
                      <span className="font-mono text-xs">{uid}{serverId ? ` (${serverId})` : ""}</span>
                    </div>
                  )}
                  {nickname && (
                    <div className="flex justify-between text-sm">
                      <span className="text-pink-500">playerឈ្មោះ:</span>
                      <span className="text-green-600 font-medium text-xs">{nickname}</span>
                    </div>
                  )}
                  <div className="border-t border-pink-200 pt-3 space-y-2">
                    {promoApplied && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-pink-500">តម្លៃរង</span>
                          <span className="text-pink-500 line-through">{format(selectedProduct.priceUsd)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">បញ្ចុះតម្លៃ ({promoApplied.code})</span>
                          <span className="text-green-600 font-semibold">−{format(promoApplied.discountUsd)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-pink-500 text-sm">តម្លៃសរុប</span>
                      <div className="text-right">
                        <span key={`${selectedProduct.id}-${currency}`} className="font-display text-3xl font-extrabold text-pink-600 inline-block">
                          {format(effectivePrice)}
                        </span>
                        {currency === "USD" ? (
                          <div className="text-[11px] text-pink-500 mt-0.5 font-mono">
                            ≈ {toKhr(effectivePrice).toLocaleString("en-US")} ៛
                          </div>
                        ) : (
                          <div className="text-[11px] text-pink-500 mt-0.5 font-mono">
                            ≈ ${effectivePrice.toFixed(2)} USD
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-pink-500">ជ្រើសរើសកញ្ចប់</p>
              )}

              {error && (
                <div className="mt-4 rounded-lg border border-red-600 bg-red-100 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="btn-primary w-full text-base mt-5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submitting ? "Creating order..." : "Pay Now"}
                {!submitting && <ArrowRight className="h-5 w-5" strokeWidth={2.5} />}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-pink-500 text-center mt-3">
                <Lock className="h-3 w-3" strokeWidth={2.5} />
                ទូទាត់ប្រាក់ដោយសុវត្ថិភាព
              </p>
            </div>
          </div>
        </div>
      </div>{/* end grid */}

      {/* Mobile: sticky bottom summary */}
      <div className="lg:hidden card p-5 sticky bottom-3 mt-8 border border-pink-400/30 shadow-2xl shadow-pink-300/10 backdrop-blur-md">
        {selectedProduct && (
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-pink-500">តម្លៃសរុប</div>
              <div key={`${selectedProduct.id}-${currency}`} className="font-display text-3xl font-extrabold text-pink-600">
                {format(effectivePrice)}
              </div>
              {currency === "USD" ? (
                <div className="text-[11px] text-pink-500 font-mono">≈ {toKhr(effectivePrice).toLocaleString("en-US")} ៛</div>
              ) : (
                <div className="text-[11px] text-pink-500 font-mono">≈ ${effectivePrice.toFixed(2)} USD</div>
              )}
              {promoApplied && (
                <div className="text-xs text-green-600">−{format(promoApplied.discountUsd)} off</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-pink-500">
                {selectedProduct.amount > 0
                  ? `${selectedProduct.amount.toLocaleString()} ${game.currencyName}`
                  : selectedProduct.name}
              </div>
              {selectedProduct.bonus > 0 && (
                <div className="text-xs text-pink-400">
                  + {selectedProduct.bonus} bonus
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-600 bg-red-100 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="btn-primary w-full text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {submitting ? "Creating order..." : "Pay Now"}
          {!submitting && <ArrowRight className="h-5 w-5" strokeWidth={2.5} />}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-pink-500 text-center mt-3">
          <Lock className="h-3 w-3" strokeWidth={2.5} />
          ទូទាត់ប្រាក់ដោយសុវត្ថិភាព
        </p>
      </div>
    </form>
  );
}
