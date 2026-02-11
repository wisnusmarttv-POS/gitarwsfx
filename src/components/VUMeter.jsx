import { useRef, useEffect } from 'react';

export default function VUMeter({ analyser, label, color = '#00ff88' }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        function draw() {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getFloatTimeDomainData(dataArray);

            // Calculate RMS
            let rms = 0;
            for (let i = 0; i < bufferLength; i++) {
                rms += dataArray[i] ** 2;
            }
            rms = Math.sqrt(rms / bufferLength);
            const db = 20 * Math.log10(Math.max(rms, 0.0001));
            const level = Math.max(0, Math.min(1, (db + 60) / 60));

            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(0, 0, w, h, 4);
            ctx.fill();

            // Level bars
            const barCount = 20;
            const barWidth = (w - 8) / barCount;
            const barHeight = h - 8;

            for (let i = 0; i < barCount; i++) {
                const barLevel = (i + 1) / barCount;
                const x = 4 + i * barWidth;

                if (barLevel <= level) {
                    let barColor;
                    if (barLevel > 0.85) {
                        barColor = '#ff4444';
                    } else if (barLevel > 0.7) {
                        barColor = '#ffaa00';
                    } else {
                        barColor = color;
                    }

                    ctx.fillStyle = barColor;
                    ctx.shadowColor = barColor;
                    ctx.shadowBlur = 4;
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                    ctx.shadowBlur = 0;
                }

                ctx.fillRect(x + 1, 4, barWidth - 2, barHeight);
            }

            ctx.shadowBlur = 0;
        }

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [analyser, color]);

    return (
        <div className="vu-meter">
            <span className="vu-label">{label}</span>
            <canvas ref={canvasRef} width={160} height={24} className="vu-canvas" />
        </div>
    );
}
