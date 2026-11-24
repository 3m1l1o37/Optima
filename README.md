# Óptima · Investigación de operaciones

App web estática para plantear y resolver ejercicios de programación lineal,
transporte, asignación y transbordo.

## Abrir en tu computadora

1. Descomprime el ZIP.
2. Abre `index.html` en tu navegador.
3. Elige un método y pulsa **Cargar ejemplo** para probarlo.

Los cálculos se realizan en el navegador. Puedes usar la app local sin iniciar
sesión, instalar paquetes ni ejecutar un servidor. La tipografía Manrope se
carga desde Google Fonts si hay conexión, con una fuente del sistema como respaldo.

## Archivos

- `index.html` contiene la pantalla de inicio y el nombre del integrante.
- `style.css` define los estilos y el diseño adaptable.
- `app.js` contiene los formularios, los ejemplos, los procedimientos,
  las gráficas y la resolución de asignación.
- `solver.js` implementa el simplex de dos fases, los rangos óptimos
  y las operaciones geométricas del método gráfico.

Para editar los ejemplos iniciales, busca el objeto `examples` en `app.js`.
Para publicar tu versión, sube los cuatro archivos de la app a un alojamiento
estático y mantenlos en la misma carpeta.
