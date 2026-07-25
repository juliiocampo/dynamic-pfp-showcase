import { useEffect, useState } from 'react';
import { fetchUsers, User } from '@/services/userService';
import { UserProfileCard } from '@/components/UserProfileCard';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/button';
import { CARD_COUNT } from '@/lib/constants';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import Login from '@/pages/login';
import Register from '@/pages/register';
import EditProfile from '@/pages/editProfile';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Prueba sesion iniciada
  const { isLoggedIn, logout } = useAuth();

  useEffect(() => {
    const getUsers = async () => {
      try {
        const usersData = await fetchUsers();
        setUsers(usersData);
      } catch (err) {
        setError('Error al obtener los usuarios');
      } finally {
        setLoading(false);
      }
    };
    getUsers();
  }, []);

  useEffect(() => {
    if (users.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % users.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [users]);

  const buttonText = isLoggedIn ? "Modificar Perfil" : "Iniciar Sesion";

  const navigate = useNavigate();

  const handleAuthButtonClick = () => {
    if(isLoggedIn) {
      navigate('/pages/edit-profile');
    } else {
      navigate('/pages/login');
    }
  }

  const getVisibleUsers = () => {
    if(users.length === 0) return [];

    const half = Math.floor(CARD_COUNT / 2);
    return Array.from({ length: CARD_COUNT }, (_, i) => {
      const offset = i - half;
      const idx = ((currentIndex + offset) % users.length + users.length) % users.length;

      return { user: users[idx], offset };
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>{error}</p>
      </div>
    );
  }

  const visibleUsers = getVisibleUsers();

  return (

    <Routes>
      <Route path='/' element={
        <div className="min-h-screen bg-white dark:bg-[#393A41] text-black dark:text-white transition-colors duration-300 p-8">
          <header className="flex items-center justify-between pb-8 border-b border-gray-800">
            <h1 className="text-4xl font-bold">Dynamic PFP Showcase</h1>
            <div className='w-36'>
              <Button 
                text = { buttonText }
                onClick={ handleAuthButtonClick }
              />
            </div>
            
          </header>
          
          <main className="pt-8">

            <div className="relative w-full h-[320px] flex items-end content-center mt-16">

              <AnimatePresence>
                {visibleUsers.map(({ user, offset }) => (
                  <UserProfileCard
                    key={ `${user.id}` } 
                    id={ user.id }
                    username={ user.user_name }
                    pfp={ user.pfp_url }
                    offset={ offset }
                  />
                ))}
              </AnimatePresence>
              
            </div>
            
          </main>
          <ThemeToggle/>
        </div>
      }/>

      <Route path='/pages/login' element={<Login/>}/>
      <Route path='/pages/register' element={<Register/>} />
      <Route path="/pages/edit-profile" element={<EditProfile/>} />
    </Routes>
    
  );
}

export default App;