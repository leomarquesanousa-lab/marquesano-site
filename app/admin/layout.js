import styles from './admin.module.css';
export const metadata = {
  title: 'Marquesano Admin', description: 'Área administrativa privada da Marquesano.',
  robots: { index: false, follow: false }, openGraph: null, twitter: null
};
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default function AdminLayout({ children }) { return <div className={styles.admin}>{children}</div>; }
