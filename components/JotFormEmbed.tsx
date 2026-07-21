"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface JotFormEmbedProps {
  formId: string;
  title: string;
}

export default function JotFormEmbed({ formId, title }: JotFormEmbedProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleIFrameMessage = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;

      const args = e.data.split(":");
      const iframe = document.getElementById(
        `JotFormIFrame-${formId}`,
      ) as HTMLIFrameElement | null;

      if (!iframe) return;

      switch (args[0]) {
        case "setHeight":
          iframe.style.height = `${args[1]}px`;
          break;
      }
    };

    window.addEventListener("message", handleIFrameMessage);

    return () => {
      window.removeEventListener("message", handleIFrameMessage);
    };
  }, [formId]);

  return (
    <div className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
          <LoaderCircle className="h-10 w-10 animate-spin text-gray-300" />
          <p className="text-sm text-gray-500">Loading application...</p>
        </div>
      )}

      <iframe
        id={`JotFormIFrame-${formId}`}
        title={title}
        src={`https://form.jotform.com/${formId}?isIframeEmbed=1`}
        className="w-full border-0"
        style={{ minWidth: "100%", height: 540 }}
        allow="geolocation; microphone; camera"
        allowFullScreen
        scrolling="no"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
