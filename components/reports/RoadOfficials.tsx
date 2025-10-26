"use client";

import { Mail, Phone } from "lucide-react";
import type { Report } from "@/lib/api/reports";

function Line({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function RoadOfficials({ data }: { data?: Report["roadData"] }) {
  if (!data) return null;
  const hasOfficials = !!data.officials && (
    !!data.officials.ee.mobile || !!data.officials.ee.email ||
    !!data.officials.aee.mobile || !!data.officials.aee.email ||
    !!data.officials.ae.mobile || !!data.officials.ae.email
  );

  return (
    <div className="mt-2 rounded-md border p-3">
      <div className="text-xs text-muted-foreground">
        {data.sectionLabel ? (
          <div className="mb-1">
            <span className="font-medium">{data.roadName}</span> · <span>{data.sectionLabel}</span>
          </div>
        ) : (
          <div className="mb-1"><span className="font-medium">{data.roadName}</span></div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Line label="Starts" value={data.roadStartsAt} />
          <Line label="Ends" value={data.roadEndsAt} />
          <Line label="Division" value={data.division} />
          <Line label="Section" value={data.section} />
        </div>
      </div>
      {hasOfficials && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium">Responsible Officials</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(["ee","aee","ae"] as const).map((role) => {
              const o = data.officials?.[role];
              if (!o || (!o.mobile && !o.email)) return null;
              return (
                <div key={role} className="rounded border p-2">
                  <div className="text-sm font-medium">{o.title}</div>
                  {o.mobile && (
                    <a href={`tel:${o.mobile}`} className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Phone className="h-3 w-3" /> {o.mobile}
                    </a>
                  )}
                  {o.email && (
                    <a href={`mailto:${o.email}`} className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Mail className="h-3 w-3" /> {o.email}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
