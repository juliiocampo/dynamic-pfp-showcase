import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
 
interface JwtPayload {
  id: number;
  userName: string;
  exp?: number;
}
 
interface ProfileUpdate {
  userName?: string;
  pfpUrl?: string;
}
 
interface AuthContextType {
  token: string | null;
  isLoggedIn: boolean;
  userId: number | null;
  userName: string | null;
  pfpUrl: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  updateProfile: (updates: ProfileUpdate) => void;
}
 
const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
 
  // const decodeAndSet = (storedToken: string) => {
  //   const decoded = jwtDecode<JwtPayload>(storedToken);
  //   const currentTime = Date.now() / 1000;
 
  //   if (decoded.exp && decoded.exp < currentTime) {
  //     console.log('Sesion expirada. Cerrando sesion...');
  //     localStorage.removeItem('jwt_token');
  //     setToken(null);
  //     setUserId(null);
  //     setUserName(null);
  //     return;
  //   }
 
  //   setToken(storedToken);
  //   setUserId(decoded.id);
  //   setUserName(decoded.userName);
 
  //   // Restaurar pfpUrl guardada localmente
  //   const savedPfp = localStorage.getItem(`pfp_url_${decoded.id}`);
  //   if (savedPfp) setPfpUrl(savedPfp);
  // };
 
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    if (!storedToken) return;
    try {
        const decoded = jwtDecode<JwtPayload>(storedToken);
        const currentTime = Date.now() / 1000;
        if (decoded.exp && decoded.exp < currentTime) {
            localStorage.removeItem('jwt_token');
            return;
        }
        setToken(storedToken);
        setUserId(decoded.id);
        setUserName(decoded.userName);

        // Fetchear pfp_url actual
        fetch(`http://localhost:3000/api/users/${decoded.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(userData => {
                if (userData?.pfp_url) {
                    setPfpUrl(userData.pfp_url);
                    localStorage.setItem(`pfp_url_${decoded.id}`, userData.pfp_url);
                } else {
                    const saved = localStorage.getItem(`pfp_url_${decoded.id}`);
                    if (saved) setPfpUrl(saved);
                }
            });
    } catch {
        localStorage.removeItem('jwt_token');
    }
}, []);
 
  const login = async (newToken: string) => {
    localStorage.setItem('jwt_token', newToken);
    try {
        const decoded = jwtDecode<JwtPayload>(newToken);
        setToken(newToken);
        setUserId(decoded.id);
        setUserName(decoded.userName);

        const res = await fetch(`http://localhost:3000/api/users/${decoded.id}`);
        if (res.ok) {
            const userData = await res.json();
            const url = userData.pfp_url ?? null;
            setPfpUrl(url);
            if (url) localStorage.setItem(`pfp_url_${decoded.id}`, url);
        }
    } catch {
        console.error('Token inválido');
    }
};
 
  const logout = () => {
    setToken(null);
    setUserId(null);
    setUserName(null);
    setPfpUrl(null);
    localStorage.removeItem('jwt_token');
  };
 
  const updateProfile = (updates: ProfileUpdate) => {
    if (updates.userName !== undefined) setUserName(updates.userName);
    if (updates.pfpUrl !== undefined) {
      setPfpUrl(updates.pfpUrl);
      if (userId) localStorage.setItem(`pfp_url_${userId}`, updates.pfpUrl);
    }
  };
 
  const isLoggedIn = !!token;
 
  return (
    <AuthContext.Provider value={{ token, isLoggedIn, userId, userName, pfpUrl, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
 
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};