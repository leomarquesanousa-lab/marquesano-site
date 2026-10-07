'use client';

import { useEffect, useState } from 'react';
import styles from './home-banner-carousel.module.css';

const durations = [20000, 8000];
const labels = ['Marquesano', 'Pet Find'];

export default function HomeBannerCarousel({ commercial, pets }) {
  const [slide, setSlide] = useState(0);
  const [revision, setRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (paused || focused) return;
    const timer = setTimeout(() => setSlide(current => (current + 1) % 2), durations[slide]);
    return () => clearTimeout(timer);
  }, [slide, revision, paused, focused]);

  function select(index) {
    setSlide(index);
    setRevision(current => current + 1);
  }

  return (
    <div className={styles.carousel} role="region" aria-roledescription="carrossel" aria-label="Destaques da Marquesano"
      onFocusCapture={event => setFocused(!event.target.closest(`.${styles.controls}`))}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}>
      <div className={styles.slides}>
        {[commercial, pets].map((content, index) => (
          <div key={labels[index]} className={`${styles.slide} ${slide === index ? styles.active : ''}`}
            role="group" aria-roledescription="slide" aria-label={`${index + 1} de 2: ${labels[index]}`}
            aria-hidden={slide !== index} inert={slide !== index}>
            {content}
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <button type="button" onClick={() => select((slide + 1) % 2)} aria-label="Slide anterior">‹</button>
        {labels.map((label, index) => (
          <button key={label} type="button" className={styles.indicator} aria-label={`Mostrar ${label}`}
            aria-current={slide === index ? 'true' : undefined} onClick={() => select(index)}>
            <span />
          </button>
        ))}
        <button type="button" onClick={() => select((slide + 1) % 2)} aria-label="Próximo slide">›</button>
        <button type="button" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Retomar carrossel' : 'Pausar carrossel'} aria-pressed={paused}>
          {paused ? '▶' : 'Ⅱ'}
        </button>
      </div>
    </div>
  );
}
