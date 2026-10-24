"use client";

import { useState } from "react";
import { Check, Search, X, ChevronDown, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { apiActions } from "@/lib/api-actions";
import { t } from "@/lib/i18n";
import { PHONE_BRANDS } from "@/lib/types";
import type { PhoneBrand } from "@/lib/types";
import { Header } from "@/components/mdfamily/Header";
import { Card } from "@/components/mdfamily/Header";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AVATAR_COLORS = ["#3182CE", "#FF6B9D", "#34C759", "#FF9500", "#8B5CF6"];

export function AddChildScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const schools = useStore((s) => s.family.schools);

  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phoneBrand, setPhoneBrand] = useState<PhoneBrand | "">("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = name.trim().length >= 2;

  const filteredBrands = PHONE_BRANDS.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await apiActions.addChild({
        name,
        birthdate: birthdate || undefined,
        phoneBrand: phoneBrand || undefined,
        schoolId: schoolId || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("addChild", lang)} onBack={() => go("children")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Avatar preview */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ backgroundColor: AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? "#3182CE" }}
          >
            {name.trim().charAt(0) || "؟"}
          </div>
          <span className="text-xs text-muted-foreground">{t("childAvatar", lang)}</span>
        </div>

        {/* Name */}
        <Card>
          <Label htmlFor="child-name" className="text-xs font-medium text-muted-foreground">
            {t("childName", lang)} *
          </Label>
          <Input
            id="child-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === "ar" ? "اكتب اسم الطفل" : "Type child name"}
            className="mt-1.5"
            autoFocus
          />
        </Card>

        {/* Birthdate */}
        <Card>
          <Label htmlFor="bd" className="text-xs font-medium text-muted-foreground">
            {t("birthdateOptional", lang)}
          </Label>
          <Input
            id="bd"
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="mt-1.5"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
            {t("birthdateHint", lang)}
          </p>
        </Card>

        {/* Phone brand */}
        <Card>
          <Label className="text-xs font-medium text-muted-foreground">
            {t("phoneBrandOptional", lang)}
          </Label>
          <button
            type="button"
            onClick={() => setBrandOpen((v) => !v)}
            className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 flex items-center justify-between text-sm hover:border-trust/50 transition-colors"
          >
            <span className={cn(!phoneBrand && "text-muted-foreground")}>
              {phoneBrand || t("searchBrand", lang)}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", brandOpen && "rotate-180")} />
          </button>

          {brandOpen && (
            <div className="mt-2 border border-border rounded-lg overflow-hidden">
              <div className="p-2 border-b border-border bg-muted/30">
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder={t("searchBrand", lang)}
                    className="ps-8 h-9 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto mdf-scroll">
                {filteredBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setPhoneBrand(b);
                      setBrandOpen(false);
                      setBrandSearch("");
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-start hover:bg-accent flex items-center justify-between transition-colors",
                      phoneBrand === b && "bg-accent text-trust font-medium",
                    )}
                  >
                    <span>{b}</span>
                    {phoneBrand === b && <Check className="w-4 h-4 text-trust" />}
                  </button>
                ))}
                {filteredBrands.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    {lang === "ar" ? "لا نتائج" : "No results"}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* School */}
        {schools.length > 0 && (
          <Card>
            <Label className="text-xs font-medium text-muted-foreground">{t("schoolOptional", lang)}</Label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="mt-1.5 w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-trust/40"
            >
              <option value="">{lang === "ar" ? "— اختر —" : "— Select —"}</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Card>
        )}

        {/* Emergency contact */}
        <Card>
          <Label className="text-xs font-medium text-muted-foreground">{t("emergencyContact", lang)}</Label>
          <Input
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="+20 1X XXXX XXXX"
            dir="ltr"
            className="mt-1.5"
          />
        </Card>

        <div className="pt-2">
          <Button
            disabled={!valid || submitting}
            onClick={submit}
            className={cn(
              "w-full h-12 text-base",
              valid && !submitting ? "bg-trust text-white hover:bg-trust/90" : "bg-muted text-muted-foreground",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {lang === "ar" ? "جارٍ الإضافة..." : "Adding..."}
              </>
            ) : (
              t("addChild", lang)
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
