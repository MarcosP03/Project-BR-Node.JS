import nodemailer from 'nodemailer';

const emailRegistro = async (datos) => {
    const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const { email, nombre, token } = datos;

      //Enviar Email
      await transport.sendMail({
            from: 'BienesRaices.com',
            to: email,
            subject: 'Confirma tu cuenta en BienesRaices.com',
            text: 'Confirma tu cuenta en BienesRaices.com',
            html: `
                <h1>Hola ${nombre}</h1>
                <p>Confirma tu cuenta en BienesRaices.com</p>
                <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 4000}/auth/confirmar/${token}">Confirmar Cuenta</a>
                <p>Si no creaste esta cuenta, ignora este correo</p>
            `
      })
}

const emailOlvidePassword = async (datos) => {
  const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const { email, nombre, token } = datos;

    //Enviar Email
    await transport.sendMail({
          from: 'BienesRaices.com',
          to: email,
          subject: 'Recupera tu acceso en BienesRaices.com',
          text: 'Reestablece tu Password en BienesRaices.com',
          html: `
              <h1>Hola ${nombre}</h1>
              <p>Reestable tu acceso en BienesRaices.com</p>
              <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 4000}/auth/olvide-password/${token}">Reestablecer Acceso</a>
              <p>Si no solicitaste el cambio de Password, ignora este correo</p>
          `
    })
}

export {
    emailRegistro,
    emailOlvidePassword,
}