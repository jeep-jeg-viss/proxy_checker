import {
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  Globe2,
  Layers3,
  ShieldCheck,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "./components/theme-toggle";
import { LandingActions } from "./components/landing-actions";
import styles from "./landing.module.css";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const FEATURES: Feature[] = [
  {
    title: "Parallel health checks",
    description:
      "Validate huge proxy sets with low latency pipelines tuned for scale.",
    icon: Zap,
  },
  {
    title: "Deep protocol coverage",
    description:
      "Run consistent checks across HTTP and SOCKS endpoints with unified output.",
    icon: Globe2,
  },
  {
    title: "Anonymity scoring",
    description:
      "Classify risk and trust levels fast, so clean pools stay clean in production.",
    icon: ShieldCheck,
  },
  {
    title: "Latency intelligence",
    description:
      "Track response times, jitter, and timeout behavior before proxies fail live traffic.",
    icon: Gauge,
  },
  {
    title: "Session snapshots",
    description:
      "Keep historical runs organized for audits, diffs, and regression tracking.",
    icon: Layers3,
  },
  {
    title: "Operational alerts",
    description:
      "Catch degrading proxy quality early with thresholds built for real operations.",
    icon: Timer,
  },
];

const STATS = [
  { value: "15M+", label: "proxy checks monthly" },
  { value: "99.95%", label: "pipeline availability" },
  { value: "<180ms", label: "average validation roundtrip" },
];

const STEPS = [
  {
    title: "Ingest and normalize",
    description:
      "Drop in raw lists from any source and standardize host, port, and protocol quickly.",
  },
  {
    title: "Run targeted policies",
    description:
      "Apply reliability, anonymity, and response-time checks matched to your workload.",
  },
  {
    title: "Ship a clean pool",
    description:
      "Export verified proxy inventories directly into your tooling with full traceability.",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.backgroundAura} aria-hidden />

      <header className={styles.topBar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>PC</span>
          <span className={styles.brandText}>Proxy Checker</span>
        </Link>

        <nav className={styles.navLinks} style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 100 }} aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <Link href="/dashboard">Dashboard</Link>
          <ThemeToggle />
        </nav>
      </header>

      <section className={styles.hero}>
        <span className={styles.kicker}>
          <CheckCircle2 size={13} aria-hidden />
          Built for fast proxy reliability at scale
        </span>

        <h1>
          Validate millions of proxies with a calmer, sharper operations flow.
        </h1>

        <p>
          Proxy Checker helps teams run dependable proxy fleets with precise
          health checks, clean session history, and zero-noise monitoring.
        </p>

        <LandingActions />

        <div className={styles.statGrid} aria-label="Platform metrics">
          {STATS.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Everything operators need. Nothing they do not.</h2>
          <p>
            Every surface is designed for speed, consistency, and low-friction
            decisions under pressure.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <feature.icon size={16} aria-hidden />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>A workflow that stays fast as your proxy estate grows</h2>
        </div>

        <div className={styles.workflowGrid}>
          {STEPS.map((step, index) => (
            <article key={step.title} className={styles.workflowCard}>
              <span>{`0${index + 1}`}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.bottomCta}>
        <div>
          <h2>Launch your first clean proxy pass in minutes.</h2>
          <p>Use your existing Auth0 login and move straight into checks.</p>
        </div>
        <Link className={styles.inlineLink} href="/dashboard">
          Open Dashboard
          <ArrowUpRight size={14} aria-hidden />
        </Link>
      </section>
    </main>
  );
}
