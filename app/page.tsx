import SiteHeader from "@/components/site-header";
import NoPunkStage from "@/components/NoPunkStage";

export default function HomePage() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-[#b3b3b3]">
      <SiteHeader current="home" />

      <main className="h-full w-full overflow-hidden">
        <NoPunkStage />
      </main>

      <footer className="pointer-events-auto absolute bottom-6 left-6 z-40 text-xs text-[#7a7a7a]">
        <div className="uppercase tracking-[0.2em]">Links</div>

        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          <div>
            Tool by{" "}
            <a
              className="underline"
              href="https://x.com/0xfilter8"
              target="_blank"
              rel="noreferrer"
            >
              0xfilter8
            </a>
          </div>

          <div>
            Project{" "}
            <a
              className="underline"
              href="https://nopunks.xyz/"
              target="_blank"
              rel="noreferrer"
            >
              No-Punks
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}