import Image from 'next/image';
import styles from './pet-logo.module.css';
export default function PetLogo({context='header'}){
 return <Image src="/images/logo-pet.png" alt="Pet Find" sizes="210px" width={2172} height={724} className={`${styles.logo} ${styles[context]||styles.header}`}/>;
}
