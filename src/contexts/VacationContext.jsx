import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getVacations, getVacation, getExpenses } from '../utils/db';
import { useAuth } from './AuthContext';

const VacationContext = createContext(null);

export function VacationProvider({ children }) {
  const { currentUser } = useAuth();
  const [vacations, setVacations] = useState([]);
  const [currentVacation, setCurrentVacation] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVacations = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const vacs = await getVacations(currentUser.id);
      setVacations(vacs);

      const storedId = localStorage.getItem('currentVacation');
      if (storedId) {
        const vac = vacs.find(v => v.id === storedId);
        if (vac) {
          setCurrentVacation(vac);
          try {
            const exps = await getExpenses(vac.id);
            setExpenses(exps);
          } catch { setExpenses([]); }
        } else if (vacs.length > 0) {
          await selectVacation(vacs[0].id);
        }
      } else if (vacs.length > 0) {
        await selectVacation(vacs[0].id);
      }
    } catch (err) {
      console.error('Error loading vacations:', err);
      setVacations([]);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadVacations();
  }, [loadVacations]);

  const selectVacation = async (vacationId) => {
    const vac = await getVacation(vacationId);
    if (vac) {
      setCurrentVacation(vac);
      localStorage.setItem('currentVacation', vacationId);
      const exps = await getExpenses(vacationId);
      setExpenses(exps);
    }
  };

  const refreshExpenses = async () => {
    if (currentVacation) {
      const exps = await getExpenses(currentVacation.id);
      setExpenses(exps);
    }
  };

  const refreshVacation = async () => {
    if (currentVacation) {
      const vac = await getVacation(currentVacation.id);
      setCurrentVacation(vac);
    }
  };

  return (
    <VacationContext.Provider value={{
      vacations, currentVacation, expenses, loading,
      selectVacation, loadVacations, refreshExpenses, refreshVacation
    }}>
      {children}
    </VacationContext.Provider>
  );
}

export function useVacation() {
  return useContext(VacationContext);
}
