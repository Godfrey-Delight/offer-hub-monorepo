"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MockResponse } from "@/data/api-schema";

interface ResponseViewerProps {
  responses: MockResponse[];
}

export function ResponseViewer({ responses }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = responses[activeTab];

  async function handleCopy() {
    await navigator.clipboard.writeText(current.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl shadow-neu-sunken overflow-hidden bg-bg-sunken border border-theme-border/20">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-border/20 bg-bg-base/40">
        <div className="flex gap-1.5 flex-wrap">
          {responses.map((res, i) => {
            const isActive = i === activeTab;
            const isSuccess = res.status >= 200 && res.status < 300;
            return (
              <button
                key={`${res.status}-${res.label}`}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all duration-200",
                  isActive
                    ? isSuccess
                      ? "text-theme-success bg-theme-success/15 shadow-neu-sunken-subtle font-bold"
                      : "text-theme-error bg-theme-error/15 shadow-neu-sunken-subtle font-bold"
                    : "text-content-secondary hover:text-content-primary bg-transparent"
                )}
              >
                {res.status} {res.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCopy}
          aria-label="Copy response"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200",
            copied
              ? "text-theme-success bg-theme-success/10 shadow-neu-sunken-subtle"
              : "text-content-secondary hover:text-content-primary bg-bg-base shadow-neu-raised-sm hover:shadow-neu-sunken-subtle"
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* JSON body */}
      <pre className="overflow-x-auto p-4 text-xs sm:text-sm leading-relaxed m-0 font-mono text-content-primary bg-bg-sunken/80">
        <code>{current.body}</code>
      </pre>
    </div>
  );
}
