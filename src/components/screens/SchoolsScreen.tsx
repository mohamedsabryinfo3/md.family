"use client";

import { useState } from "react";
import { Plus, Trash2, School, Flag, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { ClassificationPill } from "@/components/mdfamily/Badges";
import { EmptyState } from "@/components/mdfamily/States";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

export function SchoolsScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const schools = useStore((s) => s.family.schools);
  const reports = useStore((s) => s.family.classificationReports);
  const addSchool = useStore((s) => s.addSchool);
  const deleteSchool = useStore((s) => s.deleteSchool);
  const submitReport = useStore((s) => s.submitClassificationReport);
  const confirmDialog = useStore((s) => s.confirmDialog);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [rApp, setRApp] = useState("");
  const [rCurrent, setRCurrent] = useState<"safe" | "adult">("safe");
  const [rSuggested, setRSuggested] = useState<"safe" | "adult">("adult");
  const [rReason, setRReason] = useState("");
  const [rNote, setRNote] = useState("");

  const locale = lang === "ar" ? ar : enUS;

  const submitSchool = () => {
    if (!name.trim()) return;
    addSchool({ name: name.trim(), address: address.trim() || undefined, phone: phone.trim() || undefined });
    setName("");
    setAddress("");
    setPhone("");
    setAddOpen(false);
  };

  const submitR = () => {
    if (!rApp.trim() || !rReason.trim()) return;
    submitReport({
      appName: rApp.trim(),
      currentClassification: rCurrent,
      suggestedClassification: rSuggested,
      reason: rReason.trim(),
      note: rNote.trim() || undefined,
    });
    setRApp(""); setRReason(""); setRNote("");
    setReportOpen(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("schools", lang)}
        onBack={() => go("settings")}
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 rounded-full bg-trust text-white flex items-center justify-center"
            aria-label={t("addSchool", lang)}
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Schools list */}
        <div>
          <SectionTitle title={`${t("schools", lang)} (${schools.length})`} />
          {schools.length === 0 ? (
            <EmptyState
              icon={<School className="w-8 h-8" />}
              title={t("noSchoolsYet", lang)}
              description={t("noSchoolsHint", lang)}
              actionLabel={t("addSchool", lang)}
              onAction={() => setAddOpen(true)}
            />
          ) : (
            <div className="space-y-2">
              {schools.map((s) => (
                <Card key={s.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-trust/10 text-trust flex items-center justify-center shrink-0">
                      <School className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{s.name}</div>
                      {s.address && <div className="text-xs text-muted-foreground mt-0.5">{s.address}</div>}
                      {s.phone && <div className="text-xs text-muted-foreground mt-0.5 ltr-nums" dir="ltr">{s.phone}</div>}
                      {s.notes && <div className="text-xs text-muted-foreground mt-1 italic">{s.notes}</div>}
                    </div>
                    <button
                      onClick={() =>
                        confirmDialog({
                          title: t("confirmDeleteTitle", lang),
                          body: lang === "ar" ? `سيتم حذف المدرسة ${s.name}.` : `School ${s.name} will be deleted.`,
                          confirmLabel: t("delete", lang),
                          destructive: true,
                          onConfirm: () => deleteSchool(s.id),
                        })
                      }
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-coral hover:bg-coral/10 transition-colors"
                      aria-label="delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Classification reports */}
        <div>
          <SectionTitle
            title={lang === "ar" ? "بلاغات التصنيف" : "Classification reports"}
            action={
              <button
                onClick={() => setReportOpen(true)}
                className="text-trust text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <Flag className="w-3.5 h-3.5" />
                {t("reportWrongClassification", lang)}
              </button>
            }
          />
          <Card className="bg-amber/5 border-amber/30">
            <p className="text-xs text-foreground leading-relaxed">{t("reportHint", lang)}</p>
          </Card>
          {reports.length > 0 && (
            <div className="space-y-2 mt-3">
              {reports.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber/10 text-amber flex items-center justify-center shrink-0">
                      <Flag className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{r.appName}</div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{t("currentClassification", lang)}:</span>
                        <ClassificationPill kind={r.currentClassification} />
                        <span className="text-xs text-muted-foreground">→</span>
                        <ClassificationPill kind={r.suggestedClassification} />
                      </div>
                      <p className="text-xs text-foreground mt-2 leading-relaxed">{r.reason}</p>
                      {r.note && <p className="text-xs text-muted-foreground mt-1 italic">{r.note}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", r.status === "pending_review" ? "bg-amber/15 text-amber" : "bg-emerald/15 text-emerald")}>
                          {r.status === "pending_review" ? t("pendingReview", lang) : t("reviewed", lang)}
                        </span>
                        <span className="text-xs text-muted-foreground ltr-nums">
                          {format(new Date(r.submittedAt), "d MMM yyyy", { locale })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add school */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addSchool", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">{t("schoolName", lang)} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("schoolAddress", lang)}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("schoolPhone", lang)}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1" />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("cancel", lang)}</Button>
            <Button onClick={submitSchool} disabled={!name.trim()} className="bg-trust text-white hover:bg-trust/90">
              {t("add", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report classification */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("reportWrongClassification", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">{lang === "ar" ? "اسم التطبيق/اللعبة" : "App/game name"} *</Label>
              <Input value={rApp} onChange={(e) => setRApp(e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("currentClassification", lang)}</Label>
                <select
                  value={rCurrent}
                  onChange={(e) => setRCurrent(e.target.value as "safe" | "adult")}
                  className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                >
                  <option value="safe">{t("safe", lang)}</option>
                  <option value="adult">{t("adult", lang)}</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("suggestedClassification", lang)}</Label>
                <select
                  value={rSuggested}
                  onChange={(e) => setRSuggested(e.target.value as "safe" | "adult")}
                  className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
                >
                  <option value="safe">{t("safe", lang)}</option>
                  <option value="adult">{t("adult", lang)}</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("reason", lang)} *</Label>
              <Textarea value={rReason} onChange={(e) => setRReason(e.target.value)} className="mt-1" rows={3} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{lang === "ar" ? "ملاحظة (اختياري)" : "Note (optional)"}</Label>
              <Textarea value={rNote} onChange={(e) => setRNote(e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)}>{t("cancel", lang)}</Button>
            <Button onClick={submitR} disabled={!rApp.trim() || !rReason.trim()} className="bg-trust text-white hover:bg-trust/90">
              <Send className="w-4 h-4 me-2" />
              {t("request", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
