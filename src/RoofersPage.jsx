import { useEffect } from 'react'
import PreQualForm from './roofers/PreQualForm.jsx'
import { initPixel, captureAttribution } from './roofers/tracking.js'

function Logo({ className = 'w-7 h-7' }) {
  return <img src="/logo.svg" alt="" className={className} />
}

function BrandMark() {
  return (
    <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 pt-8 md:pt-10">
      <Logo className="h-7 w-7" />
      <span className="text-base font-bold tracking-tight text-roof-ink">Reboot Media</span>
    </div>
  )
}

function PrimaryCTA({ className = '' }) {
  return (
    <a
      href="#prequal-form"
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-[17px] font-semibold text-white transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${className}`}
    >
      See if you qualify →
    </a>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-10 text-center md:pb-28 md:pt-16">
      <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-roof-ink sm:text-4xl md:text-5xl">
        A roofing calendar that stays full — every season.
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-roof-ink md:text-lg">
        We build one system that keeps qualified appointments booked on your calendar. Storm or shine. Guaranteed in writing.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <PrimaryCTA />
        <span className="text-sm font-medium text-roof-ink">
          Guaranteed. 5 roofers per cohort. First appointment within 14 days.
        </span>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="border-t border-roof-border-subtle bg-roof-paper">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <h2 className="mb-5 text-2xl font-bold leading-tight text-roof-ink md:text-3xl">
          Roofing was never supposed to be a chase.
        </h2>
        <p className="text-[17px] leading-relaxed text-roof-ink md:text-lg">
          Storm to storm. Referral to referral. Busy one month, dead the next. The chase costs you the things that matter — your focus, your craft, your time at home. The problem was never you. It's that you never had a system feeding you work on purpose.
        </p>
      </div>
    </section>
  )
}

function WhatWeBuild() {
  const pillars = [
    {
      title: 'Tracking that tells the truth:',
      desc: 'we know which clicks become booked jobs, so the spend works.',
    },
    {
      title: 'Campaigns built to book:',
      desc: 'the right roofs, the right searches, in your service area.',
    },
    {
      title: 'A calendar that fills:',
      desc: 'pre-qualified appointments, confirmed, on your schedule. You show up and quote.',
    },
  ]
  return (
    <section className="border-t border-roof-border-subtle bg-roof-surface">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <h2 className="mb-10 text-2xl font-bold leading-tight text-roof-ink md:text-3xl">
          One system. Built to keep the calendar full.
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {pillars.map((p) => (
            <p key={p.title} className="text-[17px] leading-relaxed text-roof-ink md:text-lg">
              <span className="font-semibold">{p.title}</span> {p.desc}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

function Unlock() {
  return (
    <section className="border-t border-roof-border-subtle bg-roof-paper">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <h2 className="mb-5 text-2xl font-bold leading-tight text-roof-ink md:text-3xl">
          No more dry seasons.
        </h2>
        <p className="text-[17px] leading-relaxed text-roof-ink md:text-lg">
          Steady work you can plan around. The freedom to focus on the craft, lead your crew, and be home for dinner — instead of living on the phone chasing the next job. Roofing that feels like a business, not a gamble.
        </p>
      </div>
    </section>
  )
}

function Guarantee() {
  return (
    <section className="border-t border-roof-border-subtle bg-roof-ink">
      <div className="mx-auto max-w-2xl px-6 py-16 text-center md:py-20">
        <h2 className="mb-5 text-2xl font-bold leading-tight text-white md:text-3xl">
          20 qualified appointments in 90 days. In writing.
        </h2>
        <p className="text-[17px] leading-relaxed text-roof-ink-muted md:text-lg">
          Pre-qualified, booked, on your calendar. If we miss the floor, you get a free month — no argument. First appointment lands within 14 days of launch. That's the guarantee, in the contract, on day one.
        </p>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Apply:', desc: "a few questions to see if we're a fit." },
    { n: '2', title: 'We build:', desc: 'tracking, campaign, and calendar live in days.' },
    { n: '3', title: 'Appointments hit your calendar:', desc: 'first one within 14 days, guaranteed.' },
  ]
  return (
    <section className="border-t border-roof-border-subtle bg-roof-surface">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <h2 className="mb-10 text-2xl font-bold leading-tight text-roof-ink md:text-3xl">
          How it works.
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                {s.n}
              </span>
              <p className="text-[17px] leading-relaxed text-roof-ink md:text-lg">
                <span className="font-semibold">{s.title}</span> {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ScarcityAndForm() {
  return (
    <section className="border-t border-roof-border-subtle bg-roof-paper">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-5 text-2xl font-bold leading-tight text-roof-ink md:text-3xl">
            We take 5 roofers per cohort.
          </h2>
          <p className="text-[17px] leading-relaxed text-roof-ink md:text-lg">
            So every account gets built right, not rushed. See if a slot is yours.
          </p>
        </div>
        <div className="rounded-2xl border border-roof-border-subtle bg-roof-surface p-6 md:p-10">
          <PreQualForm />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-roof-border-subtle bg-roof-paper">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-14 text-center md:py-16">
        <p className="text-sm text-roof-muted">
          Reboot Media LLC · Austin, TX ·{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="text-roof-muted underline decoration-roof-border-strong/40 underline-offset-2 hover:text-roof-ink"
          >
            Privacy
          </a>
        </p>
        <PrimaryCTA />
      </div>
    </footer>
  )
}

export default function RoofersPage() {
  useEffect(() => {
    initPixel()
    captureAttribution()
  }, [])

  return (
    <div className="min-h-screen bg-roof-paper font-sans text-roof-ink antialiased">
      <BrandMark />
      <main>
        <Hero />
        <Problem />
        <WhatWeBuild />
        <Unlock />
        <Guarantee />
        <HowItWorks />
        <ScarcityAndForm />
      </main>
      <Footer />
    </div>
  )
}
