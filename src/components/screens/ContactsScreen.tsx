"use client";

import { useState } from "react";
import { Plus, Trash2, Phone, User, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { ContactEntry } from "@/lib/types";

const RELATIONS: { key: ContactEntry["relation"]; ar: string }[] = [
  { key: "father", ar: "الأب" },
  { key: "mother", ar: "الأم" },
  { key: "grandfather", ar: "الجد" },
  { key: "grandmother", ar: "الجدة" },
  { key: "trusted", ar: "شخص موثوق" },
  { key: "other", ar: "أخرى" },
];

function isValidPhone(phone: string): boolean {
  // Loose validation: at least 8 digits, optional + prefix
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 8 && /^\+?[\d\s-]+$/.test(phone.trim());
}

export function ContactsScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const contacts = useStore((s) => s.family.contacts);
  const addContact = useStore((s) => s.addContact);
  const toggleContact = useStore((s) => s.toggleContact);
  const removeContact = useStore((s) => s.removeContact);
  const confirmDialog = useStore((s) => s.confirmDialog);
  const toastMsg = useStore((s) => s.toast);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRelation, setNewRelation] = useState<ContactEntry["relation"]>("father");
  const [newPrimary, setNewPrimary] = useState(false);

  const grouped = (rel: ContactEntry["relation"]) => contacts.filter((c) => c.relation === rel);

  const submit = () => {
    if (!isValidPhone(newPhone)) {
      toastMsg({ title: t("invalidPhone", lang), variant: "error" });
      return;
    }
    addContact({
      name: newName.trim() || undefined,
      phone: newPhone.trim(),
      relation: newRelation,
      isPrimary: newPrimary,
      enabled: true,
    });
    setNewName("");
    setNewPhone("");
    setNewRelation("father");
    setNewPrimary(false);
    setAddOpen(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header
        title={t("contacts", lang)}
        onBack={() => go("settings")}
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="w-9 h-9 rounded-full bg-trust text-white flex items-center justify-center"
            aria-label={t("addNumber", lang)}
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Emergency path info */}
        <Card className="bg-accent border-trust/30">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-trust shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              {lang === "ar"
                ? "في وضع الطفل، يفتح زر الاتصال قائمة بالأرقام المصرّح بها فقط، ثم يستدعي تطبيق الاتصال الأصلي بعد تفاعل صريح. لا تجرِ المكالمات تلقائياً."
                : "In child mode, the call button opens a list of authorized numbers only, then invokes the native dialer after explicit interaction. No automatic calls."}
            </p>
          </div>
        </Card>

        {/* Groups */}
        {RELATIONS.map((rel) => {
          const items = grouped(rel.key);
          if (items.length === 0) return null;
          return (
            <div key={rel.key}>
              <SectionTitle title={rel.ar === "الأب" ? t("fatherNumbers", lang) : rel.ar === "الأم" ? t("motherNumbers", lang) : t("familyNumbers", lang)} />
              <div className="space-y-2">
                {items.map((c) => (
                  <Card key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-trust/10 text-trust flex items-center justify-center">
                      {c.isPrimary ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{c.name ?? c.phone}</span>
                        {c.isPrimary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-trust/15 text-trust font-medium">
                            {t("primaryNumber", lang)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 ltr-nums" dir="ltr">{c.phone}</div>
                    </div>
                    <Switch checked={c.enabled} onCheckedChange={() => toggleContact(c.id)} />
                    <button
                      onClick={() =>
                        confirmDialog({
                          title: t("confirmDeleteTitle", lang),
                          body: lang === "ar" ? `سيتم حذف جهة الاتصال ${c.name ?? c.phone}.` : `Contact ${c.name ?? c.phone} will be deleted.`,
                          confirmLabel: t("delete", lang),
                          destructive: true,
                          onConfirm: () => removeContact(c.id),
                        })
                      }
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-coral hover:bg-coral/10 transition-colors"
                      aria-label="delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {contacts.length === 0 && (
          <Card>
            <div className="py-8 text-center">
              <Phone className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{t("empty", lang)}</p>
            </div>
          </Card>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addNumber", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">{lang === "ar" ? "الاسم (اختياري)" : "Name (optional)"}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("phoneNumber", lang)} *</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+20 1X XXXX XXXX"
                dir="ltr"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("relation", lang)}</Label>
              <select
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value as ContactEntry["relation"])}
                className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
              >
                {RELATIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.ar}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Switch checked={newPrimary} onCheckedChange={setNewPrimary} />
              <span className="text-sm text-foreground">{t("primaryNumber", lang)}</span>
            </label>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("cancel", lang)}</Button>
            <Button onClick={submit} className="bg-trust text-white hover:bg-trust/90">{t("add", lang)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
