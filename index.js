//const express = require('express'); //Common JS
import express from 'express'; //ES Modules
import csrf from 'csurf';
import cookieParser from 'cookie-parser';
import usuarioRoutes from './routes/usuarioRoutes.js';
import propiedadesRoutes from './routes/propiedadesRoutes.js';
import db from './config/db.js';

//Crear la app
const app = express();

//Habilitar lectura datos de formulario
app.use( express.urlencoded({extended: true}));

//Habilitar cookie-parser
app.use( cookieParser() );

//Habilitar CSRF
app.use( csrf({cookie: true}) );

//Conectar la base de datos
try {
    await db.authenticate();
    db.sync();
    console.log('Base de datos conectada');
} catch (error) {
    console.log(error);
}

//Habilitar Pug
app.set('view engine', 'pug');
app.set('views', './views');

//Carpeta Publica
app.use(express.static('public'));

//Routing
app.use('/auth', usuarioRoutes);
app.use('/', propiedadesRoutes);

//Definir un puerto y arrancar el proyecto
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`El servidor esta funcionando en el puerto ${port}`);
});