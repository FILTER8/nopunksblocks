"use client";

import Link from "next/link";
import { useState } from "react";

type SiteHeaderProps = {
  title?: string;
  current?: "home" | "api" | "github";
};

export default function SiteHeader({
  title = "NoPunks Blocks",
  current,
}: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  const nav = [
    { href: "https://nopunks.xyz/api/", label: "API", key: "api", external: true },
    { href: "https://github.com/FILTER8", label: "GitHub", key: "github", external: true },
  ] as const;

  return (
    <header className="pointer-events-none fixed left-0 top-0 z-50 w-full bg-transparent">
      <div className="pointer-events-auto flex w-full items-center justify-between px-6 py-6 sm:px-8 lg:px-12">
        <Link href="/" className="shrink-0 font-display text-[#d6d6d6]">
          <div className="text-lg tracking-[0.25em] sm:text-xl">{title}</div>
        </Link>

        <nav className="hidden items-center justify-end gap-8 font-display text-xs uppercase tracking-[0.2em] text-[#a8a8a8] md:flex">
          {nav.map((item) => {
            const active = current === item.key;
            const className = active
              ? "underline underline-offset-4 text-[#d6d6d6]"
              : "hover:underline";

            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                >
                  {item.label}
                </a>
              );
            }

            return (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center border border-[#2a2a2a] bg-black/30 text-[#d6d6d6] backdrop-blur-sm md:hidden"
        >
          <div className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 bg-[#d6d6d6]" />
            <span className="block h-0.5 w-5 bg-[#d6d6d6]" />
            <span className="block h-0.5 w-5 bg-[#d6d6d6]" />
          </div>
        </button>
      </div>

      {open && (
        <div className="pointer-events-auto mx-6 border border-[#2a2a2a] bg-black/80 backdrop-blur-sm md:hidden sm:mx-8">
          <nav className="flex w-full flex-col px-6 py-2 font-display text-xs uppercase tracking-[0.2em] text-[#cfcfcf]">
            {nav.map((item, index) => {
              const active = current === item.key;
              const className = [
                "py-3",
                index < nav.length - 1 ? "border-b border-[#2a2a2a]" : "",
                active ? "underline underline-offset-4 text-[#ffffff]" : "",
              ]
                .filter(Boolean)
                .join(" ");

              if (item.external) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={className}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}