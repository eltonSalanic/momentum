import React, { createContext, useContext, useState } from 'react';

interface GoalData {
  title: string;
  amount_cents: number;
  check_in_days: boolean[]; // Array of 7 booleans [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
}

interface OnboardingData {
  firstName: string;
  lastName: string;
  timezone: string;
  goal: GoalData;
}

interface OnboardingContextValue {
  data: OnboardingData;
  updateData: (
    updates: Partial<OnboardingData> | ((prev: OnboardingData) => OnboardingData),
  ) => void;
  updateGoal: (updates: Partial<GoalData>) => void;
  resetData: () => void;
}

const initialData: OnboardingData = {
  firstName: '',
  lastName: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  goal: {
    title: '',
    amount_cents: 500, // Default $5 stake
    check_in_days: [true, true, true, true, true, false, false], // Default Mon-Fri
  },
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(initialData);

  const updateData = (
    updates: Partial<OnboardingData> | ((prev: OnboardingData) => OnboardingData),
  ) => {
    if (typeof updates === 'function') {
      setData(updates);
    } else {
      setData((prev) => ({ ...prev, ...updates }));
    }
  };

  const updateGoal = (updates: Partial<GoalData>) => {
    setData((prev) => ({
      ...prev,
      goal: { ...prev.goal, ...updates },
    }));
  };

  const resetData = () => setData(initialData);

  return (
    <OnboardingContext.Provider value={{ data, updateData, updateGoal, resetData }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
