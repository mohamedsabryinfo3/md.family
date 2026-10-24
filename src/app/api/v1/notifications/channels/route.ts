import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    channels: [
      { id: "mdfamily_sos", name_ar: "استغاثات SOS", name_en: "SOS Alerts", importance: "HIGH" },
      { id: "mdfamily_alerts", name_ar: "تنبيهات السلامة", name_en: "Safety Alerts", importance: "HIGH" },
      { id: "mdfamily_requests", name_ar: "طلبات وقت إضافي", name_en: "Time Requests", importance: "DEFAULT" },
      { id: "mdfamily_protection", name_ar: "حالة الحماية", name_en: "Protection Status", importance: "LOW" },
      { id: "mdfamily_location", name_ar: "أحداث الموقع", name_en: "Location Events", importance: "DEFAULT" },
      { id: "mdfamily_live", name_ar: "الجلسات الحية", name_en: "Live Sessions", importance: "HIGH" },
      { id: "mdfamily_general", name_ar: "عام", name_en: "General", importance: "DEFAULT" },
    ],
  });
}
