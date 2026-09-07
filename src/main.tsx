import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme, readThemeMode, resolveTheme } from './telegram'
import { reportStorageFailures } from './store/useGame'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'

// Тема применяется до первого рендера, иначе виден кадр чужой темы.
applyTheme(resolveTheme(readThemeMode()))

// Молчаливая потеря прогресса хуже честного предупреждения.
reportStorageFailures()

const container = document.getElementById('root')
if (!container) throw new Error('Не найден корневой элемент #root')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
