const NAV = [
  { label: "Gallery", href: "#gallery" },
  { label: "Artists", href: "#artists" },
  { label: "About", href: "#about" },
  { label: "Visit", href: "#visit" },
];

const TICKER = [
  "On view now",
  "First Sunday free",
  "40 represented artists",
  "412 Magnolia Ave",
  "Wed–Sun · 11–7",
  "New show: Roots & Rhythm",
];

const WORKS = [
  { seed: "ayc-harmony", title: "Harmony in Ochre", artist: "Maya Ellison", medium: "Acrylic on canvas", year: "2024", mat: "indigo" },
  { seed: "ayc-roots", title: "Roots & Rhythm", artist: "Darius Kwame", medium: "Mixed media", year: "2023", mat: "terracotta" },
  { seed: "ayc-sunday", title: "Sunday Morning", artist: "Adaeze Okafor", medium: "Oil on linen", year: "2024", mat: "jade" },
  { seed: "ayc-crown", title: "Crown of Cotton", artist: "Theo Baptiste", medium: "Charcoal & gold leaf", year: "2022", mat: "plum" },
  { seed: "ayc-memory", title: "Memory of Water", artist: "Simone Carter", medium: "Watercolor", year: "2024", mat: "marigold" },
  { seed: "ayc-gather", title: "The Gathering", artist: "Marcus Reyes", medium: "Acrylic & collage", year: "2023", mat: "indigo" },
];

const ARTISTS = [
  { name: "Maya Ellison", role: "Painter", block: "terracotta" },
  { name: "Darius Kwame", role: "Mixed media", block: "indigo" },
  { name: "Adaeze Okafor", role: "Portraiture", block: "jade" },
  { name: "Simone Carter", role: "Watercolor", block: "plum" },
];

/* Each mat is a background + a text color that clears 4.5:1 against it. */
const MAT: Record<string, { bg: string; fg: string; pat: string }> = {
  indigo: { bg: "bg-indigo", fg: "text-bone", pat: "pat-diamonds" },
  terracotta: { bg: "bg-terracotta", fg: "text-bone", pat: "pat-stripes" },
  jade: { bg: "bg-jade", fg: "text-bone", pat: "pat-arches" },
  plum: { bg: "bg-plum", fg: "text-bone", pat: "pat-dots" },
  marigold: { bg: "bg-marigold", fg: "text-ink", pat: "pat-zigzag" },
};

function img(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

const label = "font-mono text-[0.7rem] uppercase tracking-[0.2em]";

export default function Home() {
  return (
    <div className="bg-bone text-ink font-sans overflow-x-hidden">
      {/* Ticker */}
      <div className="marquee bg-marigold text-ink border-b-4 border-ink">
        <div className="marquee-track py-2">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex shrink-0">
              {TICKER.map((t) => (
                <span key={t} className={`${label} flex items-center gap-6 px-6 font-bold`}>
                  {t}
                  <span className="text-base leading-none">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b-4 border-ink bg-indigo text-bone">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <a href="#top" className="font-display text-xl font-extrabold uppercase leading-none tracking-tight">
            Art You <span className="text-marigold">Can Feel</span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`${label} font-bold decoration-marigold decoration-2 underline-offset-4 transition-colors hover:text-marigold hover:underline`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href="#visit"
            className={`${label} border-2 border-ink bg-marigold px-4 py-2 font-bold text-ink shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--ink)]`}
          >
            Plan a visit
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="grain relative overflow-hidden border-b-4 border-ink bg-indigo-deep text-bone">
        <div className="pat pat-diamonds absolute inset-0 opacity-40" style={{ "--pat-size": "64px" } as React.CSSProperties} />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-28">
          <div>
            <p className={`${label} mb-6 inline-block border-2 border-marigold px-3 py-1 font-bold text-marigold`}>
              A living collection · Est. 2015
            </p>
            <h1 className="font-display text-[3.25rem] font-extrabold uppercase leading-[0.86] tracking-[-0.03em] sm:text-7xl lg:text-[6.5rem]">
              <span className="block">Art</span>
              <span className="block outlined text-marigold">You Can</span>
              <span className="relative mt-2 inline-block">
                <span className="absolute -inset-x-3 -inset-y-1 -z-0 -rotate-2 bg-marigold" aria-hidden="true" />
                <span className="relative z-10 text-ink">Feel</span>
              </span>
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-bone/85">
              A gallery devoted to African American artists — bold, soulful work
              about memory, joy, and the beauty of an ordinary Tuesday.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#gallery"
                className={`${label} border-2 border-ink bg-marigold px-6 py-3.5 font-bold text-ink shadow-[6px_6px_0_0_var(--terracotta)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_0_var(--terracotta)]`}
              >
                Explore the collection
              </a>
              <a
                href="#about"
                className={`${label} border-2 border-bone px-6 py-3.5 font-bold text-bone transition-colors hover:bg-bone hover:text-indigo-deep`}
              >
                Our story
              </a>
            </div>
          </div>

          {/* Collage */}
          <div className="relative mx-auto w-full max-w-sm md:max-w-none">
            <div className="absolute -right-6 -top-8 hidden h-32 w-32 rotate-12 border-4 border-marigold sm:block" aria-hidden="true" />
            <div className="relative rotate-[-3deg] border-4 border-ink bg-terracotta p-3 shadow-[14px_14px_0_0_var(--terracotta)]">
              <img
                src={img("ayc-hero", 900, 1125)}
                alt="Featured work: a large-scale portrait in warm ochre and rust"
                className="aspect-[4/5] w-full object-cover"
              />
              <p className={`${label} mt-3 flex justify-between font-bold text-bone`}>
                <span>Now on view</span>
                <span>Gallery I</span>
              </p>
            </div>
            <div className="absolute -bottom-10 -left-6 w-36 rotate-[7deg] border-4 border-ink bg-jade p-2 shadow-[8px_8px_0_0_var(--ink)] sm:w-44">
              <img
                src={img("ayc-hero-2", 400, 400)}
                alt="Close detail of brushwork on a canvas"
                className="aspect-square w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grain relative border-b-4 border-ink bg-terracotta text-bone">
        <div className="pat pat-stripes absolute inset-0 opacity-50" style={{ "--pat-size": "60px" } as React.CSSProperties} />
        <div className="relative mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-6 py-14 md:grid-cols-4">
          {[
            ["120+", "Original works"],
            ["40", "Represented artists"],
            ["2015", "Est. in the city"],
            ["Free", "Every first Sunday"],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="font-display text-5xl font-extrabold uppercase leading-none tracking-tight text-marigold md:text-6xl">
                {big}
              </div>
              <div className={`${label} mt-3 font-bold`}>{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="border-b-4 border-ink bg-bone">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className={`${label} mb-4 font-bold text-terracotta`}>Currently on view</p>
              <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-[-0.02em] md:text-7xl">
                Featured
                <br />
                <span className="outlined text-terracotta">Collection</span>
              </h2>
            </div>
            <p className="max-w-xs text-base leading-relaxed">
              A rotating selection of paintings, prints, and mixed media — each
              one chosen for the way it moves the room.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {WORKS.map((w, i) => {
              const mat = MAT[w.mat];
              return (
                <figure key={w.seed} className="group">
                  <div
                    className={`pat ${mat.pat} ${mat.bg} ${mat.fg} relative border-4 border-ink p-3 transition-transform duration-300 ease-out group-odd:rotate-[-1.5deg] group-even:rotate-[1.5deg] group-hover:rotate-0 group-hover:-translate-y-1.5`}
                    style={{ "--pat-size": "44px" } as React.CSSProperties}
                  >
                    <span
                      className={`${label} absolute -left-3 -top-4 z-10 border-2 border-ink bg-bone px-2 py-1 font-bold text-ink`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <img
                      src={img(w.seed, 640, 800)}
                      alt={`${w.title} by ${w.artist} — ${w.medium.toLowerCase()}`}
                      loading="lazy"
                      className="relative aspect-[4/5] w-full object-cover"
                    />
                  </div>
                  <figcaption className="mt-5 border-t-2 border-ink pt-3">
                    <h3 className="font-display text-2xl font-bold uppercase leading-tight tracking-tight">
                      {w.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium">{w.artist}</p>
                    <p className={`${label} mt-2 flex justify-between text-ink/60`}>
                      <span>{w.medium}</span>
                      <span>{w.year}</span>
                    </p>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="grain relative border-b-4 border-ink bg-jade text-bone">
        <div className="pat pat-arches absolute inset-0 opacity-45" style={{ "--pat-size": "90px" } as React.CSSProperties} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className={`${label} mb-5 inline-block bg-marigold px-3 py-1 font-bold text-ink`}>
              Our purpose
            </p>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-[-0.02em] md:text-5xl lg:text-6xl">
              The home for the stories our walls
              <span className="text-marigold"> waited</span> to tell.
            </h2>
            <p className="mt-7 max-w-md leading-relaxed text-bone/85">
              Art You Can Feel celebrates the depth and range of African American
              art — from the quiet dignity of a portrait to the electric noise of
              abstraction. We champion working artists, pay them fairly, and make
              room for the communities their work honors.
            </p>
            <p className="mt-4 max-w-md leading-relaxed text-bone/85">
              Every piece here is chosen for one reason: it makes you feel
              something. That is the whole point.
            </p>
            <a
              href="#artists"
              className={`${label} mt-9 inline-block border-2 border-bone px-6 py-3.5 font-bold transition-colors hover:bg-bone hover:text-jade`}
            >
              Meet the artists
            </a>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="rotate-[2deg] border-4 border-ink shadow-[16px_16px_0_0_var(--marigold)]">
              <img
                src={img("ayc-about", 800, 1000)}
                alt="Visitors moving through the gallery's main hall"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Artists */}
      <section id="artists" className="relative border-b-4 border-ink bg-bone">
        <div className="pat pat-dots absolute inset-0 text-ink opacity-40" style={{ "--pat-size": "26px" } as React.CSSProperties} />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <p className={`${label} mb-4 font-bold text-terracotta`}>The people behind the work</p>
          <h2 className="mb-16 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-[-0.02em] md:text-7xl">
            Artists in <span className="outlined text-indigo">Residence</span>
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ARTISTS.map((a, i) => {
              const block = MAT[a.block];
              return (
                <div
                  key={a.name}
                  className={`pat ${block.pat} ${block.bg} ${block.fg} group border-4 border-ink p-4 shadow-[8px_8px_0_0_var(--ink)] transition-transform duration-300 hover:-translate-y-1.5`}
                  style={{ "--pat-size": "38px" } as React.CSSProperties}
                >
                  <img
                    src={img(`ayc-artist-${i}`, 400, 400)}
                    alt={`Portrait of ${a.name}`}
                    loading="lazy"
                    className="aspect-square w-full border-2 border-ink object-cover"
                  />
                  <h3 className="mt-4 font-display text-xl font-bold uppercase leading-tight tracking-tight">
                    {a.name}
                  </h3>
                  <p className={`${label} mt-1.5 font-bold opacity-80`}>{a.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="grain relative border-b-4 border-ink bg-marigold text-ink">
        <div className="pat pat-zigzag absolute inset-0 opacity-30" style={{ "--pat-size": "48px" } as React.CSSProperties} />
        <div className="relative mx-auto max-w-5xl px-6 py-28">
          <p className="font-display text-3xl font-extrabold uppercase leading-[1.02] tracking-[-0.02em] sm:text-5xl md:text-6xl">
            &ldquo;We don&rsquo;t hang art to be looked at. We hang it to be
            <span className="outlined text-terracotta"> felt</span> — in the
            chest, in the memory, in the room after you&rsquo;ve gone.&rdquo;
          </p>
          <p className={`${label} mt-10 font-bold`}>— Founder &amp; Curator</p>
        </div>
      </section>

      {/* Visit */}
      <section id="visit" className="grain relative border-b-4 border-ink bg-indigo text-bone">
        <div className="pat pat-diamonds absolute inset-0 opacity-35" style={{ "--pat-size": "52px" } as React.CSSProperties} />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-24 md:grid-cols-2">
          <div>
            <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-[-0.02em] md:text-6xl">
              Come feel it
              <br />
              <span className="text-marigold">in person.</span>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-bone/85">
              Open Wednesday through Sunday. The first Sunday of every month is
              free for all — bring someone you love.
            </p>
            <dl className="mt-10 border-t-2 border-bone/30">
              {[
                ["Address", "412 Magnolia Ave, Studio 3"],
                ["Hours", "Wed–Sun · 11am – 7pm"],
                ["Contact", "hello@artyoucanfeel.com"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-x-6 gap-y-1 border-b-2 border-bone/30 py-4">
                  <dt className={`${label} w-24 font-bold text-marigold`}>{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="grain relative border-4 border-ink bg-terracotta p-8 shadow-[14px_14px_0_0_var(--ink)] md:p-10">
              <h3 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-tight">
                Stay close to the work
              </h3>
              <p className="mt-3 leading-relaxed text-bone/85">
                New shows, artist talks, and early access to originals. A few
                times a month, never more.
              </p>
              <form className="mt-7 flex flex-col gap-3">
                <label htmlFor="email" className={`${label} font-bold`}>
                  Email address
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    className="flex-1 border-2 border-ink bg-bone px-4 py-3 text-ink outline-none placeholder:text-ink/45 focus-visible:ring-4 focus-visible:ring-marigold"
                  />
                  <button
                    type="submit"
                    className={`${label} border-2 border-ink bg-marigold px-6 py-3 font-bold text-ink shadow-[4px_4px_0_0_var(--ink)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_var(--ink)]`}
                  >
                    Subscribe
                  </button>
                </div>
              </form>
              <p className={`${label} mt-4 opacity-75`}>No spam. Unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-bone">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-display text-[13vw] font-extrabold uppercase leading-[0.8] tracking-[-0.04em] md:text-[9rem]">
            Art You <span className="outlined text-marigold">Can Feel</span>
          </p>
          <div className="mt-12 flex flex-col justify-between gap-6 border-t-2 border-bone/25 pt-8 sm:flex-row sm:items-center">
            <nav className="flex flex-wrap gap-6">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className={`${label} font-bold transition-colors hover:text-marigold`}
                >
                  {n.label}
                </a>
              ))}
            </nav>
            <span className={`${label} text-bone/60`}>© 2026 Art You Can Feel</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
