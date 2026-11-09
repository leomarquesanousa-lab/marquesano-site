import { projects } from '../config/portfolio.mjs';
import ProjectPreview from './ProjectPreview';
import styles from './ProjectGrid.module.css';

export default function ProjectGrid() {
  return <div className={styles.grid}>{projects.map((project, index) => <article className={styles.card} key={project.slug}>
    <div className={styles.media}>
      <img className={styles.cover} src={project.image} alt={`Captura real da página principal — ${project.name}`} width="1440" height="1200" loading="lazy" decoding="async" />
      <span className={styles.category}>{project.category}</span>
    </div>
    <div className={styles.info}>
      <div className={styles.heading}><h3>{project.name}</h3><span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>
      <span className={styles.domain}>{new URL(project.url).hostname}</span>
      <p>{project.description}</p>
      <ProjectPreview project={project} />
    </div>
  </article>)}</div>;
}
