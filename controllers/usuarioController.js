import { check, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import { generarJWT, generarId } from '../helpers/tokens.js';
import { emailRegistro, emailOlvidePassword } from '../helpers/email.js';

const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar Sesión',
        csrfToken: req.csrfToken(),
    });
}

const autenticar = async (req, res) => {
    //Validación de autenticación
    await check('email').isEmail().withMessage('El email es obligatorio').run(req);
    await check('password').notEmpty().withMessage('El password es obligatorio').run(req);
    
    let resultado = validationResult(req);

    //Verificar que el resultado este vacio
    if(!resultado.isEmpty()) {
        //Errores
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }
    const { email, password } = req.body;

    //Verificar que el usuario exista
    const usuario = await Usuario.findOne({ where: { email } });
    if(!usuario) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario no existe'}],
        })
    }

    //Comprobar que el usuario este confirmado
    if(!usuario.confirmado) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'Debes confirmar tu cuenta para poder iniciar sesión'}],
        })
    }

    //Revisar el password
    if(!usuario.verificarPassword(password)) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El password es incorrecto'}],
        })
    }

    //Autenticar el usuario
    const token = generarJWT({id: usuario.id, nombre: usuario.nombre});

    //Almacenar en un cookie
    return res.cookie('_token', token, {
        httpOnly: true,
        //secure: true, //Solo funciona en https
        //SameSite: 'lax', //Solo funciona en https
    }).redirect('/mis-propiedades');
}

const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina: 'Crear Cuenta',
        csrfToken: req.csrfToken(),
    });
}

const registrar = async (req, res) => {
    //Validación de datos
    await check('nombre').notEmpty().withMessage('El Nombre es Obligatorio').run(req);
    await check('email').isEmail().withMessage('Eso No Parece un Email').run(req);
    await check('password').isLength({ min: 6 }).withMessage('El password debe ser de al menos 6 caracteres').run(req);
    await check('repetir_password').equals(req.body.password).withMessage('Los Passwords no son iguales').run(req)

    let resultado = validationResult(req);

    //Verificar que el resultado este vacio
    if(!resultado.isEmpty()) {
        //Errores
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
            }
        })
    }

    //Extraer los datos
    const { nombre, email, password } = req.body

    //Verificar que el usuario no este duplicado
    const existeUsuario = await Usuario.findOne( { where : { email } })
    if(existeUsuario) {
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario ya esta registrado'}],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
            }
        })
    }

    //Almacenar el Usuario
    const usuario = await Usuario.create({
        nombre,
        email,
        password,
        token: generarId(),
    })

    //Enviar Email de Confirmación
    emailRegistro({
        nombre: usuario.nombre,
        email: usuario.email,
        token: usuario.token,
    })

    //Mostrar mensaje de congirmación
    res.render('templates/mensaje', {
        pagina: 'Cuenta Creada Correctamente',
        mensaje: 'Hemos Enviado un email de confirmación a tu correo electrónico',
    })
}

//Funcion confirmar cuenta
const confirmar = async (req, res, next) => {
    const { token } = req.params;

    //Verificar que el token sea valido
    const usuario = await Usuario.findOne({ where: { token } });
    if(!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Error al Confirmar Cuenta',
            mensaje: 'Hubo un error al confirmar tu cuenta, intenta de nuevo',
            error: true,
        })
    }

    //Verificar que el token sea valido
    usuario.token = null;
    usuario.confirmado = true;
    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Cuenta Confirmada',
        mensaje: 'La cuenta se confirmo correctamente',
    })

}


//Formulario Olvide Password
const formularioOlvidePassword = (req, res) => {
    res.render('auth/olvide-password', {
        pagina: 'Recuperar Contraseña',
        csrfToken: req.csrfToken(),
    });
}

const resetPassword = async (req, res) => {
    //Validación de datos
    await check('email').isEmail().withMessage('Eso No Parece un Email').run(req);

    let resultado = validationResult(req);

    //Verificar que el resultado este vacio
    if(!resultado.isEmpty()) {
        //Errores
        return res.render('auth/olvide-password', {
            pagina: 'Recuperar Contraseña',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }
    
    //Verificar que el usuario exista
    const { email } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });
    if(!usuario) {
        return res.render('auth/olvide-password', {
            pagina: 'Recuperar Contraseña',
            csrfToken: req.csrfToken(),
            errores: [{msg: 'El usuario no existe'}],
        })
    }

    //Generar Token y enviar el email
    usuario.token = generarId();
    await usuario.save();

    //Enviar Email de Recuperacion
    emailOlvidePassword({
        nombre: usuario.nombre,
        email: usuario.email,
        token: usuario.token,
    })

    //Renderizar mensaje
    res.render('templates/mensaje', {
        pagina: 'Reestablecer Contraseña',
        mensaje: 'Hemos Enviado un email con las instrucciones para recuperar tu contraseña',
    })
}

const comprobarToken = async (req, res, next) => {

    const { token } = req.params;
    const usuario = await Usuario.findOne({ where: { token } });
    if(!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Reestablecer Tu Password',
            mensaje: 'Hubo un error al validar tu informacion, intenta de nuevo',
            error: true,
        })
    }

    //Mostar Formulario para cambiar password
    res.render('auth/reset-password', {
        pagina: 'Reestablecer Tu Password',
        csrfToken: req.csrfToken(),
    
    })
}

const nuevoPassword = async (req, res) => {
    //Validación de datos
    await check('password').isLength({ min: 6 }).withMessage('El password debe ser de al menos 6 caracteres').run(req);
    let resultado = validationResult(req);

    //Verificar que el resultado este vacio
    if(!resultado.isEmpty()) {
        //Errores
        return res.render('auth/reset-password', {
            pagina: 'Reestablece tu Password',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }

    const { token } = req.params;
    const { password } = req.body;

    //identificar quien hace el cambio de password
    const usuario = await Usuario.findOne({ where: { token } });

    //hash del nuevo password
    const salt = await bcrypt.genSalt(10)
    usuario.password = await bcrypt.hash(password, salt);
    usuario.token = null;

    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Password Actualizado',
        mensaje: 'Tu password se actualizo correctamente',
    })

}

export {
    formularioLogin,
    autenticar,
    formularioRegistro,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resetPassword,
    comprobarToken,
    nuevoPassword,
}