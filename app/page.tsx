const NAV = [
  { label: "Gallery", href: "#gallery" },
  { label: "Artists", href: "#artists" },
  { label: "About", href: "#about" },
  { label: "Visit", href: "#visit" },
];

const WORKS = [
  { seed: "ayc-harmony", title: "Harmony in Ochre", artist: "Maya Ellison", medium: "Acrylic on canvas, 2024" },
  { seed: "ayc-roots", title: "Roots & Rhythm", artist: "Darius Kwame", medium: "Mixed media, 2023" },
  { seed: "ayc-sunday", title: "Sunday Morning", artist: "Adaeze Okafor", medium: "Oil on linen, 2024" },
  { seed: "ayc-crown", title: "Crown of Cotton", artist: "Theo Baptiste", medium: "Charcoal & gold leaf, 2022" },
  { seed: "ayc-memory", title: "Memory of Water", artist: "Simone Carter", medium: "Watercolor, 2024" },
  { seed: "ayc-gather", title: "The Gathering", artist: "Marcus Reyes", medium: "Acrylic & collage, 2023" },
];

function img(seed: string, w: number, h: number) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

export default function Home() {
  return (
    <div className="bg-cream text-ink font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="font-serif text-lg font-semibold tracking-tight">
            Art You Can Feel
          </a>
          <nav className="hidden items-center gap-8 text-sm text-ink-soft md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-clay">
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href="#visit"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-clay"
          >
            Plan a Visit
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.25em] text-clay">
              <span className="h-px w-8 bg-clay" />
              A Living Collection
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              Art you can <span className="italic text-clay">feel</span>.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              A modern gallery devoted to African American artists — bold, soulful
              work that speaks to memory, joy, and the beauty of everyday life.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#gallery"
                className="rounded-full bg-ink px-7 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay"
              >
                Explore the Collection
              </a>
              <a
                href="#about"
                className="rounded-full border border-ink/20 px-7 py-3 text-sm font-medium text-ink transition-colors hover:border-clay hover:text-clay"
              >
                Our Story
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-sm shadow-2xl shadow-ink/20">
              <img
                src={img("ayc-hero", 900, 1125)}
                alt="Featured artwork"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden w-44 rotate-[-4deg] overflow-hidden rounded-sm border-4 border-cream shadow-xl sm:block">
              <img
                src={img("ayc-hero-2", 400, 400)}
                alt="Detail of a featured work"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Statement / stats bar */}
      <section className="border-y border-ink/10 bg-cream-deep">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
          {[
            ["120+", "Original works"],
            ["40", "Represented artists"],
            ["2015", "Est. in the city"],
            ["Free", "Every first Sunday"],
          ].map(([big, small]) => (
            <div key={small} className="text-center md:text-left">
              <div className="font-serif text-3xl text-ink">{big}</div>
              <div className="mt-1 text-sm text-ink-soft">{small}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery grid */}
      <section id="gallery" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.25em] text-clay">
              Currently on view
            </p>
            <h2 className="font-serif text-4xl tracking-tight md:text-5xl">
              Featured Collection
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">
            A rotating selection of paintings, prints, and mixed-media works —
            each chosen for the way it moves the room.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {WORKS.map((w) => (
            <figure key={w.seed} className="group">
              <div className="aspect-[4/5] overflow-hidden rounded-sm bg-cream-deep">
                <img
                  src={img(w.seed, 640, 800)}
                  alt={w.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <figcaption className="mt-4">
                <h3 className="font-serif text-xl">{w.title}</h3>
                <p className="text-sm text-ink-soft">{w.artist}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-soft/70">
                  {w.medium}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* About / mission split */}
      <section id="about" className="bg-ink text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-gold">
              Our purpose
            </p>
            <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
              A home for the stories our walls have waited to tell.
            </h2>
            <p className="mt-6 leading-relaxed text-cream/75">
              Art You Can Feel exists to celebrate the depth and range of African
              American art — from the quiet dignity of a portrait to the electric
              energy of abstraction. We champion working artists, pay them fairly,
              and make space for the communities their work honors.
            </p>
            <p className="mt-4 leading-relaxed text-cream/75">
              Every piece here is chosen for one reason: it makes you feel
              something. That is the whole point.
            </p>
            <a
              href="#artists"
              className="mt-8 inline-block rounded-full border border-cream/30 px-7 py-3 text-sm font-medium transition-colors hover:border-gold hover:text-gold"
            >
              Meet the Artists
            </a>
          </div>
          <div className="order-1 md:order-2">
            <div className="aspect-[4/5] overflow-hidden rounded-sm">
              <img
                src={img("ayc-about", 800, 1000)}
                alt="Inside the gallery"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Artist spotlight */}
      <section id="artists" className="mx-auto max-w-6xl px-6 py-24">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.25em] text-clay">
          The people behind the work
        </p>
        <h2 className="mb-14 text-center font-serif text-4xl tracking-tight md:text-5xl">
          Artists in Residence
        </h2>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Maya Ellison", "Painter"],
            ["Darius Kwame", "Mixed media"],
            ["Adaeze Okafor", "Portraiture"],
            ["Simone Carter", "Watercolor"],
          ].map(([name, role], i) => (
            <div key={name} className="text-center">
              <div className="mx-auto aspect-square w-40 overflow-hidden rounded-full border-4 border-cream-deep">
                <img
                  src={img(`ayc-artist-${i}`, 300, 300)}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="mt-5 font-serif text-lg">{name}</h3>
              <p className="text-sm text-ink-soft">{role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pull quote */}
      <section className="border-y border-ink/10 bg-cream-deep">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="font-serif text-3xl italic leading-snug tracking-tight md:text-4xl">
            &ldquo;We don&rsquo;t hang art to be looked at. We hang it to be
            <span className="text-clay"> felt</span> — in the chest, in the
            memory, in the room after you&rsquo;ve gone.&rdquo;
          </p>
          <p className="mt-8 text-sm uppercase tracking-[0.25em] text-ink-soft">
            — Founder &amp; Curator
          </p>
        </div>
      </section>

      {/* Visit / newsletter */}
      <section id="visit" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-14 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl tracking-tight md:text-5xl">
              Come feel it in person.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
              The gallery is open Wednesday through Sunday. First Sunday of every
              month is free for all — bring someone you love.
            </p>
            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex gap-4">
                <dt className="w-24 text-ink-soft">Address</dt>
                <dd>412 Magnolia Ave, Studio 3</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-24 text-ink-soft">Hours</dt>
                <dd>Wed–Sun · 11am – 7pm</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-24 text-ink-soft">Contact</dt>
                <dd>hello@artyoucanfeel.com</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-sm bg-cream-deep p-8 md:p-10">
            <h3 className="font-serif text-2xl">Stay close to the work</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              New shows, artist talks, and early access to originals — a few
              times a month, never more.
            </p>
            <form className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@email.com"
                className="flex-1 rounded-full border border-ink/15 bg-cream px-5 py-3 text-sm outline-none transition-colors focus:border-clay"
              />
              <button
                type="submit"
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-clay"
              >
                Subscribe
              </button>
            </form>
            <p className="mt-3 text-xs text-ink-soft/70">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <span className="font-serif text-lg">Art You Can Feel</span>
          <nav className="flex gap-6 text-sm text-ink-soft">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-clay">
                {n.label}
              </a>
            ))}
          </nav>
          <span className="text-xs text-ink-soft/70">
            © 2026 Art You Can Feel
          </span>
        </div>
      </footer>
    </div>
  );
}
