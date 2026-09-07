/**
 * Минимальные типы Telegram WebApp SDK.
 *
 * SDK подключается скриптом с telegram.org (его нельзя бандлить — Telegram
 * обновляет его сам), поэтому типы описаны здесь, а не берутся из пакета.
 * Всё опционально: клиент пользователя может быть старой версии и не иметь
 * части методов, поэтому любой вызов защищён проверкой.
 */

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
export type HapticNotificationType = 'error' | 'success' | 'warning'

export interface TelegramHapticFeedback {
  impactOccurred?: (style: HapticImpactStyle) => void
  notificationOccurred?: (type: HapticNotificationType) => void
  selectionChanged?: () => void
}

export interface TelegramThemeParams {
  bg_color?: string
  secondary_bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  header_bg_color?: string
}

export interface TelegramBackButton {
  isVisible?: boolean
  show?: () => void
  hide?: () => void
  onClick?: (handler: () => void) => void
  offClick?: (handler: () => void) => void
}

export interface TelegramSafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

export interface TelegramCloudStorage {
  setItem?: (
    key: string,
    value: string,
    callback?: (error: string | null, stored?: boolean) => void,
  ) => void
  getItem?: (key: string, callback: (error: string | null, value?: string) => void) => void
  removeItem?: (key: string, callback?: (error: string | null, removed?: boolean) => void) => void
}

export interface TelegramWebApp {
  version?: string
  platform?: string
  colorScheme?: 'light' | 'dark'
  themeParams?: TelegramThemeParams
  isExpanded?: boolean
  viewportHeight?: number
  viewportStableHeight?: number
  safeAreaInset?: TelegramSafeAreaInset
  contentSafeAreaInset?: TelegramSafeAreaInset
  initData?: string
  HapticFeedback?: TelegramHapticFeedback
  CloudStorage?: TelegramCloudStorage
  BackButton?: TelegramBackButton

  ready?: () => void
  expand?: () => void
  close?: () => void
  isVersionAtLeast?: (version: string) => boolean
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  setBottomBarColor?: (color: string) => void
  enableClosingConfirmation?: () => void
  disableVerticalSwipes?: () => void
  lockOrientation?: () => void
  onEvent?: (event: string, handler: () => void) => void
  offEvent?: (event: string, handler: () => void) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}
