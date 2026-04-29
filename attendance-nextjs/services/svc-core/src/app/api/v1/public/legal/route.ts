import { withPublic, apiOk } from '@attendance/shared'
import { prisma } from '@attendance/shared'

const DEFAULT_TERMS = `TÉRMINOS DE USO — TiempoYa

Última actualización: enero 2025

1. ACEPTACIÓN DE LOS TÉRMINOS
Al acceder y utilizar TiempoYa, usted acepta estar sujeto a estos Términos de Uso. Si no está de acuerdo con alguno de estos términos, no utilice el servicio.

2. DESCRIPCIÓN DEL SERVICIO
TiempoYa es una plataforma de gestión de asistencia laboral que permite a las empresas registrar, monitorear y reportar la asistencia de sus empleados mediante aplicaciones web y móvil con GPS integrado.

3. REGISTRO DE CUENTA
Para utilizar el servicio debe registrar una cuenta proporcionando información verídica y actualizada. Es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas desde su cuenta.

4. USO ACEPTABLE
Usted se compromete a:
• Usar el servicio únicamente para fines legales y legítimos relacionados con el control de asistencia laboral.
• No intentar acceder sin autorización a cuentas de otras empresas o usuarios.
• No interferir con el funcionamiento normal del servicio.
• Mantener la exactitud y veracidad de los datos ingresados.
• Cumplir con la legislación laboral aplicable en su país respecto al registro de asistencia.

5. DATOS DE EMPLEADOS
Como empresa usuaria, usted es el responsable del tratamiento de los datos personales de sus empleados. Debe informar a sus empleados sobre el uso de esta plataforma para el registro de su asistencia y obtener los consentimientos necesarios conforme a la legislación vigente.

6. PLANES Y PAGOS
Los planes de suscripción y sus precios están descritos en la plataforma. Los precios pueden modificarse con previo aviso de 30 días. Los pagos se facturan por adelantado según el ciclo elegido (mensual o anual). No se realizan reembolsos por períodos ya facturados, salvo disposición legal expresa.

7. DISPONIBILIDAD DEL SERVICIO
Nos comprometemos a mantener una disponibilidad del 99% del servicio, salvo mantenimientos programados que serán comunicados con antelación. No somos responsables por interrupciones causadas por terceros o fuerza mayor.

8. PROPIEDAD INTELECTUAL
Todo el software, diseño, marcas y contenido de TiempoYa son propiedad exclusiva de sus desarrolladores. Queda prohibida la reproducción, distribución o modificación sin autorización expresa por escrito.

9. LIMITACIÓN DE RESPONSABILIDAD
TiempoYa no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del servicio, incluyendo pérdida de datos, lucro cesante o interrupción del negocio.

10. MODIFICACIONES DE LOS TÉRMINOS
Nos reservamos el derecho de modificar estos términos en cualquier momento. Notificaremos los cambios significativos con al menos 15 días de anticipación. El uso continuado del servicio tras la notificación implica la aceptación de los nuevos términos.

11. TERMINACIÓN
Podemos suspender o cancelar su acceso si viola estos términos, si el pago de su suscripción se encuentra vencido más allá del período de gracia, o si detectamos un uso fraudulento del servicio.

12. LEY APLICABLE
Estos términos se rigen por las leyes del país de constitución del proveedor del servicio. Cualquier controversia se resolverá ante los tribunales competentes de dicha jurisdicción.

Para consultas sobre estos términos: soporte@tiempoya.net`

const DEFAULT_PRIVACY = `POLÍTICA DE PRIVACIDAD — TiempoYa

Última actualización: enero 2025

1. INFORMACIÓN QUE RECOPILAMOS
Recopilamos la siguiente información para proveer el servicio:

Datos de la empresa:
• Nombre de la empresa, correo electrónico de contacto
• Información del administrador (usuario, correo, contraseña cifrada)
• País y zona horaria

Datos de empleados:
• Nombre completo, documento de identidad, cargo y departamento
• Horarios asignados y registros de entrada/salida
• Fotografías de perfil (opcionales)
• Coordenadas GPS al momento del fichaje (si está habilitado)

Datos técnicos:
• Dirección IP, tipo de dispositivo y navegador
• Registros de acceso y actividad en la plataforma

2. CÓMO USAMOS SU INFORMACIÓN
Utilizamos los datos recopilados para:
• Proveer, mantener y mejorar el servicio de control de asistencia
• Generar reportes, estadísticas y análisis de asistencia laboral
• Enviar notificaciones relacionadas con el servicio y su suscripción
• Detectar y prevenir fraudes o usos no autorizados
• Cumplir obligaciones legales y requerimientos de seguridad

3. ALMACENAMIENTO Y SEGURIDAD
Sus datos se almacenan en servidores seguros con las siguientes medidas de protección:
• Cifrado en tránsito mediante HTTPS/TLS
• Cifrado de contraseñas mediante algoritmos seguros (bcrypt)
• Controles de acceso por roles y permisos
• Backups automáticos diarios
• Monitoreo de seguridad continuo

4. COMPARTICIÓN DE DATOS
No vendemos, alquilamos ni cedemos sus datos a terceros con fines comerciales. Solo compartimos información en los siguientes casos:
• Con proveedores de infraestructura tecnológica necesarios para el funcionamiento del servicio, bajo acuerdos de confidencialidad
• Con autoridades competentes cuando sea requerido por ley o resolución judicial
• Con su consentimiento explícito para casos específicos

5. RETENCIÓN DE DATOS
• Los datos se conservan durante toda la vigencia de su suscripción activa
• Tras la cancelación, los datos se mantienen por 90 días para posible reactivación
• Pasados los 90 días, los datos son eliminados de forma permanente y segura
• Puede solicitar la eliminación anticipada contactando a nuestro equipo

6. DERECHOS DEL USUARIO
Como usuario del servicio, usted tiene derecho a:
• Acceder a todos sus datos personales almacenados en la plataforma
• Rectificar información incorrecta o desactualizada
• Solicitar la eliminación de sus datos (derecho al olvido)
• Exportar sus datos en formato estándar (CSV, Excel)
• Oponerse o restringir el tratamiento de sus datos
• Retirar su consentimiento en cualquier momento

Para ejercer estos derechos, contáctenos en: privacidad@tiempoya.net

7. COOKIES
Utilizamos únicamente cookies de sesión estrictamente necesarias para el funcionamiento del servicio (autenticación y preferencias básicas). No utilizamos cookies de rastreo publicitario ni compartimos datos con redes de publicidad.

8. GEOLOCALIZACIÓN
El registro de ubicación GPS durante el fichaje es una función opcional que debe ser habilitada explícitamente por el administrador de la empresa. Los empleados son informados cuando esta función está activa.

9. TRANSFERENCIA INTERNACIONAL DE DATOS
En caso de que sus datos sean procesados en servidores ubicados fuera de su país de residencia, garantizamos niveles de protección equivalentes mediante acuerdos contractuales adecuados y cumplimiento de normativas internacionales de privacidad.

10. CAMBIOS A ESTA POLÍTICA
Notificaremos cualquier cambio significativo a esta política con al menos 15 días de anticipación mediante correo electrónico o aviso destacado en la plataforma. La versión vigente siempre estará disponible en la página de registro.

11. CONTACTO Y RECLAMACIONES
Para consultas, solicitudes o reclamaciones sobre privacidad:
Email: privacidad@tiempoya.net

Tiene derecho a presentar una reclamación ante la autoridad de protección de datos de su país si considera que el tratamiento de sus datos no cumple con la normativa aplicable.`

export const GET = withPublic(async () => {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
    select: { termsOfUse: true, privacyPolicy: true },
  })
  return apiOk({
    termsOfUse:    settings?.termsOfUse    || DEFAULT_TERMS,
    privacyPolicy: settings?.privacyPolicy || DEFAULT_PRIVACY,
  })
})
