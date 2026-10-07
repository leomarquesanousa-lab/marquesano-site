import Link from 'next/link';
import Icon from '../pets/components/Icon';
import PetLogo from '../pets/components/PetLogo';
import styles from './pets-promotion.module.css';
export default function PetsPromotion(){
 return <section className={styles.section} aria-labelledby="pets-promotion-title">
  <div className={styles.banner}>
   <div className={styles.visual}>
    <img className={styles.photo} src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1000&q=85" alt="Cachorro golden retriever olhando com carinho" width={700} height={800} loading="eager"/>
    <div className={styles.photoCaption}><Icon name="heart" size={22}/><span>Mais visibilidade.<br/><strong>Mais chances de reencontro.</strong></span></div>
   </div>
   <div className={styles.inner}><div className={styles.content}>
    <div className={styles.brands}><PetLogo context="promotion"/><div className={styles.signature}><span>Uma iniciativa</span><img src="/images/logoazul.png" alt="Marquesano" width={2172} height={724}/></div></div>
    <h2 id="pets-promotion-title">Perdeu um pet? Encontrou um animal? Ajude essa história a ter um final feliz.</h2>
    <p>Com o Pet Find você pode divulgar animais perdidos, encontrados e para adoção, compartilhar nas redes sociais e ajudar mais pets a reencontrarem suas famílias.</p>
    <ul className={styles.highlights}>{['Publique gratuitamente','Compartilhe nas redes sociais','Ajude pets a voltarem para casa','Apoie adoções'].map(label=><li key={label}><Icon name="check" size={16}/>{label}</li>)}</ul>
    <Link href="/pets" className={styles.cta}>Conhecer o Pet Find <Icon name="arrow" size={19}/></Link>
   </div></div>
  </div>
 </section>;
}
