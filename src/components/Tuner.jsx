import { useEffect, useRef, useState } from 'react';
import { getInputAnalyser } from '../audio/audioEngine.js';

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function autoCorrelate(buf, sampleRate) {
    let SIZE = buf.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
        const val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);

    if (rms < 0.01) // not enough signal
        return -1;

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
        if (Math.abs(buf[i]) < thres) {
            r1 = i;
            break;
        }
    }
    for (let i = 1; i < SIZE / 2; i++) {
        if (Math.abs(buf[SIZE - i]) < thres) {
            r2 = SIZE - i;
            break;
        }
    }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    const c = new Array(SIZE).fill(0);
    for (let i = 0; i < SIZE; i++) {
        for (let j = 0; j < SIZE - i; j++) {
            c[i] = c[i] + buf[j] * buf[j + i];
        }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}

function noteFromPitch(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
}

const Tuner = ({ isOpen, onClose }) => {
    const [pitch, setPitch] = useState(0);
    const [note, setNote] = useState("-");
    const [detune, setDetune] = useState(0);
    const [isActive, setIsActive] = useState(false);

    const requestRef = useRef();

    useEffect(() => {
        if (!isOpen) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const analyser = getInputAnalyser();
        if (!analyser) return;

        const bufferLength = 2048;
        const buffer = new Float32Array(bufferLength);
        const audioContext = analyser.context;

        const updatePitch = () => {
            analyser.getFloatTimeDomainData(buffer);
            const ac = autoCorrelate(buffer, audioContext.sampleRate);

            if (ac !== -1) {
                const noteNum = noteFromPitch(ac);
                const noteName = NOTE_STRINGS[noteNum % 12];
                const detuneAmount = centsOffFromPitch(ac, noteNum);

                setPitch(Math.round(ac));
                setNote(noteName);
                setDetune(detuneAmount);
                setIsActive(true);
            } else {
                setIsActive(false);
            }

            requestRef.current = requestAnimationFrame(updatePitch);
        };

        updatePitch();

        return () => cancelAnimationFrame(requestRef.current);
    }, [isOpen]);

    if (!isOpen) return null;

    // Visuals
    const needleRotation = Math.max(-45, Math.min(45, detune)); // Clamp to -45 to 45 deg
    const isInTune = Math.abs(detune) < 5;
    const color = isInTune ? '#00ff00' : (detune < 0 ? '#ffcc00' : '#ff4444');

    return (
        <div className="tuner-overlay">
            <div className="tuner-box">
                <div className="tuner-header">
                    <h3>TUNER</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="tuner-display">
                    <div className="tuner-note" style={{ color: isInTune ? '#00ff00' : '#fff' }}>
                        {note}
                    </div>
                    <div className="tuner-freq">
                        {isActive ? `${pitch} Hz` : '-- Hz'}
                    </div>
                </div>

                <div className="tuner-meter">
                    <div className="meter-scale">
                        <span className="tick-mark center"></span>
                        <span className="tick-mark left"></span>
                        <span className="tick-mark right"></span>
                    </div>
                    <div
                        className="tuner-needle"
                        style={{ transform: `translateX(-50%) rotate(${needleRotation}deg)`, backgroundColor: color }}
                    ></div>
                </div>

                <div className="tuner-status">
                    {isActive ? (Math.abs(detune) < 5 ? "IN TUNE" : (detune < 0 ? "FLAT ♭" : "SHARP ♯")) : "NO SIGNAL"}
                </div>
            </div>
        </div>
    );
};

export default Tuner;
