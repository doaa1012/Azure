import React, { createContext, useContext, useState } from 'react';
import Joyride from 'react-joyride';

const TourContext = createContext();

export const useTour = () => useContext(TourContext);

export const TourProvider = ({ children }) => {
const [run, setRun] = useState(false);
const [steps, setSteps] = useState([]);

const startTour = (tourSteps) => {
  setSteps(tourSteps);
  setRun(true);  // Start the tour
};

const handleTourCallback = (data) => {
  const { status } = data;

  if (status === 'finished' || status === 'skipped') {
    setRun(false);  // Reset so it can be triggered again
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
  styles={{
    options: {
      zIndex: 9999,
      arrowColor: '#fff',
      backgroundColor: '#fff',
      primaryColor: '#6C63FF',
      textColor: '#333',
    },
  }}
/>

      {children}
    </TourContext.Provider>
  );
};