import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app'
import './assets/app.css'
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter><App/></BrowserRouter>
  </React.StrictMode>
)
// rebuild
// deploy v10
// force v11
