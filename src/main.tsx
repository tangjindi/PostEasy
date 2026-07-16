import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n/I18nContext'
import './styles/index.css'

// Sync HTML lang attribute with persisted preference
const storedLang = (() => {
  try { return localStorage.getItem('posteasy_lang') } catch { return null }
})()
document.documentElement.lang = storedLang === 'en' ? 'en' : 'zh-CN'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
)
