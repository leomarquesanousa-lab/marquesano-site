'use client';
import { useRef } from 'react';
import styles from './ProjectGrid.module.css';

export default function ProjectPreview({ project }) {
  const dialog = useRef(null);
  const titleId = `project-${project.slug}`;
  return <>
    <div className={styles.actions}>
      <button type="button" className="refinedBtn" onClick={() => dialog.current.showModal()} aria-haspopup="dialog" aria-label={`Ver projeto ${project.name}`}>Ver projeto</button>
      <a className="refinedBtn" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visitar site ${project.name} (nova aba)`}>Visitar site ↗</a>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
      <div className={styles.dialogHeader}><div><h2 id={titleId}>{project.name}</h2><p>{project.category}</p></div><button type="button" className="refinedBtn" autoFocus onClick={() => dialog.current.close()} aria-label="Fechar apresentação">Fechar ×</button></div>
      <p>{project.description}</p>
      <div className={styles.gallery}>{project.pages.map(page => <figure key={page.image}>
        <figcaption><h3>{page.label}</h3><a href={page.url} target="_blank" rel="noopener noreferrer">Abrir página ↗</a></figcaption>
        <img src={page.image} alt={`Captura real de ${page.label} — ${project.name}`} width="1440" height="1200" loading="lazy" decoding="async" />
      </figure>)}</div>
      <a className="refinedBtn" href={project.url} target="_blank" rel="noopener noreferrer">Visitar site ↗</a>
    </dialog>
  </>;
}
