import React from 'react';
import './PixelButton.css';

const PixelButton = ({ children, onClick, className = '' }) => {
    return (
        <button
            className={`pixel-btn ${className}`}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

export default PixelButton;
