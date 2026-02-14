"use client";

import { useRouter } from "next/navigation";
import { Button, Link } from "react-aria-components";

import styles from "../landing.module.css";

export function LandingActions() {
  const router = useRouter();

  return (
    <div className={styles.heroActions}>
      <Button className={styles.primaryCta} onPress={() => router.push("/dashboard")}>
        Start Checking Proxies
      </Button>
      <Link className={styles.secondaryCta} href="#features">
        Explore Features
      </Link>
    </div>
  );
}
