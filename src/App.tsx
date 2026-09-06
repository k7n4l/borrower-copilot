import { useState } from 'react';
import { BorrowerSessionProvider, useBorrowerSession } from './state/borrowerSession';
import { Landing } from './screens/Landing';
import { Questionnaire } from './screens/Questionnaire';
import { Results } from './screens/Results';
import { NegotiationCardScreen } from './screens/NegotiationCardScreen';

type Screen = 'landing' | 'questions' | 'results' | 'card';

function AppShell() {
  const [screen, setScreen] = useState<Screen>('landing');
  const { reset } = useBorrowerSession();

  const restart = () => {
    reset();
    setScreen('landing');
  };

  switch (screen) {
    case 'landing':
      return <Landing onStart={() => setScreen('questions')} />;
    case 'questions':
      return <Questionnaire onDone={() => setScreen('results')} />;
    case 'results':
      return (
        <div>
          <Results onViewCard={() => setScreen('card')} onEditAnswers={() => setScreen('questions')} />
          <div className="mx-auto max-w-md px-6 pb-10 text-center">
            <button onClick={restart} className="text-sm text-ink-muted underline underline-offset-2">
              Start over with a different loan
            </button>
          </div>
        </div>
      );
    case 'card':
      return <NegotiationCardScreen onBack={() => setScreen('results')} />;
  }
}

export default function App() {
  return (
    <BorrowerSessionProvider>
      <AppShell />
    </BorrowerSessionProvider>
  );
}
