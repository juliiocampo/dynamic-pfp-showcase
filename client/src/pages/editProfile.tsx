import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getPfpUrl, updateUserName, uploadProfilePicture } from '@/services/userService';
 
const DEFAULT_PFP = '/assets/default_pfp.png';
 
export default function EditProfile() {
  const { userId, userName, pfpUrl, token, updateProfile } = useAuth();
  const navigate = useNavigate();
 
  // Nombre de usuario
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
 
  // Avatar
  const [currentPfp, setCurrentPfp] = useState<string>(pfpUrl ?? DEFAULT_PFP);
  const [recentAvatars, setRecentAvatars] = useState<string[]>(() => {
    const stored = localStorage.getItem(`recent_avatars_${userId}`);
    return stored ? JSON.parse(stored) : [];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  // Guarda la nueva pfp en recientes (máx 6, sin repetir)
  const pushToRecents = useCallback((url: string) => {
    setRecentAvatars(prev => {
      const filtered = prev.filter(u => u !== url);
      const next = [url, ...filtered].slice(0, 6);
      localStorage.setItem(`recent_avatars_${userId}`, JSON.stringify(next));
      return next;
    });
  }, [userId]);
 
  // Sube la imagen al backend
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Solo se aceptan archivos de imagen');
      return;
    }
    if (!userId || !token) {
      setUploadError('No estás autenticado');
      return;
    }
 
    setUploadLoading(true);
    setUploadError(null);
 
    try {
      const newPfpUrl = await uploadProfilePicture(userId, file, token);
      const fullUrl = getPfpUrl(newPfpUrl);
      setCurrentPfp(fullUrl);
      pushToRecents(fullUrl);
      updateProfile({ pfpUrl: newPfpUrl });
    } catch (err) {
      setUploadError('Error al subir la imagen. Intentá de nuevo.');
    } finally {
      setUploadLoading(false);
    }
  };
 
  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };
  const handleClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };
 
  // Cambio de nombre
  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === userName) {
      setIsEditingName(false);
      return;
    }
    if (!userId || !token) return;
 
    setNameLoading(true);
    setNameError(null);
 
    try {
      await updateUserName(userId, trimmed, token);
      updateProfile({ userName: trimmed });
      setIsEditingName(false);
    } catch (err: any) {
      setNameError(err.message ?? 'Error al actualizar el nombre');
    } finally {
      setNameLoading(false);
    }
  };
 
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setNameInput(userName ?? '');
      setIsEditingName(false);
    }
  };
 
  // Avatares recientes: los primeros 3 son los subidos, los demás son default
  const avatarSlots = Array.from({ length: 6 }, (_, i) => recentAvatars[i] ?? null);
 
  return (
    <div className="min-h-screen bg-white dark:bg-[#393A41] flex flex-col items-center justify-center transition-colors duration-300 relative">
 
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Volver al inicio
      </button>
 
      {/* App title */}
      <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-gray-400 dark:text-gray-500 mb-8">
        Dynamic PFP Showcase
      </p>
 
      {/* Card */}
      <div
        className="rounded-2xl px-8 py-7 flex flex-row items-center gap-8"
        style={{
          background: 'rgba(55, 57, 65, 0.95)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          minWidth: 560,
          maxWidth: 640,
        }}
      >
        {/* Left: avatar + nombre */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0" style={{ width: 120 }}>
          {/* Avatar */}
          <div
            className="rounded-full overflow-hidden border-2 border-white/20"
            style={{ width: 96, height: 96, position: 'relative' }}
          >
            {uploadLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
            )}
            <img
              src={currentPfp}
              alt="Tu avatar"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PFP; }}
            />
          </div>
 
          {/* Nombre editable */}
          <div className="flex items-center gap-1.5">
            {isEditingName ? (
              <>
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  disabled={nameLoading}
                  className="bg-transparent border-b border-white/40 text-white text-sm text-center outline-none w-24 pb-0.5 placeholder:text-white/30"
                  placeholder="Nuevo nombre"
                  maxLength={30}
                />
                {/* Botón confirmar (tilde) */}
                <button
                  onClick={handleSaveName}
                  disabled={nameLoading}
                  title="Confirmar nombre"
                  className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-white/90 transition-colors"
                >
                  {nameLoading ? (
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#393A41" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#393A41" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <>
                <span className="text-white text-sm font-medium">{userName ?? 'usuario'}</span>
                {/* Botón lápiz */}
                <button
                  onClick={() => {
                    setNameInput(userName ?? '');
                    setNameError(null);
                    setIsEditingName(true);
                  }}
                  title="Editar nombre"
                  className="text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
 
          {nameError && (
            <p className="text-red-400 text-[11px] text-center leading-tight">{nameError}</p>
          )}
        </div>
 
        {/* Right: dropzone + recientes */}
        <div className="flex flex-col gap-4 flex-1">
 
          {/* Dropzone */}
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onDrop={handleDrop}
            className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 select-none"
            style={{
                border: `2px dashed ${isDragging ? 'rgba(255,255,255,0.6)' : isHovering ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)'}`,
                background: isDragging ? 'rgba(255,255,255,0.07)' : isHovering ? 'rgba(255,255,255,0.04)' : 'transparent',
                padding: '20px 16px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
 
            {uploadLoading ? (
              <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
 
            <p className="text-[12px] text-white/50 text-center leading-tight">
              {uploadLoading
                ? 'Subiendo imagen...'
                : 'Importá tu imagen aquí'}
            </p>
          </div>
 
          {uploadError && (
            <p className="text-red-400 text-[11px] -mt-2">{uploadError}</p>
          )}
 
          {/* Avatares recientes */}
          <div>
            <p className="text-white text-[13px] font-semibold mb-0.5">Avatares recientes</p>
            <p className="text-white/40 text-[11px] mb-2.5">Tus últimas 6 imágenes de perfil.</p>
 
            <div className="flex gap-2">
              {avatarSlots.map((url, i) => (
                <button
                  key={i}
                  title={url ? 'Usar este avatar' : undefined}
                  disabled={!url || uploadLoading}
                  onClick={async () => {
                    if (!url || !userId || !token) return;
                    // Si se clickea un avatar reciente, lo vuelve a subir/setear
                    // Para simplicidad: solo actualiza la vista local (sin re-upload)
                    setCurrentPfp(url);
                    pushToRecents(url);
                    updateProfile({ pfpUrl: url });
                  }}
                  className={`rounded-full overflow-hidden border-2 transition-all duration-150 flex-shrink-0 ${
                    url
                      ? 'border-white/20 hover:border-white/60 cursor-pointer hover:scale-110'
                      : 'border-white/10 cursor-default opacity-40'
                  }`}
                  style={{ width: 40, height: 40 }}
                >
                  <img
                    src={url ?? DEFAULT_PFP}
                    alt={url ? `Avatar reciente ${i + 1}` : 'Sin imagen'}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PFP; }}
                  />
                </button>
              ))}
            </div>
          </div>
 
        </div>
      </div>
 
      <ThemeToggle />
    </div>
  );
}