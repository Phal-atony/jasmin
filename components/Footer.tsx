import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t-2 border-pink-200 bg-white">
      {/* Pink top wave decoration */}
      <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#E91E8C,#FF6EB4,#E91E8C)" }} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md shadow-pink-300/40"
                   style={{ background: "linear-gradient(135deg,#E91E8C,#FF6EB4)" }}>
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-display text-lg font-extrabold text-pink-800">
                JASMIN<span className="text-pink-500">TOPUP</span>
              </span>
            </div>
            <p className="text-xs text-pink-600 leading-relaxed font-medium">
              ការបញ្ចូលទឹកប្រាក់ហ្គេមលឿនបំផុតនៅកម្ពុជា។ ការដឹកជញ្ជូនភ្លាមៗ ការទូទាត់មានសុវត្ថិភាព។
            </p>

            {/* Social icons */}
            <div className="flex gap-2 mt-4">
              {[
                { label: "Facebook", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
                { label: "Telegram", path: "M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 0 1-2.349.88 2.252 2.252 0 0 0 .28 4.402l1.504.308c.256.053.515.068.78.044l.85-.082 1.65 4.78c.114.332.415.554.764.554h.43c.35 0 .65-.222.764-.556l.908-2.636 4.354 3.226a2.24 2.24 0 0 0 3.345-1.09l3.12-9.545a2.253 2.253 0 0 0-.8-2.44z" },
              ].map((s) => (
                <a key={s.label} href="#" aria-label={s.label}
                   className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-pink-200 bg-pink-50 text-pink-500 transition-all hover:border-pink-400 hover:bg-pink-100 hover:text-pink-700">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            {
              heading: "Quick Links",
              items: [
                { label: "ទំព័រដើម", href: "/" },
                { label: "ហ្គេមទាំងអស់", href: "/#games" },
                { label: "តាមដានការបញ្ជាទិញ", href: "/order" },
                { label: "FAQ", href: "/faq" },
                { label: "Blog", href: "/blog" },
              ],
            },
            {
              heading: "ការទូទាត់",
              items: [
                { label: "KHQR", href: "#" },
              ],
            },
            {
              heading: "ជំនួយ",
              items: [
                { label: "Telegram: @rithtopup", href: "#" },
                { label: "24/7 Service", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.heading}>
              <h4 className="font-extrabold mb-3 text-xs uppercase tracking-wider text-pink-500">{col.heading}</h4>
              <ul className="space-y-1.5 text-sm">
                {col.items.map((it) => (
                  <li key={it.label}>
                    <Link href={it.href} className="text-pink-700/70 transition-colors hover:text-pink-500 text-xs font-semibold">
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment logos */}
        <div className="mt-8 pt-6 border-t-2 border-pink-100">
          <p className="text-[11px] font-bold text-pink-500 uppercase tracking-wider mb-3">ការទូទាត់ត្រូវបានទទួលយក</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {["KHQR", "ABA", "Wing", "TrueMoney"].map((p) => (
              <span key={p} className="rounded-lg border-2 border-pink-200 bg-pink-50 px-3 py-1 text-xs font-extrabold text-pink-600">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-pink-400 font-semibold">
          <p>&copy; {new Date().getFullYear()} JASMINTOPUP. All rights reserved.</p>
          
        </div>
      </div>
    </footer>
  );
}
