const BACK_URL = 'http://localhost:3000'; 

export interface User {
  id: number;
  user_name: string;
  pfp_url: string | null;
}

export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch(`${BACK_URL}/api/users`);
  if (!response.ok) {
    throw new Error('Error al obtener los usuarios');
  }
  return response.json();
};

export const getPfpUrl = (pfpUrl: string | null): string => {

  if(!pfpUrl) {
    return 'public/assets/default_pfp.png'; // en caso de recien crear el perfil, se le asigna imagen default
  }

  if (pfpUrl.startsWith('http')) return pfpUrl;

  const path = pfpUrl.startsWith('.')
    ? pfpUrl.substring(1)
    : pfpUrl;

  return `${BACK_URL}${path}`
};

export const uploadProfilePicture = async (
  userId: number,
  file: File,
  token: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('img', file);
 
  const res = await fetch(`${BACK_URL}/api/users/${userId}/img`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
 
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Error al subir la imagen');
  }
 
  const data = await res.json();
  return data.user.pfp_url as string;
};

export const updateUserName = async (
  userId: number,
  newName: string,
  token: string
): Promise<void> => {
  const res = await fetch(`${BACK_URL}/api/users/${userId}/username`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userName: newName }),
  });
 
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Error al actualizar el nombre');
  }
};

export const fetchUserById = async (userId: number): Promise<User> => {
  const response = await fetch(`${BACK_URL}/api/users/${userId}`);
  if (!response.ok) throw new Error('Error al obtener el usuario');
  return response.json();
};