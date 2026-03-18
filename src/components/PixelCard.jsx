import React from 'react';
import './PixelCard.css';

const PixelCard = ({ children, className = '' }) => {
    return (
        <div className={`pixel-card ${className}`}>
            {children}
        </div>
    );
};

export default PixelCard;
