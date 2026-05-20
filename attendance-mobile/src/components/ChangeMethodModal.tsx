import { type AuthMethod } from '@/components/AttendanceAuthModal'
import { type BiometricType } from '@/services/biometricService'
import { Ionicons } from '@expo/vector-icons'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export type AttendanceMethod = AuthMethod | 'checker'

interface MethodOption {
  method:      AttendanceMethod
  label:       string
  description: string
  icon:        string
  color:       string
  bg:          string
}

interface Props {
  visible:       boolean
  currentMethod: AttendanceMethod | null
  bioEnabled:    boolean
  pinEnabled:    boolean
  bioType?:      BiometricType
  onSelect:      (method: AttendanceMethod) => void
  onCancel:      () => void
}

const ALL_OPTIONS: MethodOption[] = [
  {
    method:      'biometric',
    label:       'Huella digital',
    description: 'Usa la biometría de tu dispositivo',
    icon:        'finger-print',
    color:       '#a78bfa',
    bg:          '#2e1065',
  },
  {
    method:      'pin',
    label:       'PIN personal',
    description: 'Tu PIN de 4 dígitos del perfil',
    icon:        'keypad',
    color:       '#38bdf8',
    bg:          '#0c2a3e',
  },
  {
    method:      'checker',
    label:       'PIN del checador',
    description: 'Clave asignada por la empresa',
    icon:        'business',
    color:       '#34d399',
    bg:          '#052e16',
  },
]

export default function ChangeMethodModal({
  visible, currentMethod, bioEnabled, pinEnabled, bioType, onSelect, onCancel,
}: Props) {
  const options = ALL_OPTIONS.filter(o => {
    if (o.method === 'biometric') return bioEnabled
    if (o.method === 'pin')       return pinEnabled
    return true
  })

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>Método de registro</Text>
              <Text style={s.subtitle}>¿Cómo quieres confirmar tu asistencia?</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onCancel} hitSlop={12}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Opciones */}
          <View style={s.options}>
            {options.map(opt => {
              const active = currentMethod === opt.method
              const label  = opt.method === 'biometric'
                ? (bioType === 'facial' ? 'Face ID' : 'Huella digital')
                : opt.label
              const icon   = opt.method === 'biometric'
                ? (bioType === 'facial' ? 'scan' : 'finger-print')
                : opt.icon
              return (
                <TouchableOpacity
                  key={opt.method}
                  style={[s.option, active && s.optionActive]}
                  onPress={() => onSelect(opt.method)}
                  activeOpacity={0.8}
                >
                  {/* Ícono */}
                  <View style={[s.iconWrap, { backgroundColor: opt.bg }]}>
                    <Ionicons name={icon as any} size={26} color={opt.color} />
                  </View>

                  {/* Texto */}
                  <View style={s.optionBody}>
                    <Text style={[s.optionLabel, active && { color: '#f1f5f9' }]}>{label}</Text>
                    <Text style={s.optionDesc}>{opt.description}</Text>
                  </View>

                  {/* Indicador */}
                  <View style={[s.radio, active && s.radioActive]}>
                    {active && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Cancelar */}
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:      {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  handle:     { width: 36, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },

  header:     {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18,
    borderBottomWidth: 1, borderBottomColor: '#283144',
  },
  title:      { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 3 },
  subtitle:   { fontSize: 13, color: '#64748b' },
  closeBtn:   {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },

  options:    { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  option:     {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#131f2e', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#1e293b',
  },
  optionActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#0d1f38',
  },

  iconWrap:   { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  optionBody: { flex: 1 },
  optionLabel:{ fontSize: 15, fontWeight: '700', color: '#94a3b8', marginBottom: 3 },
  optionDesc: { fontSize: 12, color: '#475569', lineHeight: 17 },

  radio:      {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive:{ borderColor: '#3b82f6' },
  radioDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },

  cancelBtn:  {
    marginHorizontal: 16, marginTop: 18,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#283144',
    alignItems: 'center',
  },
  cancelText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
})
