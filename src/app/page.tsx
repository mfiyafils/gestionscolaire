"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { PLANS, PLATFORM, STRUCTURE, BLOCKS, BLOCK_COLORS, VARIANTS, money, waLink, subscriptionPrice, structureLabel, type Block } from "@/lib/core";
import { Icon, WaIcon, Logo, LangToggle, ToastHost, Field, CopyBtn, Badge } from "@/components/ui";

export default function LandingPage() {
  const { ready, role, login, act, toast } = useApp();
  const { t, locale } = useI18n();
  const router = useRouter();

  /* login */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  /* subscription */
  const [structures, setStructures] = useState<Block[]>(["nursery", "primary", "secondary"]);
  const [planId, setPlanId] = useState("annual");
  const [school, setSchool] = useState("");
  const [phone, setPhone] = useState("");
  const [mail, setMail] = useState("");
  const [payMethod, setPayMethod] = useState<"orange" | "momo">("orange");
  const [payRef, setPayRef] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[2];
  const mult = structures.length;
  const totalPrice = subscriptionPrice(plan.id, structures);

  const toggleStruct = (b: Block) => {
    setStructures((prev) => {
      if (prev.includes(b)) return prev.length > 1 ? prev.filter((x) => x !== b) : prev;
      return BLOCKS.filter((x) => prev.includes(x) || x === b);
    });
  };

  const buildProofWaUrl = (refVal: string, methodVal: "orange" | "momo") => {
    const sLabel = structureLabel(structures, locale);
    const calc = mult > 1 ? `${money(plan.price)} × ${mult} = *${money(totalPrice)}*` : `*${money(totalPrice)}*`;
    const methodTxt = methodVal === "orange" ? `Orange Money (${PLATFORM.orangeMoney})` : `MTN Mobile Money (${PLATFORM.mobileMoney})`;
    const msg = locale === "fr"
      ? `🎓 *Validation paiement Scolaria*\n\n🏫 École : ${school}\n🧱 Structures (${mult}) : ${sLabel}\n⏱ Durée : ${plan.fr}\n💰 Montant : ${calc}\n📱 WhatsApp : ${phone}\n📧 E-mail : ${mail || "—"}\n\n💳 Paiement effectué :\n• Canal : ${methodTxt}\n• Bénéficiaire : ${PLATFORM.payee}\n• Référence transaction : ${refVal.trim() || "(jointe ci-dessous)"}\n\n📸 *Je joins ma capture d'écran de transaction ci-dessous pour activation de mon compte.*`
      : `🎓 *Scolaria payment confirmation*\n\n🏫 School: ${school}\n🧱 Structures (${mult}): ${sLabel}\n⏱ Duration: ${plan.en}\n💰 Amount: ${calc}\n📱 WhatsApp: ${phone}\n📧 Email: ${mail || "—"}\n\n💳 Payment completed:\n• Channel: ${methodTxt}\n• Recipient: ${PLATFORM.payee}\n• Transaction reference: ${refVal.trim() || "(attached below)"}\n\n📸 *I am attaching my transaction screenshot below to activate my account.*`;
    return waLink(PLATFORM.whatsapp, msg);
  };

  const doLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr(false);
    const r = await login(email, password);
    setBusy(false);
    if (r === "admin") {
      setEmail(""); setPassword("");
      router.push("/admin");
    } else if (r === "tenant") {
      setEmail(""); setPassword("");
      router.push("/app");
    } else setErr(true);
  };

  const order = async () => {
    if (!school.trim() || !phone.trim()) { toast(t("en.required"), "error"); return; }
    setOrderBusy(true);
    const res = await act("public.subscribe", {
      schoolName: school, phone, email: mail, plan: planId, structures,
      paymentMethod: payMethod, paymentRef: payRef,
    });
    setOrderBusy(false);
    if (!res.ok) { toast(t("errorGeneric"), "error"); return; }
    const rid = String(res.result?.requestId ?? "");
    if (rid) setRequestId(rid);
    toast(t("pub.requestSaved"), "success");
  };

  const saveProofRef = async () => {
    if (!requestId) return;
    setOrderBusy(true);
    const res = await act("public.subscribe.proof", {
      requestId, paymentMethod: payMethod, paymentRef: payRef,
    });
    setOrderBusy(false);
    toast(res.ok ? t("pub.refSaved") : t("errorGeneric"), res.ok ? "success" : "error");
  };

  const proofWaUrl = requestId ? buildProofWaUrl(payRef, payMethod) : null;

  return (
    <div className="min-h-dvh overflow-x-clip">
      {/* ── Fixed header ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-paper/85 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-3">
          <Logo size={34} />
          <div className="mr-2">
            <p className="font-display font-black text-board text-lg leading-none">Scolaria</p>
            <p className="text-[9px] font-bold tracking-[0.2em] text-amber-2 uppercase">MFIYA & Fils</p>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-inkmut ml-4">
            <a href="#structure" className="hover:text-board transition-colors">{t("pub.structureTitle")}</a>
            <a href="#pricing" className="hover:text-board transition-colors">{t("se.subscription")}</a>
            <a href="#payment" className="hover:text-board transition-colors">{t("pub.payNumbers")}</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            {ready && role === "tenant" ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => router.push("/app")}>
                <Icon name="chevR" size={14} /> {t("pub.enterApp")}
              </button>
            ) : (
              <a href="#login" className="btn btn-primary btn-sm"><Icon name="key" size={14} /> {t("login")}</a>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-28 lg:pt-32 pb-14 px-4 lg:px-6">
        {/* floating doodles */}
        <svg className="absolute top-24 left-[6%] w-10 h-10 text-amber anim-float hidden md:block" style={{ "--rot": "-12deg" } as React.CSSProperties} viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg>
        <svg className="absolute bottom-16 left-[42%] w-8 h-8 text-coral/70 anim-float hidden lg:block" style={{ "--rot": "18deg", animationDelay: "1.2s" } as React.CSSProperties} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
        <svg className="absolute top-40 right-[4%] w-12 h-12 text-teal/60 anim-float hidden lg:block" style={{ "--rot": "8deg", animationDelay: "0.6s" } as React.CSSProperties} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" /></svg>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
          <div className="stagger">
            <span className="chip bg-board/8 text-board border border-board/15">
              <Icon name="spark" size={12} className="text-amber-2" /> {t("pub.kicker")}
            </span>
            <h1 className="font-display font-black text-board text-[2.5rem] leading-[1.05] sm:text-6xl mt-4">
              {t("pub.heroTitle")}<br />
              <span className="relative inline-block text-coral">
                {t("pub.heroTitle2")}
                <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 300 10" preserveAspectRatio="none"><path d="M2 7 Q75 1 150 6 T298 4" fill="none" stroke="#E9A23B" strokeWidth="4" strokeLinecap="round" /></svg>
              </span>
            </h1>
            <p className="text-inkmut text-base sm:text-lg leading-relaxed mt-5 max-w-xl">{t("pub.heroMsg")}</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href="#pricing" className="btn btn-amber text-base px-6 py-3.5"><WaIcon size={18} /> {t("pub.order")}</a>
              <a href="#structure" className="btn btn-ghost text-base px-6 py-3.5">{t("pub.structureTitle")}</a>
            </div>
            <div className="flex flex-wrap gap-2 mt-7">
              <Badge tone="green"><Icon name="shield" size={11} /> {t("pub.f3t")}</Badge>
              <Badge tone="blue"><Icon name="globe" size={11} /> FR / EN</Badge>
              <Badge tone="amber"><Icon name="printer" size={11} /> A6 ×4 / A4</Badge>
              <Badge tone="magenta"><Icon name="phone" size={11} /> WhatsApp</Badge>
            </div>
          </div>

          {/* Chalkboard login */}
          <div id="login" className="scroll-mt-24 anim-in" style={{ animationDelay: "150ms" }}>
            <div className="chalkboard chalk-frame rounded-3xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-3 right-4 flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-coral/80" /><span className="w-2.5 h-2.5 rounded-full bg-amber/80" /><span className="w-2.5 h-2.5 rounded-full bg-ok/80" />
              </div>
              <p className="text-amber font-bold text-[10px] tracking-[0.25em] uppercase">{t("pub.loginSub")}</p>
              <h2 className="font-display font-black text-cream text-2xl mt-1">{t("pub.loginTitle")}</h2>
              {ready && role === "tenant" ? (
                <div className="mt-6 space-y-3">
                  <p className="text-cream/80 text-sm">{t("active")} ✓</p>
                  <button type="button" className="btn btn-amber w-full text-base py-3.5" onClick={() => router.push("/app")}>
                    <Icon name="chevR" size={17} /> {t("pub.enterApp")}
                  </button>
                </div>
              ) : (
                <form onSubmit={doLogin} autoComplete="off" className="mt-5 space-y-3.5">
                  <div>
                    <label className="label !text-cream/60">{t("email")}</label>
                    <input className="input !bg-white/10 !border-white/20 !text-cream placeholder:!text-cream/30" type="email" name="school_ident" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="direction@ecole.cm" autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" />
                  </div>
                  <div>
                    <label className="label !text-cream/60">{t("password")}</label>
                    <input className="input !bg-white/10 !border-white/20 !text-cream placeholder:!text-cream/30" type="password" name="school_secret" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" data-form-type="other" />
                  </div>
                  {err && <p className="text-coral text-xs font-bold flex items-center gap-1.5 anim-pop"><Icon name="alert" size={13} /> {t("pub.invalid")}</p>}
                  <button type="submit" className="btn btn-amber w-full text-base py-3.5" disabled={busy}>
                    <Icon name={busy ? "refresh" : "key"} size={17} className={busy ? "spin" : ""} /> {t("login")}
                  </button>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-cream/40 font-bold mb-2">Démo / Demo</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="chip bg-white/10 text-cream/80 hover:bg-amber hover:text-board-2 transition-colors"
                        onClick={() => { setEmail("direction@ecole.cm"); setPassword("demo1234"); setErr(false); }}>
                        🏫 {t("pub.demoDir")}
                      </button>
                    </div>
                  </div>
                </form>
              )}
              <p className="text-[10px] text-cream/40 mt-4 flex items-center gap-1.5"><Icon name="shield" size={11} /> {t("pub.secure")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 lg:px-6 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {[
            { icon: "userPlus", tone: "#173f2f", tt: "pub.f1t", dd: "pub.f1d" },
            { icon: "phone", tone: "#2E9E6B", tt: "pub.f2t", dd: "pub.f2d" },
            { icon: "shield", tone: "#2E5FE8", tt: "pub.f3t", dd: "pub.f3d" },
            { icon: "globe", tone: "#C4327E", tt: "pub.f4t", dd: "pub.f4d" },
          ].map((f) => (
            <div key={f.tt} className="card p-5 hover:-translate-y-1 transition-transform group">
              <span className="inline-flex p-3 rounded-2xl transition-transform group-hover:rotate-6 group-hover:scale-110" style={{ background: f.tone + "18", color: f.tone }}>
                <Icon name={f.icon} size={22} />
              </span>
              <h3 className="font-display font-bold text-board mt-3">{t(f.tt)}</h3>
              <p className="text-[13px] text-inkmut leading-relaxed mt-1.5">{t(f.dd)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Structure ── */}
      <section id="structure" className="scroll-mt-24 px-4 lg:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-black text-board text-3xl sm:text-4xl">{t("pub.structureTitle")}</h2>
            <p className="text-inkmut mt-2">{t("pub.structureSub")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 stagger">
            {BLOCKS.map((b) => (
              <div key={b} className="card overflow-hidden hover:-translate-y-1 transition-transform">
                <div className="h-2" style={{ background: BLOCK_COLORS[b] }} />
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display font-bold text-board text-xl">{STRUCTURE[b].fr}</h3>
                    <span className="text-xs font-bold text-inkmut italic">{STRUCTURE[b].en}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {STRUCTURE[b].levels.map((l) => (
                      <span key={l.code} className="chip border" style={{ borderColor: BLOCK_COLORS[b] + "55", color: "#22301f", background: BLOCK_COLORS[b] + "14" }}>
                        {l.fr} <span className="opacity-55 font-normal">· {l.en}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-inkmut mt-4 flex items-center gap-1.5">
                    <Icon name="globe" size={12} className="text-teal" />
                    {b === "secondary" ? VARIANTS.map((v) => (locale === "fr" ? v.fr : v.en)).join(" · ") : (locale === "fr" ? VARIANTS[2].fr : VARIANTS[2].en)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing / subscription ── */}
      <section id="pricing" className="scroll-mt-24 px-4 lg:px-6 py-14 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-black text-board text-3xl sm:text-4xl">{t("pub.pricingTitle")}</h2>
            <p className="text-inkmut mt-2">{t("pub.pricingSub")}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 mt-9 items-start">
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                <Field label={t("pub.chooseStructure")} hint={mult > 1 ? t("pub.completeRule", { n: mult }) : t("pub.singleRule")}>
                  <div className="grid grid-cols-3 gap-2">
                    {BLOCKS.map((b) => {
                      const active = structures.includes(b);
                      return (
                        <button type="button" key={b} onClick={() => toggleStruct(b)}
                          className={`rounded-xl border-2 px-2.5 py-2.5 text-left transition-all cursor-pointer ${active ? "border-board bg-board text-white shadow-md" : "border-line bg-white text-inkmut hover:border-board"}`}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: active ? "#f0a52b" : BLOCK_COLORS[b] }} />
                            <span className="text-xs font-extrabold">{active ? "✓" : "+"}</span>
                          </div>
                          <p className="font-bold text-xs mt-1.5 truncate">{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</p>
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <Field label={t("pub.chooseDuration")}>
                  <select className="input font-semibold" value={planId} onChange={(e) => setPlanId(e.target.value)}>
                    {PLANS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {locale === "fr" ? p.fr : p.en} — {money(p.price * mult)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                {PLANS.map((p) => {
                  const computed = p.price * mult;
                  return (
                    <button type="button" key={p.id} onClick={() => setPlanId(p.id)}
                      className={`relative text-left rounded-2xl border-2 p-5 transition-all hover:-translate-y-1 cursor-pointer ${planId === p.id ? "border-board bg-board text-white shadow-xl" : "border-line bg-white hover:border-board/60"}`}>
                      {p.id === "annual" && <span className={`absolute -top-2.5 right-3 chip ${planId === p.id ? "bg-amber text-board-2" : "bg-coral text-white"}`}>{t("pub.save62")}</span>}
                      {p.id === "quarterly" && <span className={`absolute -top-2.5 right-3 chip ${planId === p.id ? "bg-amber text-board-2" : "bg-teal text-white"}`}>{t("pub.save25")}</span>}
                      <p className={`text-xs font-bold uppercase tracking-wider ${planId === p.id ? "text-amber" : "text-inkmut"}`}>{locale === "fr" ? p.fr : p.en}</p>
                      <p className="font-display font-black text-2xl mt-1.5 tabular">{money(computed)}</p>
                      <p className={`text-[11px] ${planId === p.id ? "text-white/75" : "text-inkmut"}`}>
                        {mult > 1 ? `${t("pub.baseShort")} ${money(p.price)} × ${mult}` : (p.id === "monthly" ? t("pub.perMonth") : p.id === "quarterly" ? t("pub.perQuarter") : t("pub.perYear"))}
                      </p>
                      <span className={`mt-3 inline-flex w-5 h-5 rounded-full border-2 items-center justify-center ${planId === p.id ? "border-amber bg-amber text-board-2" : "border-line"}`}>
                        {planId === p.id && <Icon name="check" size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="card p-5 mt-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <Field label={`${t("pub.yourSchool")} *`}><input className="input" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="GS Les Papillons" /></Field>
                  <Field label={`${t("pub.yourPhone")} *`}><input className="input tabular" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XX XX XX" /></Field>
                  <Field label={t("email")}><input className="input" type="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="ecole@exemple.cm" /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                  <Field label={t("pub.payMethod")}>
                    <select className="input font-semibold" value={payMethod} onChange={(e) => setPayMethod(e.target.value as "orange" | "momo")}>
                      <option value="orange">Orange Money — {PLATFORM.orangeMoney} ({PLATFORM.payee})</option>
                      <option value="momo">MTN Mobile Money — {PLATFORM.mobileMoney} ({PLATFORM.payee})</option>
                    </select>
                  </Field>
                  <Field label={t("pub.payRef")}>
                    <input className="input font-mono" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder={t("pub.payRefPh")} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-line">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-inkmut">
                      {structureLabel(structures, locale)} · {locale === "fr" ? plan.shortFr : plan.shortEn}
                    </p>
                    <p className="font-display font-black text-3xl text-board tabular">{money(totalPrice)}</p>
                    {mult > 1 && (
                      <p className="text-[11px] font-semibold text-amber-2 tabular">{money(plan.price)} × {mult} = {money(totalPrice)}</p>
                    )}
                  </div>
                  <button type="button" className="btn btn-primary grow sm:grow-0 sm:ml-auto text-sm sm:text-base px-5 py-3.5" onClick={order} disabled={orderBusy}>
                    <Icon name={orderBusy ? "refresh" : "check"} size={18} className={orderBusy ? "spin" : ""} /> {t("pub.order")}
                  </button>
                </div>
                {proofWaUrl && (
                  <div className="mt-4 rounded-2xl border-2 border-amber/60 bg-gradient-to-br from-amber/15 via-ok/5 to-white p-4 space-y-3 anim-pop">
                    <div className="flex items-start gap-3">
                      <span className="p-2 rounded-xl bg-amber text-board-2 shrink-0"><Icon name="info" size={18} /></span>
                      <div className="space-y-1.5 text-xs text-ink">
                        <p className="font-display font-bold text-sm text-board">{t("pub.proofTitle")}</p>
                        <p>1. <b>{t("pub.proofStep1")}</b></p>
                        <p>2. {t("pub.proofStep2")}</p>
                        <p className="text-inkmut">3. {t("pub.proofStep3")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2.5 pt-2 border-t border-line/70">
                      <Field label={t("pub.payRef")} className="grow min-w-[210px]">
                        <input className="input font-mono bg-white" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder={t("pub.payRefPh")} />
                      </Field>
                      <button type="button" className="btn btn-ghost btn-sm mb-0.5" onClick={saveProofRef} disabled={orderBusy}>
                        <Icon name="check" size={14} /> {t("pub.saveRef")}
                      </button>
                      <a className="btn btn-wa grow sm:grow-0 mb-0.5" href={proofWaUrl} target="_blank" rel="noreferrer">
                        <WaIcon size={17} /> {t("pub.sendProofWa")}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment numbers */}
            <div id="payment" className="scroll-mt-24 space-y-3">
              <h3 className="font-display font-bold text-board text-lg flex items-center gap-2"><Icon name="coins" size={18} className="text-amber-2" /> {t("pub.payNumbers")}</h3>
              <div className="rounded-2xl border-2 border-amber/50 bg-gradient-to-br from-amber/15 to-amber/5 p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-2">Orange Money</p>
                <p className="font-mono font-bold text-2xl text-board mt-1 tabular">{PLATFORM.orangeMoney}</p>
                <div className="mt-2"><CopyBtn text={PLATFORM.orangeMoney} /></div>
              </div>
              <div className="rounded-2xl border-2 border-warn/50 bg-gradient-to-br from-warn/15 to-warn/5 p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-warn">MTN Mobile Money</p>
                <p className="font-mono font-bold text-2xl text-board mt-1 tabular">{PLATFORM.mobileMoney}</p>
                <div className="mt-2"><CopyBtn text={PLATFORM.mobileMoney} /></div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-board text-amber font-display font-black inline-flex items-center justify-center">ML</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-inkmut">{locale === "fr" ? "Au nom de" : "Account name"}</p>
                  <p className="font-bold text-board">{PLATFORM.payee}</p>
                </div>
              </div>
              <p className="text-[12px] text-inkmut leading-relaxed flex gap-2 px-1"><Icon name="info" size={14} className="shrink-0 mt-0.5 text-teal" /> {t("pub.payNotice")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="chalkboard chalk-frame mt-8 px-4 lg:px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-5 justify-between">
          <div className="flex items-center gap-3">
            <Logo size={38} light />
            <div>
              <p className="font-display font-black text-cream text-lg leading-none">Scolaria</p>
              <p className="text-[10px] text-cream/50 mt-1">{t("pub.footer")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-cream/70">
            <span className="inline-flex items-center gap-1.5 text-cream/60"><Icon name="shield" size={13} className="text-amber" /> {PLATFORM.company}</span>
            <a className="inline-flex items-center gap-1.5 hover:text-amber transition-colors" target="_blank" rel="noreferrer" href={waLink(PLATFORM.whatsapp, "Scolaria — MFIYA & Fils")}>
              <WaIcon size={13} /> {PLATFORM.whatsappDisplay}
            </a>
          </div>
        </div>
        <p className="text-center text-[10px] text-cream/35 mt-6">{t("tagline")} · © 2026 MFIYA & Fils</p>
      </footer>
      <ToastHost />
    </div>
  );
}