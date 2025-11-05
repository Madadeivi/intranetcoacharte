'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { User } from '../../config/api';
import { isUserBirthday, getUserSpecialEvent } from '../../utils/celebrationUtils';
import './UserAvatar.css';

interface UserAvatarProps {
  user: User | null;
  userInitials: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, userInitials }) => {
  const specialEvent = getUserSpecialEvent(user);
  const isBirthday = isUserBirthday(user);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getAvatarClasses = () => {
    const classes = ['user-avatar'];
    if (specialEvent === 'birthday') {
      classes.push('birthday-celebration');
    } else if (specialEvent === 'important-anniversary') {
      classes.push('important-anniversary-celebration');
    } else if (specialEvent === 'anniversary') {
      classes.push('anniversary-celebration');
    }
    return classes.join(' ');
  };

  const getCelebrationIcon = () => {
    if (specialEvent === 'birthday') {
      return <span className="celebration-icon celebration-birthday">🎂</span>;
    } else if (specialEvent === 'important-anniversary') {
      return <span className="celebration-icon celebration-important-anniversary">🏆</span>;
    } else if (specialEvent === 'anniversary') {
      return <span className="celebration-icon celebration-anniversary">🎉</span>;
    }
    return null;
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const showImage = user?.avatar && !imageError && imageLoaded;

  return (
    <span id="user-avatar" className={getAvatarClasses()}>
      {showImage ? (
        <Image
          src={user.avatar}
          alt={`Avatar de ${user.name || 'usuario'}`}
          width={40}
          height={40}
          className="avatar-img"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <span className="avatar-initials">{userInitials}</span>
      )}
      
      {/* Imagen oculta para pre-cargar */}
      {user?.avatar && !imageLoaded && !imageError && (
        <Image
          src={user.avatar}
          alt=""
          className="avatar-preload"
          width={40}
          height={40}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: 'none' }}
        />
      )}
      
      {getCelebrationIcon()}
      {isBirthday && (
        <>
          <span className="birthday-streamers">
            <span className="streamer streamer-1">🎊</span>
            <span className="streamer streamer-2">🎉</span>
            <span className="streamer streamer-3">🎈</span>
          </span>
          <span className="birthday-particles">
            <span className="birthday-particle"></span>
            <span className="birthday-particle"></span>
            <span className="birthday-particle"></span>
            <span className="birthday-particle"></span>
            <span className="birthday-particle"></span>
            <span className="birthday-particle"></span>
          </span>
          <span className="birthday-confetti">
            <span className="confetti-piece"></span>
            <span className="confetti-piece"></span>
            <span className="confetti-piece"></span>
            <span className="confetti-piece"></span>
            <span className="confetti-piece"></span>
          </span>
        </>
      )}
    </span>
  );
};

