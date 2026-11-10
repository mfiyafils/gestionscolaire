"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { classLabel, money, fmtDate, waLink, PLANS, PLATFORM, STRUCTURE, BLOCKS, BLOCK_COLORS, allowedBlocks, parseStructures, subscriptionPrice, structureLabel, type Block } from "@/lib/core";
import { Icon, WaIcon, Field, Badge, Confirm, EmptyState } from "@/components/ui";
import { ClassCreateModal } from "@/components/students";

export function SettingsView() {
  const { data, act, toast } = useApp();
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fees, setFees] = useState<Record<string, number>>({});
  const [renewStructures, setRenewStructures] = useState<Block[]>(["nursery", "primary", "secondary"]);
  const [renewPlan, setRenewPlan] = useState("annual");
  const [renewMethod, setRenewMethod] = useState<"orange" | "momo">("orange");
  const [renewRef, setRenewRef] = useState("");
  const [classModal, setClassModal] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.tenant.name);
      setPhone(data.tenant.phone);
      setEmail(data.tenant.email);
      setRenewStructures(parseStructures(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure));
      setRenewPlan(data.tenant.plan || "monthly");
      const f: Record<string, number> = {};
      for (const c of data.classes) f[c.id] = c.tuition;
      setFees(f);
    }
  }, [data]);

  if (!data) return null;
  const plan = PLANS.find((p) => p.id === data.tenant.plan) ?? PLANS[0];
  const paidBlocks = parseStructures(data.tenant.structures?.length ? data.tenant.structures : data.tenant.structure);
  const currentPrice = subscriptionPrice(data.tenant.plan, paidBlocks);
  const renewPlanObj = PLANS.find((p) => p.id === renewPlan) ?? PLANS[0];
  const renewPrice = subscriptionPrice(renewPlan, renewStructures);
  const sandbox = data.tenant.isSandbox;

  const toggleRenewStruct = (b: Block) => {
    setRenewStructures((prev) => {
      if (prev.includes(b)) return prev.length > 1 ? prev.filter((x) => x !== b) : prev;
      return BLOCKS.filter((x) => prev.includes(x) || x === b);
    });
  };

  const saveProfile = async () => {
    setBusy(true);
    const res = await act("profile.update", { name, phone, email });
    setBusy(false);
    toast(res.ok ? t("se.profileSaved") : t("errorGeneric"), res.ok ? "success" : "error");
  };
  const saveFees = async () => {
    setBusy(true);
    for (const c of data.classes) {
      if (fees[c.id] !== undefined && fees[c.id] !== c.tuition) {
        await act("class.update", { id: c.id, tuition: fees[c.id] });
      }
    }
    setBusy(false);
    toast(t("se.tariffSaved"));
  };
  const renewMethodTxt = renewMethod === "orange" ? `Orange Money (${PLATFORM.orangeMoney})` : `MTN Mobile Money (${PLATFORM.mobileMoney})`;
  const renewMsg = locale === "fr"
    ? `Bonjour ${PLATFORM.company}, je souhaite renouveler / débloquer l'abonnement Scolaria :\n🏫 École : ${data.tenant.name} (${data.tenant.email})\n🧱 Structures (${renewStructures.length}) : ${structureLabel(renewStructures, "fr")}\n⏱ Durée : ${renewPlanObj.fr}\n💰 Montant : ${money(renewPlanObj.price)} × ${renewStructures.length} = ${money(renewPrice)}\n💳 Canal : ${renewMethodTxt} (${PLATFORM.payee})\n🔖 Référence paiement : ${renewRef.trim() || "(jointe avec la capture)"}\n\n📸 Je joins la capture d'écran de ma transaction ci-dessous.`
    : `Hello ${PLATFORM.company}, I would like to renew / unlock the Scolaria subscription:\n🏫 School: ${data.tenant.name} (${data.tenant.email})\n🧱 Structures (${renewStructures.length}): ${structureLabel(renewStructures, "en")}\n⏱ Duration: ${renewPlanObj.en}\n💰 Amount: ${money(renewPlanObj.price)} × ${renewStructures.length} = ${money(renewPrice)}\n💳 Channel: ${renewMethodTxt} (${PLATFORM.payee})\n🔖 Payment ref: ${renewRef.trim() || "(attached with screenshot)"}\n\n📸 Attaching my transaction screenshot below.`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <div className="space-y-4">
        {/* Profile */}
        <section className="card p-5 anim-in">
          <h3 className="font-display font-bold text-board flex items-center gap-2"><Icon name="building" size={18} className="text-amber-2" /> {t("se.profile")}</h3>
          <p className="text-xs text-inkmut mt-1 mb-4">{t("se.profileHint")}</p>
          <div className="space-y-3.5">
            <Field label={t("se.schoolName")}><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field label={t("phone")}><input className="input tabular" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
              <Field label={t("email")}><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sandbox} /></Field>
            </div>
            <button className="btn btn-primary" onClick={saveProfile} disabled={busy}><Icon name="check" size={16} /> {t("save")}</button>
          </div>
        </section>

        {/* Subscription */}
        <section className="card p-5 anim-in overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber/15" />
          <h3 className="font-display font-bold text-board flex items-center gap-2"><Icon name="star" size={18} className="text-amber-2" /> {t("se.subscription")}</h3>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="rounded-2xl chalkboard chalk-frame text-cream px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest text-amber font-bold">{t("se.plan")}</p>
              <p className="font-display font-bold text-xl">{locale === "fr" ? plan.shortFr : plan.shortEn}</p>
              <p className="text-amber font-bold tabular">{money(currentPrice)}</p>
            </div>
            <div className="text-sm space-y-1.5">
              <p className="text-inkmut">{t("pub.chooseStructure")}: <b className="text-board">{structureLabel(paidBlocks, locale)}</b></p>
              <p className="text-inkmut">{t("se.ends")}: <b className="text-board">{fmtDate(data.tenant.subscriptionEndsAt, locale)}</b></p>
              <p className="text-inkmut">{t("status")}: <Badge tone="green">{t("active")}</Badge></p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-line space-y-3">
            <Field label={t("pub.chooseStructure")}>
              <div className="grid grid-cols-3 gap-2">
                {BLOCKS.map((b) => {
                  const checked = renewStructures.includes(b);
                  const isPaidNow = paidBlocks.includes(b);
                  return (
                    <button type="button" key={b} onClick={() => toggleRenewStruct(b)}
                      className={`rounded-xl border-2 px-2.5 py-2 text-left text-xs font-bold transition-all cursor-pointer ${checked ? "border-board bg-board text-white" : "border-line bg-parch text-inkmut hover:border-board"}`}>
                      <span className="flex items-center justify-between gap-1">
                        <span>{locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}</span>
                        <span>{checked ? "✓" : isPaidNow ? "" : "🔒"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("pub.chooseDuration")}>
                <select className="input text-xs" value={renewPlan} onChange={(e) => setRenewPlan(e.target.value)}>
                  {PLANS.map((p) => <option key={p.id} value={p.id}>{locale === "fr" ? p.fr : p.en} — {money(subscriptionPrice(p.id, renewStructures))}</option>)}
                </select>
              </Field>
            <Field label={t("pub.payMethod")}>
              <select className="input text-xs" value={renewMethod} onChange={(e) => setRenewMethod(e.target.value as "orange" | "momo")}>
                <option value="orange">Orange Money — {PLATFORM.orangeMoney}</option>
                <option value="momo">MTN MoMo — {PLATFORM.mobileMoney}</option>
              </select>
            </Field>
              <Field label={t("pub.payRef")}>
                <input className="input text-xs font-mono" value={renewRef} onChange={(e) => setRenewRef(e.target.value)} placeholder={t("pub.payRefPh")} />
              </Field>
            </div>
          </div>
          <p className="text-[11px] text-inkmut mt-3 bg-amber/10 border border-amber/30 rounded-xl px-3 py-2">
            <b>{PLATFORM.payee}</b> — OM <b className="font-mono text-board">{PLATFORM.orangeMoney}</b> · MoMo <b className="font-mono text-board">{PLATFORM.mobileMoney}</b>. {t("pub.payNotice")}
          </p>
          <div className="mt-3 flex justify-end">
            <a className="btn btn-wa" target="_blank" rel="noreferrer" href={waLink(PLATFORM.whatsapp, renewMsg)}>
              <WaIcon size={16} /> {t("pub.sendProofWa")} · {money(renewPrice)}
            </a>
          </div>
        </section>

        {/* Security */}
        <section className="card p-5 anim-in border-ok/30">
          <h3 className="font-display font-bold text-board flex items-center gap-2"><Icon name="shield" size={18} className="text-ok" /> {t("se.security")}</h3>
          <p className="text-sm text-inkmut mt-2 leading-relaxed">{t("se.securityMsg")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="green">AES · scrypt</Badge>
            <Badge tone="board">Multi-tenant</Badge>
            <Badge tone="blue">HTTP-only sessions</Badge>
          </div>
        </section>

        {sandbox && (
          <section className="card p-5 border-coral/40 anim-in">
            <h3 className="font-display font-bold text-coral flex items-center gap-2"><Icon name="flask" size={18} /> {t("se.sandboxReset")}</h3>
            <p className="text-sm text-inkmut mt-2">{t("se.sandboxResetMsg")}</p>
            <button className="btn btn-danger mt-3" onClick={() => setResetOpen(true)}><Icon name="trash" size={15} /> {t("se.sandboxReset")}</button>
          </section>
        )}
      </div>

      {/* Director fees */}
      <section className="card p-5 anim-in" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-display font-bold text-board flex items-center gap-2"><Icon name="coins" size={18} className="text-amber-2" /> {t("se.tariffs")}</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => setClassModal(true)}><Icon name="plus" size={14} /> {t("cls.add")}</button>
        </div>
        <p className="text-xs text-inkmut mt-1 mb-4">{t("se.tariffsHint")}</p>
        {data.classes.length === 0 ? (
          <EmptyState icon="book" title={t("se.noClasses")}
            action={<div className="flex flex-wrap gap-2 justify-center">
              <button className="btn btn-primary btn-sm" onClick={async () => {
                setBusy(true);
                const r = await act("classes.initStandard");
                setBusy(false);
                toast(r.ok ? t("se.classesInitialized") : t("errorGeneric"), r.ok ? "success" : "error");
              }} disabled={busy}><Icon name="spark" size={14} /> {t("se.initStandard")}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setClassModal(true)}><Icon name="plus" size={14} /> {t("cls.add")}</button>
            </div>} />
        ) : (
        <>
        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {BLOCKS.map((b) => {
            const paid = sandbox || allowedBlocks(paidBlocks).includes(b);
            const list = data.classes.filter((c) => c.block === b);
            if (!list.length && paid) return null;
            return (
              <div key={b} className={!paid ? "opacity-55 grayscale" : ""}>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-inkmut mb-2 flex items-center gap-2">
                  <i className="w-2.5 h-2.5 rounded-full" style={{ background: !paid ? "#9ca3af" : BLOCK_COLORS[b] }} />
                  {locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en}
                  {!paid && <Badge tone="gray">🔒 {t("blk.unpaid")}</Badge>}
                </p>
                <div className="space-y-2">
                  {list.length > 0 ? list.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
                      <div className="grow min-w-0">
                        <p className="text-sm font-bold text-board">{classLabel(c, locale)}</p>
                        <p className="text-[10.5px] text-inkmut">{data.students.filter((s) => s.classId === c.id).length} {t("students")}</p>
                      </div>
                      <input type="number" min={0} step={500} disabled={!paid} className="input w-32 tabular text-right font-bold"
                        value={fees[c.id] ?? c.tuition}
                        onChange={(e) => setFees((f) => ({ ...f, [c.id]: Number(e.target.value) }))} />
                      <span className="text-[10px] font-bold text-inkmut">FCFA</span>
                    </div>
                  )) : (
                    <p className="text-xs text-inkmut bg-gray-100 rounded-xl px-3 py-2 border border-gray-300">{t("blk.forbidden")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn btn-amber w-full mt-4" onClick={saveFees} disabled={busy}>
          <Icon name={busy ? "refresh" : "check"} size={16} className={busy ? "spin" : ""} /> {t("save")} — {t("se.tariffs")}
        </button>
        </>
        )}
      </section>

      <ClassCreateModal open={classModal} onClose={() => setClassModal(false)} />
      <Confirm open={resetOpen} onClose={() => setResetOpen(false)} title={t("se.sandboxReset")} confirmLabel={t("confirm")}
        message={t("se.sandboxResetMsg")}
        onConfirm={async () => { const r = await act("sandbox.reset"); setResetOpen(false); toast(r.ok ? t("se.sandboxResetDone") : t("errorGeneric"), r.ok ? "success" : "error"); }} />
    </div>
  );
}