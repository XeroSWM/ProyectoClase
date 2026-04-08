const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

// Servir el frontend estático
app.use(express.static(path.join(__dirname, '../frontend')));

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Inicializar la base de datos con un dato de prueba
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mensajes (
        id SERIAL PRIMARY KEY,
        texto VARCHAR(100)
      );
    `);
    // Insertar solo si está vacía para no duplicar en cada reinicio
    const res = await pool.query('SELECT COUNT(*) FROM mensajes');
    if (res.rows[0].count === '0') {
      await pool.query("INSERT INTO mensajes (texto) VALUES ('Hola desde la base de datos PostgreSQL')");
    }
    console.log('Base de datos inicializada');
  } catch (error) {
    console.error('Error al inicializar la BD', error);
  }
}
initDB();

// Ruta que hace el SELECT a la BD y llama al API de terceros
app.get('/api/data', async (req, res) => {
  try {
    // 1. SELECT a la base de datos
    const dbResult = await pool.query('SELECT texto FROM mensajes LIMIT 1');
    const dbMessage = dbResult.rows.length > 0 ? dbResult.rows[0].texto : 'No hay datos en la BD';

    // 2. Consumo de API de terceros (usando fetch nativo de Node.js)
    const apiResponse = await fetch('https://jsonplaceholder.typicode.com/users/1');
    const apiData = await apiResponse.json();

    // 3. Devolver la respuesta combinada
    res.json({
      db_message: dbMessage,
      third_party_api_user: apiData.name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});