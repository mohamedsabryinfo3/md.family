"use client";

import { useState } from "react";
import { Plus, Trash2, ShieldCheck, Globe, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { Header, Card, SectionTitle } from "@/components/mdfamily/Header";
import { ActionPill } from "@/components/mdfamily/Badges";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { WebAction } from "@/lib/types";

export function WebFilteringScreen() {
  const lang = useStore((s) => s.lang);
  const go = useStore((s) => s.go);
  const family = useStore((s) => s.family);
  const setCategoryAction = useStore((s) => s.setWebCategoryAction);
  const addException = useStore((s) => s.addWebsiteException);
  const removeException = useStore((s) => s.removeWebsiteException);
  const toggleSafeSearch = useStore((s) => s.toggleSafeSearch);
  const toggleLocalVpn = useStore((s) => s.toggleLocalVpn);

  const [addOpen, setAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newAction, setNewAction] = useState<WebAction>("block");

  const submitException = () => {
    if (!newUrl.trim()) return;
    addException(newUrl.trim(), newAction);
    setNewUrl("");
    setNewAction("block");
    setAddOpen(false);
  };

  return (
    <div className="min-h-screen pb-24">
      <Header title={t("webFiltering", lang)} onBack={() => go("childProfile")} />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 mdf-fade-in">
        {/* Protection banner */}
        <Card className={cn(family.localVpnEnabled ? "border-emerald/40 bg-emerald/5" : "border-coral/40 bg-coral/5")}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", family.localVpnEnabled ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral")}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground">
                {family.localVpnEnabled ? t("protectedBy", lang) : lang === "ar" ? "الحماية غير مفعّلة" : "Protection inactive"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {family.localVpnEnabled
                  ? lang === "ar" ? "قواعد تصفية الويب مفعّلة محلياً" : "Web filtering rules are locally active"
                  : lang === "ar" ? "فعّل VPN المحلي لتطبيق القواعد" : "Enable Local VPN to apply rules"}
              </div>
            </div>
          </div>
        </Card>

        {/* Local VPN */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-trust/10 text-trust flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{t("localVpn", lang)}</div>
              <div className="text-xs text-muted-foreground mt-0.5 max-w-xs leading-relaxed">{t("localVpnDesc", lang)}</div>
            </div>
          </div>
          <Switch checked={family.localVpnEnabled} onCheckedChange={toggleLocalVpn} />
        </Card>

        {/* SafeSearch */}
        <Card className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">{t("safeSearch", lang)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lang === "ar" ? "Google · Bing · Yandex" : "Google · Bing · Yandex"}
            </div>
          </div>
          <Switch checked={family.safeSearchEnabled} onCheckedChange={toggleSafeSearch} />
        </Card>

        {/* Categories */}
        <div>
          <SectionTitle title={t("categories", lang)} />
          <Card className="!p-0 overflow-hidden">
            {family.webCategories.map((cat, i) => (
              <div key={cat.id} className={cn("flex items-center justify-between px-4 py-3", i !== family.webCategories.length - 1 && "border-b border-border")}>
                <div>
                  <div className="text-sm font-medium text-foreground">{lang === "ar" ? cat.labelAr : cat.labelEn}</div>
                </div>
                <div className="flex items-center gap-1.5 bg-muted rounded-full p-0.5">
                  {(["allow", "alert", "block"] as WebAction[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setCategoryAction(cat.id, a)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        cat.action === a
                          ? a === "allow"
                            ? "bg-emerald text-white"
                            : a === "alert"
                            ? "bg-amber text-white"
                            : "bg-coral text-white"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {a === "allow" ? t("allow", lang) : a === "alert" ? t("alertWord", lang) : t("block", lang)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Website exceptions */}
        <div>
          <SectionTitle
            title={t("websiteExceptions", lang)}
            action={
              <button
                onClick={() => setAddOpen(true)}
                className="text-trust text-xs font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("addWebsite", lang)}
              </button>
            }
          />
          {family.websiteExceptions.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground text-center py-2">{t("empty", lang)}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {family.websiteExceptions.map((ex) => (
                <Card key={ex.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate" dir="ltr">{ex.url}</div>
                    {ex.note && <div className="text-xs text-muted-foreground mt-0.5">{ex.note}</div>}
                  </div>
                  <ActionPill action={ex.action} />
                  <button
                    onClick={() => removeException(ex.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-coral hover:bg-coral/10 transition-colors"
                    aria-label="delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add exception dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addWebsite", lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              dir="ltr"
            />
            <div className="flex items-center gap-2">
              {(["allow", "alert", "block"] as WebAction[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setNewAction(a)}
                  className={cn(
                    "flex-1 h-10 rounded-lg text-xs font-semibold transition-all",
                    newAction === a
                      ? a === "allow"
                        ? "bg-emerald text-white"
                        : a === "alert"
                        ? "bg-amber text-white"
                        : "bg-coral text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a === "allow" ? t("allow", lang) : a === "alert" ? t("alertWord", lang) : t("block", lang)}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t("cancel", lang)}
            </Button>
            <Button onClick={submitException} className="bg-trust text-white hover:bg-trust/90">
              {t("add", lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
