import React, { useState } from 'react';
import './Avatar.css';
import Image from 'next/image';

interface AvatarProps {
  /** URL de la imagen del avatar */
  src?: string;
  /** Texto alternativo para la imagen */
  alt?: string;
  /** Iniciales a mostrar si no hay imagen */
  initials: string;
  /** Tamaño del avatar (en rem) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Clase CSS adicional */
  className?: string;
  /** Función que se ejecuta al hacer clic */
  onClick?: () => void;
  /** Si el avatar es clickeable */
  clickable?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size = 'md',
  className = '',
  onClick,
  clickable = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Mapeo de tamaños
  const sizeClasses = {
    sm: 'avatar-sm',
    md: 'avatar-md', 
    lg: 'avatar-lg',
    xl: 'avatar-xl'
  };

  const sizeClass = sizeClasses[size];
  const showImage = src && !imageError && imageLoaded;
  const cursorClass = (clickable || onClick) ? 'avatar-clickable' : '';

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div 
      className={`avatar ${sizeClass} ${cursorClass} ${className}`.trim()}
      onClick={onClick}
      {...(onClick && {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }
      })}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt || 'Avatar del usuario'}
          width={100}
          height={100}
          className="avatar-img"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <span className="avatar-initials">
          {initials}
        </span>
      )}
      
      {/* Imagen oculta para pre-cargar */}
      {src && !imageLoaded && !imageError && (
        <Image
          src={src}
          alt=""
          className="avatar-preload"
          width={100}
          height={100}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  );
};

export default Avatar;
