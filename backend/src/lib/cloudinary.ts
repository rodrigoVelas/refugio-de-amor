// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ''
const API_KEY = process.env.CLOUDINARY_API_KEY || ''
const API_SECRET = process.env.CLOUDINARY_API_SECRET || ''

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.warn('⚠️  Cloudinary no está configurado correctamente')
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
})

console.log('☁️  Cloudinary configurado:', CLOUD_NAME)

export default cloudinary