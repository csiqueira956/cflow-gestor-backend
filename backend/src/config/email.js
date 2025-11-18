import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Criar transporter do Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verificar conexão (opcional, para debug)
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Erro ao conectar ao servidor de email:', error.message);
  } else {
    console.log('✅ Servidor de email pronto para enviar mensagens');
  }
});

export default transporter;
