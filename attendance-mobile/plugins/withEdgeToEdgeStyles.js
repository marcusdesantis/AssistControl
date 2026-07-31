const { withAndroidStyles } = require('@expo/config-plugins');

/**
 * Ajusta el tema de Android para edge-to-edge (obligatorio desde Android 16).
 *
 * 1. Elimina android:statusBarColor y android:navigationBarColor.
 *    Ambos quedaron obsoletos en Android 15 (API 35) y no tienen ningún efecto
 *    con edge-to-edge activo: el sistema dibuja las barras transparentes y la
 *    app pinta por debajo. Play Console los reporta como APIs obsoletas
 *    (Window.setStatusBarColor / setNavigationBarColor).
 *
 * 2. Fuerza iconos claros en las barras del sistema. Sin color de fondo, los
 *    iconos se dibujan sobre el contenido de la app, que acá siempre es oscuro
 *    (#0f172a). Con windowLightStatusBar=true quedarían negros sobre negro.
 *
 * Nota: esto NO elimina las llamadas obsoletas que traen react-native y
 * react-native-screens en su propio bytecode — esas dependen de sus autores.
 */

const REMOVE = ['android:statusBarColor', 'android:navigationBarColor'];

const SET = {
  // false = iconos claros (blancos), legibles sobre el fondo oscuro de la app
  'android:windowLightStatusBar': 'false',
  'android:windowLightNavigationBar': 'false',
};

module.exports = (config) =>
  withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults?.resources?.style ?? [];
    const theme = styles.find((s) => s?.$?.name === 'AppTheme');
    if (!theme) {
      console.warn('[withEdgeToEdgeStyles] no se encontró el estilo AppTheme — sin cambios');
      return cfg;
    }

    theme.item = (theme.item ?? []).filter((item) => !REMOVE.includes(item?.$?.name));

    for (const [name, value] of Object.entries(SET)) {
      const existing = theme.item.find((item) => item?.$?.name === name);
      if (existing) existing._ = value;
      else theme.item.push({ $: { name }, _: value });
    }

    return cfg;
  });
