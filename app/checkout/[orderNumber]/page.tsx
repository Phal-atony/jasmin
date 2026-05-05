"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCurrency } from "@/lib/currency";
import {
  QrCode,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface OrderPayment {
  orderNumber: string;
  status: string;
  gameName: string;
  gameSlug: string;
  productName: string;
  playerUid: string;
  serverId: string | null;
  amountUsd: number;
  amountKhr: number | null;
  paymentMethod: string;
  paymentRef: string | null;
  paymentUrl: string | null;
  qrString: string | null;
  paymentExpiresAt: string | null;
  createdAt: string;
  paidAt: string | null;
}

const TERMINAL = new Set(["DELIVERED", "FAILED", "REFUNDED", "CANCELLED"]);
const PAID_STATES = new Set(["PAID", "PROCESSING", "DELIVERED"]);

function qrImageUrl(payload: string, size = 280): string {
  // Render EMV QR payload via qrserver.com. High error correction + quiet zone.
  const enc = encodeURIComponent(payload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&margin=2&data=${enc}`;
}

export default function CheckoutPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const { format } = useCurrency();

  const orderNumber = (params?.orderNumber || "").toUpperCase();

  const [order, setOrder] = useState<OrderPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Order not found");
      }
      const data: OrderPayment = await res.json();
      setOrder(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load order";
      setError(msg);
      return null;
    }
  }, [orderNumber]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
  }, [fetchOrder]);

  // Polling while awaiting payment
  useEffect(() => {
    if (!order) return;
    if (TERMINAL.has(order.status) || PAID_STATES.has(order.status)) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      // If paid, bounce to /order tracker after a brief success pause
      if (PAID_STATES.has(order.status)) {
        const t = setTimeout(() => {
          router.push(`/order?number=${order.orderNumber}`);
        }, 2000);
        return () => clearTimeout(t);
      }
      return;
    }

    pollRef.current = setInterval(() => {
      fetchOrder();
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [order, fetchOrder, router]);

  // Countdown tick
  useEffect(() => {
    if (!order?.paymentExpiresAt) {
      setRemainingMs(null);
      return;
    }
    const expiry = new Date(order.paymentExpiresAt).getTime();

    const tick = () => {
      const ms = expiry - Date.now();
      setRemainingMs(ms > 0 ? ms : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order?.paymentExpiresAt]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  async function handleSimulate() {
    if (!order || simulating) return;
    setSimulating(true);
    try {
      // The simulate endpoint marks the order PAID and returns HTML; we only
      // care that the DB is updated. Ignore response body.
      await fetch(
        `/api/payment/simulate?order=${encodeURIComponent(order.orderNumber)}&ref=${encodeURIComponent(order.paymentRef ?? "")}`,
        { cache: "no-store" }
      );
      await fetchOrder();
    } finally {
      setSimulating(false);
    }
  }

  const isExpired = remainingMs !== null && remainingMs <= 0 && !PAID_STATES.has(order?.status ?? "");
  const isPaid = order ? PAID_STATES.has(order.status) : false;
  const isSimMode = order?.paymentRef?.startsWith("SIM-") ?? false;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 sm:px-6">
        {loading && (
          <div className="flex items-center justify-center py-24 text-pink-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            កំពុងដំណើរការ...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-400/40 bg-red-400/10 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-300">{error}</p>
            <a href="/" className="inline-block mt-4 btn-primary">
              ត្រឡប់ទៅកាន់ទំព័រដើម
            </a>
          </div>
        )}

        {!loading && order && (
          <>
            {/* Success state */}
            {isPaid && (
              <div className="rounded-2xl border border-green-400/40 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-2">ការទូទាត់បានជោគជ័យ!</h1>
                <p className="text-pink-500 text-sm mb-1">
                  Order <span className="font-mono text-pink-800">{order.orderNumber}</span>
                </p>
                <p className="text-pink-500 text-sm">
                  កំពុងបញ្ជូនអ្នកទៅកាន់កាតាមដានការបញ្ជាទិញ...
                </p>
                <Loader2 className="h-4 w-4 animate-spin mx-auto mt-4 text-pink-500" />
              </div>
            )}

            {/* Expired state */}
            {!isPaid && isExpired && (
              <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-8 text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
                <h1 className="font-display text-xl font-bold mb-2">ការទូទាត់បានផុតកំណត់</h1>
                <p className="text-pink-500 text-sm mb-4">
                  QR-Code នេះត្រូវបានផុតកំណត់
                </p>
                <a href={`/games/${order.gameSlug}`} className="btn-primary">
                  បញ្ជាទិញឡើងវិញ
                </a>
              </div>
            )}

            {/* Active payment state */}
            {!isPaid && !isExpired && (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">
                    ស្គេនដើម្បីបង់ប្រាក់
                  </h1>
                  <p className="text-pink-500 text-sm">
                    ទូទាត់ជាមួយធនាគារណាមួយ: ABA Pay, ACLEDA, Wing, TrueMoney, Prince Bank, Chip Mong...
                  </p>
                </div>

                <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
                  {/* QR panel */}
                  <div className="mx-auto rounded-2xl border-2 border-pink-400/30 bg-white p-4 shadow-xl shadow-pink-300/20">
                    {order.qrString ? (
                      <img
                        src={qrImageUrl(order.qrString)}
                        alt="KHQR code"
                        width={280}
                        height={280}
                        className="block"
                      />
                    ) : (
                      <div className="flex h-[280px] w-[280px] flex-col items-center justify-center text-center text-gray-500">
                        <QrCode className="h-16 w-16 mb-3 text-gray-400" />
                        <p className="text-sm font-semibold text-gray-700">
                          Simulation Mode
                        </p>
                        <p className="text-xs px-4 mt-1">
                          No live KHQR. Click the button below to simulate a payment.
                        </p>
                      </div>
                    )}
                    <div className="mt-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs font-bold text-gray-900">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                        KHQR
                      </div>
                    </div>
                  </div>

                  {/* Details panel */}
                  <div className="space-y-4">
                    {/* Amount */}
                    <div className="rounded-xl border border-pink-200 bg-white p-4">
                      <div className="text-[10px] uppercase tracking-widest text-pink-500 mb-1">
                        តម្លៃសរុប
                      </div>
                      <div className="font-display text-3xl font-bold text-pink-600">
                        {format(order.amountUsd)}
                      </div>
                      {order.amountKhr && (
                        <div className="text-sm text-pink-500 mt-0.5">
                          ≈ {order.amountKhr.toLocaleString()} ៛
                        </div>
                      )}
                    </div>

                    {/* Countdown */}
                    {remainingMs !== null && (
                      <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-yellow-600/90 mb-1">
                          <Clock className="h-3 w-3" />
                          រយៈពេល
                        </div>
                        <div className="font-mono text-2xl font-bold text-yellow-300">
                          {formatCountdown(remainingMs)}
                        </div>
                      </div>
                    )}

                    {/* Live status */}
                    <div className="rounded-xl border border-pink-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-pink-600" />
                        <span className="text-pink-500">កំពុងរង់ចាំការទូទាត់...</span>
                      </div>
                      
                    </div>
                  </div>
                </div>

                {/* Order summary */}
                <div className="rounded-xl border border-pink-200 bg-white p-4">
                  <div className="text-[10px] uppercase tracking-widest text-pink-500 mb-3">
                    លម្អិតការបញ្ជាទិញ
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="លេខបញ្ជាទិញ">
                      <button
                        type="button"
                        onClick={() => copy(order.orderNumber, "order")}
                        className="inline-flex items-center gap-1.5 font-mono hover:text-pink-600"
                      >
                        {order.orderNumber}
                        {copied === "order" ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-pink-500" />
                        )}
                      </button>
                    </Row>
                    <Row label="Game">{order.gameName}</Row>
                    <Row label="កញ្ចប់">{order.productName}</Row>
                    <Row label="Player ID">
                      <span className="font-mono">{order.playerUid}</span>
                      {order.serverId && (
                        <span className="text-pink-500"> ({order.serverId})</span>
                      )}
                    </Row>
                  </div>
                </div>

                {/* Instructions */}
                <div className="rounded-xl border border-pink-200/60 bg-pink-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-pink-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-pink-500 space-y-1">
                      <p className="font-semibold text-pink-800">របៀបទូទាត់ប្រាក់:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-xs">
                        <li>បើកកម្មវិធីធនាគាររបស់លោកអ្នក (ABA, ACLEDA, Wing...)</li>
                        <li>ចុច &quot;Scan KHQR&quot; ហើយស្កែន QR-CODEខាងលើ</li>
                        <li>បញ្ជាក់ចំនួនទឹកប្រាក់ហើយទូទាត់</li>
                        <li>ហើយការបញ្ជាទិញនឹងជោគជ័ដោយស្វ័យប្រវត្តិនៅពេលបង់ប្រាក់រួចរាល់</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-pink-500 text-xs">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
