// Sin overrides: react-native-reanimated se resuelve desde node_modules.
//
// Hasta SDK 53 este archivo apuntaba reanimated a C:\rn mediante un junction,
// porque sus fuentes C++ excedían el límite de 260 caracteres de Windows.
// Con reanimated 4 (SDK 54) la estructura de carpetas cambió y el junction,
// que además se quedó con la versión vieja, provocaba una dependencia nativa
// duplicada (3.17.5 en C:\rn + 4.1.x en node_modules).
//
// Si un build local vuelve a fallar por rutas demasiado largas, verificar
// primero que LongPathsEnabled esté activo (paso 1 del README) antes de
// reintroducir un junction.
module.exports = {};
