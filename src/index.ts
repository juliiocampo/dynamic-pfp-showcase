import express, { Request, Response } from 'express';   // express
import bcrypt from 'bcrypt';                            // permite hashear las contraseñas
import dotenv from 'dotenv';                            // importa el archivo .env
import multer from 'multer';                            // se encarga de recibir las imagenes que se suben al servidor
import path from 'path';                                // lee extensiones de archivos
import * as jwt from 'jsonwebtoken';                    // provee un token al iniciar sesion (expira a los 10m)
import  sqlite3 from 'sqlite3';                         // driver de la db
import { open } from 'sqlite';                          // permite iniciar la db
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());

app.use(express.json());

app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'uploads/');
    },
    filename(req, file, callback) {
        const sufix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        callback(null, sufix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage })

export let db: any;

async function inicializarDb() {

    try {

        db = await open ({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });

        console.log('Se conecto a la db SQLite');

    } catch(error) {
        console.error('Error al conectar con la db SQLite', error);
    }
};

inicializarDb();

// Registro -----------------------------------------------------------------------------------------------

app.post('/api/auth/register', async (req: Request, res: Response): Promise<any> => {

    const { email, userName, password } = req.body;

    if (!email || !userName || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email no válido' });
    }

    try {

        const passHash = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO usuarios (user_name, email, pass_hash)
            VALUES ($1, $2, $3)
            RETURNING id, user_name, email, fecha_registro;
        `;

        const values = [userName, email, passHash];

        const nuevoUsuario = await db.get(query, values);

        res.status(201).json({
            mensaje: 'Usuario registrado con exito en neon :DDD',
            user: nuevoUsuario
        })

    } catch (error: any) {
        console.error('Error al registrar usuario', error);
        
        if(error.code === '23505') {
            res.status(400).json({ error: 'email y/o user_name ya existe/n' });
        }

        res.status(500).json({ error: 'Error interno del servidor al comunicarse con la db :(' });
    }
});

// Iniciar sesión -----------------------------------------------------------------------------------------

app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {

    const { userName, password } = req.body;

    if(!userName || !password) {
        return res.status(400).json({ error: 'User name y password requeridos' });
    }

    try {

        const query = `
            SELECT user_name, pass_hash
            FROM usuarios
            WHERE user_name = $1;
        `;

        const values = [userName];

        const userDb = await db.get(query, values);

        if(!userDb) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        const cmp = await bcrypt.compare(password, userDb.pass_hash);

        //para debuggear, luego eliminar
        console.log('COMPARACION CONTRASEÑA:', cmp);

        if(!cmp) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const payload = {
            id: userDb.id,
            userName: userDb.user_name
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: '10m' }
        );

        res.json({
            mensaje: 'Inicio de sesión verificado',
            token: token
        });

    } catch(error) {
        console.error('Error al iniciar sesión', error);
        return res.status(500).json({ error: 'Error al conectar con la db' });
    }
});

// Subir imagen -------------------------------------------------------------------------------------------

app.post('/api/users/:id/img', upload.single('img'), async (req: Request, res: Response): Promise<any> => {
    
    const userId = req.params.id;

    if(!req.file) {
        return res.status(400).json({ error: 'No se subio una imágen' });
    }

    const imgUrl = `/uploads/${req.file.filename}`;

    try {

        const query = `
            UPDATE usuarios
            SET pfp_url = $2
            WHERE id = $1
            RETURNING id, user_name, pfp_url;
        `;

        const values = [userId, imgUrl];

        const userActualizado = await db.get(query, values);

        if(!userActualizado) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            mensaje: 'Profile Picture actualizada con exito (ojala)',
            user: userActualizado
        });

    } catch(error) {
        console.error('Error al actualizar la pfp', error);
        res.status(500).json({ error: 'Error al conectar con la db :((((' });
    }
});

// Modificar nombre de usuario -----------------------------------------------------------------------

app.patch('/api/users/:id/username', async (req: Request, res: Response): Promise<any> => {
 
    const userId = req.params.id;
    const { userName } = req.body;
 
    if (!userName || typeof userName !== 'string' || !userName.trim()) {
        return res.status(400).json({ error: 'Nombre de usuario requerido' });
    }
 
    const trimmedName = userName.trim();
 
    try {
 
        const query = `
            UPDATE usuarios
            SET user_name = $2
            WHERE id = $1
            RETURNING id, user_name;
        `;
 
        const values = [userId, trimmedName];
 
        const userActualizado = await db.get(query, values);
 
        if (!userActualizado) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
 
        res.json({
            mensaje: 'Nombre de usuario actualizado con éxito',
            user: userActualizado
        });
 
    } catch (error: any) {
        console.error('Error al actualizar el nombre de usuario', error);
 
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' });
        }
 
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Devuelve los usuarios registrados -----------------------------------------------------------------------

app.get('/api/users', async (req: Request, res: Response) => {
    
    try {

        const query = `
            SELECT id, user_name, pfp_url
            FROM usuarios
            ORDER BY id ASC;
        `;
        
        const result = await db.all(query);

        res.json(result);

    } catch(error) {
        console.error('No se pudo fetchear los usuarios de la db', error);
        res.status(500).json({ error: 'Error al consultar la db' });
    }
});

// Busca un usuario en especifico -----------------------------------------------------------------------

app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
        const user = await db.get(`
            SELECT id, user_name, pfp_url FROM usuarios WHERE id = $1;
        `, [req.params.id]);

        const result = await db.all(user);

        if (!result) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar la db' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});