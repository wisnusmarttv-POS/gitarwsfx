import React from 'react';

const Footswitches = ({ onPrevBank, onNextBank, onSelectPreset, activePresetIndex }) => {
    return (
        <div className="footswitch-board">
            <div className="fs-row top">
                <div className="footswitch-unit" onClick={onPrevBank}>
                    <div className="fs-led red"></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">BANK -</div>
                </div>
                <div className="footswitch-unit" onClick={onNextBank}>
                    <div className="fs-led red"></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">BANK +</div>
                </div>
                <div className="footswitch-unit">
                    <div className="fs-led yellow"></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">CTRL</div>
                </div>
                <div className="footswitch-unit">
                    <div className="fs-led blue"></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">TAP</div>
                </div>
            </div>

            <div className="fs-row bottom">
                <div className="footswitch-unit" onClick={() => onSelectPreset(0)}>
                    <div className={`fs-led ${activePresetIndex === 0 ? 'green on' : 'green'}`}></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">A</div>
                </div>
                <div className="footswitch-unit" onClick={() => onSelectPreset(1)}>
                    <div className={`fs-led ${activePresetIndex === 1 ? 'green on' : 'green'}`}></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">B</div>
                </div>
                <div className="footswitch-unit" onClick={() => onSelectPreset(2)}>
                    <div className={`fs-led ${activePresetIndex === 2 ? 'green on' : 'green'}`}></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">C</div>
                </div>
                <div className="footswitch-unit" onClick={() => onSelectPreset(3)}>
                    <div className={`fs-led ${activePresetIndex === 3 ? 'green on' : 'green'}`}></div>
                    <div className="footswitch-button"></div>
                    <div className="fs-label">D</div>
                </div>
            </div>
        </div>
    );
};

export default Footswitches;
