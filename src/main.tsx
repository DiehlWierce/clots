import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme, readThemeMode, resolveTheme } from './telegram'
import { reportStorageFailures, useGame } from './store/useGame'
import { ErrorBoundary } from './ui/components/ErrorBoundary'
import { encodeSaveCodeCompressed } from './engine/save'
import { recordError, registerOffline, watchErrors } from './telegram'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'

// Тема применяется до первого рендера, иначе виден кадр чужой темы.
applyTheme(resolveTheme(readThemeMode()))

// Молчаливая потеря прогресса хуже честного предупреждения.
reportStorageFailures()

// Необработанные ошибки складываются локально; отправку решает игрок.
watchErrors()

// Партия и так хранится на устройстве — играть можно и без сети.
registerOffline()

const container = document.getElementById('root')
if (!container) throw new Error('Не найден корневой элемент #root')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary
      getSaveCode={() => encodeSaveCodeCompressed(useGame.getState().state)}
      onError={error => recordError(error.message, 'render')}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
