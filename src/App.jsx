const CALENDLY_URL = 'https://calendly.com/hello-rebootmedia/diagnostic';

function Logo({ className = 'w-7 h-7' }) {
  return <img src="/logo.png" alt="Reboot Media" className={className} />;
}

function IconArrowRight({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconLinkedIn({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function CTAButton({ children, variant = 'primary', href = CALENDLY_URL }) {
  const base = 'inline-flex items-center gap-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark transition-colors';
  const sizes = {
    primary: 'px-6 py-3 text-base',
    small: 'px-4 py-2 text-sm',
  };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${sizes[variant]}`}>
      {children}
    </a>
  );
}

function Section({ id, label, children }) {
  return (
    <section id={id} className="border-t border-slate-200">
      <div className="max-w-5xl mx-auto px-6 py-14 md:py-16 grid md:grid-cols-12 gap-6 md:gap-10">
        <div className="md:col-span-3">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">{label}</p>
        </div>
        <div className="md:col-span-9">{children}</div>
      </div>
    </section>
  );
}

function Nav() {
  return (
    <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
      <a href="#" className="flex items-center gap-2.5">
        <Logo className="w-7 h-7" />
        <span className="font-bold text-base text-brand-950 tracking-tight">Reboot Media</span>
      </a>
      <nav className="flex items-center gap-6 md:gap-8">
        <a href="#approach" className="text-sm text-slate-600 hover:text-brand-950 transition-colors hidden sm:inline">Approach</a>
        <a href="#fit" className="text-sm text-slate-600 hover:text-brand-950 transition-colors hidden sm:inline">Fit</a>
        <a href="#about" className="text-sm text-slate-600 hover:text-brand-950 transition-colors hidden sm:inline">About</a>
        <CTAButton variant="small">
          Book a call <IconArrowRight className="w-3.5 h-3.5" />
        </CTAButton>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 md:pt-14 md:pb-24">
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-brand-950 leading-[1.1] tracking-tight max-w-3xl">
        Google Ads for roofing companies. Done right,<br className="hidden md:block" /> your phone rings.
      </h1>
      <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
        Most roofers lose money on Google Ads — not because ads don't work, because the system underneath them is broken. We fix that, then we run them.
      </p>
      <div className="mt-8 flex items-center gap-5 flex-wrap">
        <CTAButton>
          Book a 15-min diagnostic <IconArrowRight className="w-4 h-4" />
        </CTAButton>
        <span className="text-sm text-slate-500">No pitch. No pressure.</span>
      </div>
    </section>
  );
}

function Approach() {
  return (
    <Section id="approach" label="Approach">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-950 leading-tight mb-5">
        Google Ads. Just Google Ads.
      </h2>
      <div className="space-y-4 text-slate-700 leading-relaxed">
        <p>
          Most agencies sell you eight services and execute zero of them well. We sell one. If you want a partner who handles your social, email, content, and PR — we are the wrong shop.
        </p>
        <p>
          If you want someone who installs the tracking the right way, builds the campaigns the right way, and shows you exactly which calls turned into jobs — keep reading.
        </p>
        <p className="font-semibold text-brand-950">
          The reason most roofers lose money isn't the algorithm. It's that the data Google needs to optimize was never sent. We fix that first.
        </p>
      </div>
    </Section>
  );
}

function WhatWeInstall() {
  const items = [
    {
      title: 'Google Ads setup verification',
      desc: 'Conversion tracking installed and tested so Google can actually see your leads.',
    },
    {
      title: 'Phone call + form tracking',
      desc: 'Every call from an ad and every form fill, tied back to the click that caused it.',
    },
    {
      title: 'CRM verification',
      desc: "Leads land in your CRM, not just your inbox. We confirm they do — before you spend.",
    },
    {
      title: 'Landing page review',
      desc: "We check the page the ad sends traffic to. If it leaks, you'll know what to fix.",
    },
  ];
  return (
    <Section label="What we install">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-950 leading-tight mb-4">
        Process transparency. No mystery.
      </h2>
      <p className="text-slate-700 leading-relaxed mb-8">
        Before a single ad goes live, we install and verify the system underneath. Every item below is documented with proof it's firing.
      </p>
      <ul className="grid sm:grid-cols-2 gap-x-10 gap-y-6">
        {items.map((item) => (
          <li key={item.title} className="border-b border-dotted border-slate-300 pb-4">
            <p className="font-semibold text-brand-950 mb-1">{item.title}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Focus() {
  const notOffered = ['Web design', 'Email marketing', 'Social media', 'SEO content', 'PR', 'Branding', 'Funnels'];
  return (
    <Section label="Focus">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-950 leading-tight mb-6">
        We do one thing. We do it monastically. We don't offer:
      </h2>
      <p className="text-slate-400 leading-relaxed flex flex-wrap gap-x-5 gap-y-2">
        {notOffered.map((item, i) => (
          <span key={item}>
            <s>{item}</s>
            {i < notOffered.length - 1 && <span className="ml-5 text-slate-300" aria-hidden>·</span>}
          </span>
        ))}
      </p>
    </Section>
  );
}

function Fit() {
  const signals = [
    {
      num: '01',
      title: "You're running ads with no idea what's working.",
      desc: "Google can't optimize what it can't see. If your conversion tracking isn't installed right, every dollar is a guess.",
    },
    {
      num: '02',
      title: "You ran ads. They didn't work. So you stopped.",
      desc: "The ads probably weren't the problem. Your tracking was never set up the right way — the algorithm was flying blind from day one.",
    },
    {
      num: '03',
      title: 'Referrals dried up and your phone went quiet.',
      desc: "Word-of-mouth doesn't scale and you can't turn it on when you need it. Google Ads gives you a lead source you can actually control.",
    },
  ];
  return (
    <Section id="fit" label="Who this is for">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-950 leading-tight mb-8">
        Three signals you're a fit.
      </h2>
      <div className="divide-y divide-slate-200">
        {signals.map((s) => (
          <div key={s.num} className="py-6 first:pt-0 last:pb-0 grid grid-cols-12 gap-4">
            <p className="col-span-2 sm:col-span-1 text-slate-400 font-medium">{s.num}</p>
            <div className="col-span-10 sm:col-span-11">
              <p className="font-semibold text-brand-950 mb-2">{s.title}</p>
              <p className="text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function WhatWeHear() {
  return (
    <Section label="What we hear">
      <p className="text-xl md:text-2xl font-medium text-brand-950 leading-snug">
        Most operators we talk to have been told their tracking is fine for two years. It isn't. When we show them what Google actually sees, it's almost always the same picture — half the conversions invisible, the rest mis-attributed.
      </p>
    </Section>
  );
}

function AboutRebootMedia() {
  return (
    <Section id="about" label="About Reboot Media">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-950 leading-tight mb-5">
        A Google Ads agency built for roofing.
      </h2>
      <div className="space-y-4 text-slate-700 leading-relaxed max-w-2xl">
        <p>
          Reboot Media is a focused Google Ads agency for roofing companies. Our team combines systems engineering and home services backgrounds — disciplines that taught us why measurement has to come before media spend.
        </p>
        <p>
          We do one thing: install the tracking infrastructure, then run the campaigns on top of it. Reboot Media LLC, based in Austin, TX.
        </p>
        <p>
          <a href="https://www.linkedin.com/company/rebootmedia-io/" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-dark font-semibold underline-offset-4 hover:underline">
            Reboot Media on LinkedIn →
          </a>
        </p>
      </div>
    </Section>
  );
}

function NextStep() {
  return (
    <Section label="Next step">
      <h2 className="text-2xl md:text-3xl font-bold text-brand-950 leading-tight mb-5">
        One 15-minute call. We tell you what's broken — or that nothing is.
      </h2>
      <p className="text-slate-700 leading-relaxed mb-8 max-w-2xl">
        No pitch. No pressure. If we can't help, we tell you and refer you out. The diagnostic is free.
      </p>
      <CTAButton>
        Book your diagnostic <IconArrowRight className="w-4 h-4" />
      </CTAButton>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200">
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-500">
        <p>Reboot Media LLC · Austin, TX</p>
        <p className="sm:text-center">
          <a href="mailto:hello@rebootmedia.us" className="hover:text-brand-950 transition-colors">
            hello@rebootmedia.us
          </a>
        </p>
        <p className="sm:text-right flex sm:justify-end items-center gap-4">
          <a href="https://www.linkedin.com/company/rebootmedia-io/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-950 transition-colors inline-flex items-center" aria-label="Reboot Media on LinkedIn">
            <IconLinkedIn className="w-4 h-4" />
          </a>
          <span>© 2026</span>
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="font-sans antialiased bg-white text-brand-950 min-h-screen">
      <Nav />
      <Hero />
      <Approach />
      <WhatWeInstall />
      <Focus />
      <Fit />
      <WhatWeHear />
      <AboutRebootMedia />
      <NextStep />
      <Footer />
    </div>
  );
}
