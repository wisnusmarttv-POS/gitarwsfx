import { useState, useRef, useCallback, useEffect } from 'react';

export default function Knob({ value, min, max, label, onChange, color = '#00ccff', size = 60, step }) {
    const knobRef = useRef(null);
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    const range = max - min;
    const normalizedValue = (value - min) / range;
    const angle = normalizedValue * 270 - 135; // -135 to +135 degrees

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        isDragging.current = true;
        startY.current = e.clientY;
        startValue.current = value;

        const handleMouseMove = (e) => {
            if (!isDragging.current) return;
            const deltaY = startY.current - e.clientY;
            const sensitivity = step ? (range / (200 / step)) : range / 200;
            let newValue = startValue.current + deltaY * sensitivity;
            newValue = Math.max(min, Math.min(max, newValue));
            if (step) {
                newValue = Math.round(newValue / step) * step;
            } else {
                newValue = Math.round(newValue * 10) / 10;
            }
            onChange(newValue);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [value, min, max, range, onChange, step]);

    // Touch support
    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        isDragging.current = true;
        startY.current = e.touches[0].clientY;
        startValue.current = value;

        const handleTouchMove = (e) => {
            if (!isDragging.current) return;
            const deltaY = startY.current - e.touches[0].clientY;
            const sensitivity = step ? (range / (200 / step)) : range / 200;
            let newValue = startValue.current + deltaY * sensitivity;
            newValue = Math.max(min, Math.min(max, newValue));
            if (step) {
                newValue = Math.round(newValue / step) * step;
            } else {
                newValue = Math.round(newValue * 10) / 10;
            }
            onChange(newValue);
        };

        const handleTouchEnd = () => {
            isDragging.current = false;
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    }, [value, min, max, range, onChange, step]);

    const displayValue = step && step < 1 ? value.toFixed(1) : Math.round(value);

    return (
        <div className="knob-container" style={{ width: size + 20 }}>
            <div
                ref={knobRef}
                className="knob"
                style={{
                    width: size,
                    height: size,
                    '--knob-color': color,
                    '--knob-angle': `${angle}deg`
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div className="knob-body">
                    <div className="knob-indicator" />
                </div>
                <svg className="knob-track" viewBox="0 0 100 100">
                    <circle
                        className="knob-track-bg"
                        cx="50" cy="50" r="42"
                        strokeDasharray={`${270 * (Math.PI * 84 / 360)} ${Math.PI * 84}`}
                        strokeDashoffset={0}
                        transform="rotate(135 50 50)"
                    />
                    <circle
                        className="knob-track-fill"
                        cx="50" cy="50" r="42"
                        stroke={color}
                        strokeDasharray={`${normalizedValue * 270 * (Math.PI * 84 / 360)} ${Math.PI * 84}`}
                        strokeDashoffset={0}
                        transform="rotate(135 50 50)"
                    />
                </svg>
            </div>
            <div className="knob-value" style={{ color }}>{displayValue}</div>
            <div className="knob-label">{label}</div>
        </div>
    );
}
