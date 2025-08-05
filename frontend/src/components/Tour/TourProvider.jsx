import React, { createContext, useContext, useState } from 'react';
import Joyride from 'react-joyride';
import Confetti from 'react-confetti'; // (optional, for confetti effect)

const TourContext = createContext();
export const useTour = () => useContext(TourContext);

export const TourProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);

  const startTour = (tourSteps) => {
    setSteps(tourSteps);
    setRun(true);
  };

  const handleTourCallback = (data) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      setRun(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2200);
    }
  };

  return (
    <TourContext.Provider value={{ startTour }}>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        callback={handleTourCallback}
        locale={{
          last: 'Finish Tour 🎉',
          back: 'Back',
          next: 'Next',
          skip: 'Skip',
        }}
        styles={{
          options: {
            zIndex: 99999,
            arrowColor: '#6366F1',
            backgroundColor: '#fff',
            overlayColor: 'rgba(60, 72, 120, 0.10)',
            primaryColor: '#6366F1',
            textColor: '#22223B',
            width: 420,
            borderRadius: 18,
            boxShadow: '0 10px 32px rgba(99,102,241,0.10)'
          },
          tooltip: {
            padding: '1.5rem',
            borderRadius: '1.25rem',
            fontSize: '1.08rem',
            lineHeight: 1.7,
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(60, 72, 120, 0.08)',
          },
          tooltipTitle: {
            color: '#4F46E5',
            fontWeight: 700,
            fontSize: '1.25rem',
            marginBottom: '0.75rem'
          },
          buttonNext: {
            backgroundColor: '#6366F1',
            color: '#fff',
            borderRadius: '999px',
            padding: '0.5rem 1.5rem',
            fontWeight: 700,
          },
          buttonBack: {
            color: '#6366F1',
            background: 'none',
            border: 'none',
            fontWeight: 600,
          },
          buttonClose: {
            color: '#d32f2f',
            background: 'none',
            fontWeight: 700,
            fontSize: '1.5rem',
          },
        }}
      />
      {showConfetti && <Confetti />}
      {children}
    </TourContext.Provider>
  );
};
