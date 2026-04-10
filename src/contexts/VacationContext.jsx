import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getVacations, getVacation, getExpenses, getDestinations } from '../utils/db';
import { useAuth } from './AuthContext';

const VacationContext = createContext(null);

export function VacationProvider({ children }) {
  const { currentUser } = useAuth();
  const [vacations, setVacations] = useState([]);
  const [currentVacation, setCurrentVacation] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [destinations, setDestinations] = useState([]);
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
          try {
            const dests = await getDestinations(vac.id);
            setDestinations(dests);
          } catch { setDestinations([]); }
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
      const dests = await getDestinations(vacationId);
      setDestinations(dests);
    }
  };

  const refreshDestinations = async () => {
    if (currentVacation) {
      const dests = await getDestinations(currentVacation.id);
      setDestinations(dests);
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
      vacations, currentVacation, expenses, destinations, loading,
      selectVacation, loadVacations, refreshExpenses, refreshDestinations, refreshVacation
    }}>
      {children}
    </VacationContext.Provider>
  );
}

export function useVacation() {
  return useContext(VacationContext);
}
