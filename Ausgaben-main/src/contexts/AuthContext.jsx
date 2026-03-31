import { createContext, useContext, useState, useEffect } from 'react';
import { getUser } from '../utils/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('urlaubUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        getUser(parsed.id).then(user => {
          if (user) {
            setCurrentUser(user);
          } else {
            localStorage.removeItem('urlaubUser');
          }
          setLoading(false);
        }).catch(() => {
          localStorage.removeItem('urlaubUser');
          setLoading(false);
        });
      } catch {
        localStorage.removeItem('urlaubUser');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem('urlaubUser', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('urlaubUser');
    localStorage.removeItem('currentVacation');
  };

  const refreshUser = async () => {
    if (currentUser) {
      const user = await getUser(currentUser.id);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('urlaubUser', JSON.stringify(user));
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
