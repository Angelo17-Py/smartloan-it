const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// SERVIR FRONTEND
app.use(express.static(path.join(__dirname, '../frontend')));

// PÁGINA PRINCIPAL → LOGIN
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// RUTAS API
app.use('/encargados',   require('./rutas/encargados'));
app.use('/alumnos',      require('./rutas/alumnos'));
app.use('/equipos',      require('./rutas/equipos'));
app.use('/prestamos',    require('./rutas/prestamos'));
app.use('/devoluciones', require('./rutas/devoluciones'));

app.listen(3000, () => {
  console.log('🚀 SmartLoan IT en http://localhost:3000');
});
