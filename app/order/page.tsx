"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, Package, CheckCircle2, XCircle, Truck, CreditCard, Send, FileText } from "lucide-react";

interface OrderInfo {
  orderNumber: string;
  status: string;
  gameName: string;
  productName: string;
  playerUid: string;
  amountUsd: number;
  paymentMethod: string;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
}

const TIMELINE_STEPS = [
  { key: "PENDING", label: "Order Created", Icon: Package },
  { key: "PAID", label: "Payment Received", Icon: CreditCard },
  { key: "DELIVERED", label: "Delivered", Icon: Truck },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 1,
  DELIVERED: 2,
  FAILED: -1,
  REFUNDED: -1,
  CANCELLED: -1,
};

const STATUS_META: Record<string, { label: string; color: string; desc: string }> = {
  PENDING: { label: "រង់ចាំការទូទាត់", color: "text-yellow-600 border-yellow-300 bg-yellow-100", desc: "កំពុងរង់ចាំការទូទាត់របស់អ្នក" },
  PAID: { label: "ទទួលបានការទូទាត់", color: "text-blue-600 border-blue-300 bg-blue-100", desc: "កំពុងដំណើរការ Top-Up" },
  PROCESSING: { label: "កំពុងដំណើរការ", color: "text-blue-600 border-blue-300 bg-blue-100", desc: "ដឹកជញ្ជូន Credits ទៅគណនីរបស់អ្នក" },
  DELIVERED: { label: "Delivered", color: "text-green-600 border-green-400/40 bg-green-400/10", desc: "Credits sent to your account!" },
  FAILED: { label: "Failed", color: "text-red-500 border-red-400/40 bg-red-400/10", desc: "Something went wrong — contact support" },
  REFUNDED: { label: "Refunded", color: "text-pink-500 border-pink-200 bg-white", desc: "Order refunded" },
  CANCELLED: { label: "Cancelled", color: "text-pink-500 border-pink-200 bg-white", desc: "Order was cancelled" },
};

export default function OrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TERMINAL_STATUSES = new Set(["DELIVERED", "FAILED", "REFUNDED", "CANCELLED"]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (orderNum: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${encodeURIComponent(orderNum)}`);
          if (!res.ok) return;
          const data: OrderInfo = await res.json();
          setOrder(data);
          if (TERMINAL_STATUSES.has(data.status)) stopPolling();
        } catch {
          /* silent */
        }
      }, 3000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopPolling]
  );

  useEffect(() => stopPolling, [stopPolling]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber.trim().toUpperCase())}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Order not found");
      }
      const data = await res.json();
      setOrder(data);
      if (!TERMINAL_STATUSES.has(data.status)) startPolling(data.orderNumber);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const meta = order ? STATUS_META[order.status] : null;
  const currentStep = order ? STATUS_ORDER[order.status] ?? -1 : -1;
  const isFailed = order ? currentStep === -1 : false;
  const isPolling = order ? !TERMINAL_STATUSES.has(order.status) : false;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">តាមដានការបញ្ជាទិញ</h1>
          <p className="text-pink-500 text-sm sm:text-base">បញ្ចូលលេខបញ្ជាទិញ</p>
        </div>

        <form onSubmit={lookup} className="card p-5 sm:p-6 mb-8">
          <label className="label">លេខបញ្ជាទិញ</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="XX-XXXXXX"
              className="input font-mono uppercase text-lg"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary shrink-0">
              {loading ? (
                <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4" strokeWidth={2.5} />
                  ស្វែងរក
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-500 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
              {error}
            </p>
          )}
        </form>

        {order && meta && (
          <div className="card overflow-hidden fade-up">
            <div className="p-5 sm:p-6 border-b border-pink-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-pink-500 mb-1">Order</p>
                  <p className="font-mono font-bold text-lg sm:text-xl">{order.orderNumber}</p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.color}`}>{meta.label}</div>
              </div>
              {isPolling && (
                <div className="flex items-center gap-2 mt-2 text-xs text-pink-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>
                  Auto-updating every 3 seconds
                </div>
              )}
            </div>

            {!isFailed && (
              <div className="px-5 sm:px-6 py-6 border-b border-pink-200">
                <div className="flex items-center justify-between">
                  {TIMELINE_STEPS.map((step, i) => {
                    const isReached = currentStep >= i;
                    const isCurrent = currentStep === i;
                    return (
                      <div key={step.key} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-2 transition-all duration-700 ${
                              isReached
                                ? "border-green-400 bg-green-400/20 text-green-600"
                                : "border-pink-200 bg-white text-pink-500"
                            }`}
                          >
                            {isReached ? (
                              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                            ) : (
                              <step.Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                            )}
                            {isCurrent && (
                              <span className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-30" />
                            )}
                          </div>
                          <span
                            className={`text-[10px] sm:text-xs font-medium text-center ${
                              isReached ? "text-green-600" : "text-pink-500"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>

                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className="flex-1 mx-2 sm:mx-3">
                            <div className="relative h-1 rounded-full bg-fox-border overflow-hidden">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-1000 ease-out ${
                                  currentStep > i ? "w-full" : "w-0"
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isFailed && (
              <div className="px-5 sm:px-6 py-5 border-b border-pink-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-400/60 bg-red-400/10 text-red-500">
                    <XCircle className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-red-500">{meta.label}</p>
                    <p className="text-sm text-pink-500">{meta.desc}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 sm:p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-pink-500">Game</span>
                <span className="font-medium">{order.gameName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-500">កញ្ចប់</span>
                <span className="font-medium">{order.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-500">Player ID</span>
                <span className="font-mono">{order.playerUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-500">ការទូទាត់</span>
                <span className="font-medium">{order.paymentMethod.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pink-500">តម្លៃ</span>
                <span className="font-bold text-pink-600">${order.amountUsd.toFixed(2)}</span>
              </div>
              <div className="border-t border-pink-200 pt-3 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-pink-500">បានបង្កើត</span>
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-pink-500">បានទូទាត់</span>
                    <span>{new Date(order.paidAt).toLocaleString()}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-pink-500">Delivered</span>
                    <span className="text-green-600">{new Date(order.deliveredAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {order.status === "បរាជ័យ" && (
              <div className="mx-5 sm:mx-6 mb-5 sm:mb-6 rounded-lg border border-red-300 bg-red-100 p-4 text-sm text-red-300">
                មានអ្វីមិនមិនប្រក្រតី! សូមទាក់ទងទៅ <strong>@thephal</strong>  តាមTelegramមួយលេខបញ្ជាទិញ
              </div>
            )}

            {order.status === "បានដឹកជញ្ជូន" && (
              <div className="mx-5 sm:mx-6 mb-5 sm:mb-6 space-y-3">
                <div className="rounded-lg border border-green-300 bg-green-100 p-4 text-sm text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={2} />
                  Diamond បានដឹកជញ្ជូនជោគជ័យ!
                </div>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(`⚡ Just topped up ${order.productName} for ${order.gameName} on RITHTOPUP! Fast & easy 🔥`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#229ED9]/40 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] py-3 text-sm font-medium transition-colors"
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                  ចែករំលែកទៅ Telegram
                </a>
              </div>
            )}

            {["PAID", "PROCESSING", "DELIVERED"].includes(order.status) && (
              <div className="mx-5 sm:mx-6 mb-5 sm:mb-6">
                <a
                  href={`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-pink-400/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 py-3 text-sm font-medium transition-colors"
                >
                  <FileText className="h-4 w-4" strokeWidth={2} />
                  Download Invoice (PDF)
                </a>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
