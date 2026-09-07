/**
 * Пустое состояние раздела.
 *
 * Раньше обрабатывался только пустой журнал; на карте и в достижениях
 * пустота выглядела как поломка. Экран должен объяснять, чего ждать.
 */
export function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="empty__title">{title}</span>
      <span className="empty__text">{text}</span>
    </div>
  )
}
