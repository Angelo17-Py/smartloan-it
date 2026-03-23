const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 SERVIR FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

// 🔥 LOGIN COMO PÁGINA PRINCIPAL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// RUTAS API
app.use('/equipos', require('./rutas/equipos'));
app.use('/prestamos', require('./rutas/prestamos'));
app.use('/devoluciones', require('./rutas/devoluciones'));
app.use('/usuarios', require('./rutas/usuarios'));

app.listen(3000, () => {
  console.log('🚀 Sistema en http://localhost:3000');
});