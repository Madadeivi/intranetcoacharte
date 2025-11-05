'use client';
import React from 'react';
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

  return (
    <span id="user-avatar" className={getAvatarClasses()}>
      {userInitials}
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

