import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
})

/**
 * Solicitar permisos y obtener el token push de Expo.
 * Retorna null si el dispositivo no es físico o el usuario deniega permisos.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Las notificaciones push solo funcionan en dispositivos físicos.')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Permisos de notificación denegados.')
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('attendance', {
      name: 'Recordatorios de Asistencia',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1e3a5f',
    })
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-eas-project-id', // Reemplazar con el ID real del proyecto EAS
  })

  return token.data
}

/**
 * Programar una notificación local de recordatorio.
 * Se llama al iniciar la app para recordar al empleado marcar entrada.
 */
export async function scheduleEntryReminder(
  entryHour: number,
  entryMinute: number
): Promise<void> {
  // Cancelar notificaciones previas del mismo tipo
  await Notifications.cancelAllScheduledNotificationsAsync()

  const now  = new Date()
  const fire = new Date()
  fire.setHours(entryHour, entryMinute - 5, 0, 0) // 5 min antes

  // Si ya pasó el horario de hoy, programar para mañana
  if (fire <= now) fire.setDate(fire.getDate() + 1)

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Recordatorio de asistencia',
      body:  '¡Recuerda marcar tu entrada! Tu turno comienza en 5 minutos.',
      sound: true,
      data:  { type: 'entry_reminder' },
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:    fire.getHours(),
      minute:  fire.getMinutes(),
    },
  })
}
