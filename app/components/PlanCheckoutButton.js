import Link from 'next/link';
import styles from './PlanCheckoutButton.module.css';

export default function PlanCheckoutButton({ code, name, className, children }) {
  return <Link href={`/checkout/${code}`} className={`${className} ${styles.button}`}>
    Assinar {name}{children}
  </Link>;
}
