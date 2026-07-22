"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  ShieldAlert,
  Image as ImageIcon,
  Newspaper,
  Store,
  PenTool,
  Lightbulb,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACCENT = "#F04E24";

// Skwezed file links — edit URLs here.
const SKWEZED_DOCS: {
  title: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Spec Sheet",
    icon: FileSpreadsheet,
    href: "https://docs.google.com/spreadsheets/d/1Tl35PPTDK1HGS_Arg9AyL7ODf7oiMveoxyXReChiDZU/edit?gid=48928663#gid=48928663",
  },
  {
    title: "MSDS",
    icon: ShieldAlert,
    href: "https://www.dropbox.com/scl/fo/knxfyqxo5e77zgoq6mw0y/h?rlkey=t04w0xkp585kh7ka6tb1x72iw&st=6bokk5ov&dl=0",
  },
  {
    title: "Brand Assets",
    icon: ImageIcon,
    href: "https://www.dropbox.com/scl/fo/39tyieumhyv81p5afm86o/AApI-6wXBKB97s4UhFx62WI?rlkey=333cx6p46df38dbwfk84t6ddc&st=7p7rr63q&dl=0",
  },
  {
    title: "Media Kit",
    icon: Newspaper,
    href: "https://www.dropbox.com/scl/fo/lrb4330xhfmtq34x1mtp8/AHAd-3HN5R4scRdH_eTDgR8?rlkey=e0fv4f9tk7lj0nisy6o0i5hf4&st=qnvic505&dl=0",
  },
];

// Jotform tabs — edit form IDs / labels here.
const TABS: {
  id: string;
  label: string;
  icon: LucideIcon;
  formId: string;
}[] = [
  {
    id: "store-locator",
    label: "Store Locator",
    icon: Store,
    formId: "240243854794463",
  },
  {
    id: "design-support",
    label: "Design Support",
    icon: PenTool,
    formId: "240243999971066",
  },
  {
    id: "resolution-center",
    label: "Resolution Center",
    icon: Lightbulb,
    formId: "240916181617154",
  },
  {
    id: "wholesale-form",
    label: "Wholesale Form",
    icon: ClipboardList,
    formId: "220456186230147",
  },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <section className="lg:px-4 lg:py-16 sm:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl p-4 lg:p-6 border border-gray-200 shadow-2xl shadow-gray-400/20 backdrop-blur-sm sm:p-8">
        <h1
          className="mb-8 rounded-lg px-6 py-8 text-center text-xl lg:text-3xl text-white font-bold sm:text-4xl"
          style={{ background: ACCENT }}
        >
          VPR Partnership Support
        </h1>

        {/* Skwezed file links */}
        <div className="mb-4 flex items-center gap-4">
          <span className="h-px flex-1 bg-white/20" />
          <h2 className="text-xl font-bold uppercase tracking-wide ">
            Skwezed File Links
          </h2>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SKWEZED_DOCS.map(({ title, href, icon: Icon }) => (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white/10 p-6 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full transition bg-gray-950 text-white group-hover:bg-[#101010]">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-base font-semibold uppercase ">
                {title}
              </span>
            </a>
          ))}
        </div>

        {/* Forms */}
        <div className="mb-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-white/20" />
          <h2 className="text-xl font-bold uppercase tracking-wide ">Forms</h2>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        {/* Tab buttons */}
        <div className="mb-6 border-b border-gray-200 pb-2  grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="cursor-pointer flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs lg:text-sm font-medium  transition hover:bg-gray-900 hover:text-white"
                style={isActive ? { background: ACCENT } : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content — Jotform embeds. Only the active one is mounted. */}
        <div className="rounded-lg bg-white p-2">
          {TABS.map(({ id, formId, label }) =>
            activeTab === id ? (
              <iframe
                key={id}
                title={label}
                src={`https://form.jotform.com/${formId}`}
                className="h-[800px] w-full rounded border-0"
              />
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}
