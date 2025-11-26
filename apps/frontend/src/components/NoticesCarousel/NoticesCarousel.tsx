'use client';
import React, { useRef } from 'react';
import Image from 'next/image';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useCarousel } from '../../hooks/useCarousel';
import { CAROUSEL_SCROLL_OFFSET, Notice } from '../../utils/constants';
import { truncateText } from '../../utils/textUtils';
import './NoticesCarousel.css';

interface NoticesCarouselProps {
  notices: Notice[];
  onNoticeClick: (notice: { title: string; detail: string }) => void;
}

export const NoticesCarousel: React.FC<NoticesCarouselProps> = ({ notices, onNoticeClick }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const carousel = useCarousel(carouselRef);

  return (
    <section className="home-notices container-centered container-padded">
      <div className="home-notices-span">
        <h2>Avisos Importantes</h2>
      </div>
      <div className="notice-carousel-wrapper">
        <button
          onClick={() => carousel.scrollBy(-CAROUSEL_SCROLL_OFFSET)}
          disabled={!carousel.canScrollLeft}
          className="carousel-nav-base carousel-nav-horizontal carousel-nav-button prev notice-carousel-nav"
          aria-label="Anterior aviso"
        >
          <ArrowBackIosNewIcon />
        </button>
        <div className="notice-carousel" ref={carouselRef}>
          {notices.map(notice => (
            <div
              key={notice.id}
              className="notice-card hover-lift"
              onClick={() => onNoticeClick({ title: notice.title, detail: notice.detail })}
            >
              <Image
                src={notice.imageUrl}
                alt={notice.title}
                className="notice-card-img"
                width={300}
                height={180}
              />
              <div className="notice-card-content">
                <div className="notice-date">{notice.date}</div>
                <h4>{truncateText(notice.title, 60)}</h4>
                {notice.summary && <p>{truncateText(notice.summary, 100)}</p>}
                <a href="#" onClick={(e) => e.preventDefault()}>Leer más →</a>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => carousel.scrollBy(CAROUSEL_SCROLL_OFFSET)}
          disabled={!carousel.canScrollRight}
          className="carousel-nav-base carousel-nav-horizontal carousel-nav-button next notice-carousel-nav"
          aria-label="Siguiente aviso"
        >
          <ArrowForwardIosIcon />
        </button>
      </div>
    </section>
  );
};

