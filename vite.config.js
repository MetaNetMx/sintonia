import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Carga .env y .env.local al process.env para que las funciones de api/ lean sus
// claves server-side en desarrollo. .env.local TIENE PRECEDENCIA sobre el entorno
// del sistema (evita que una clave ambiente invalida tape la tuya). Las variables
// sin prefijo VITE_ NO se exponen al cliente.
function cargarEnvArchivos() {
  for (const archivo of ['.env', '.env.local']) {
    let texto;
    try {
      texto = fs.readFileSync(path.resolve(process.cwd(), archivo), 'utf8');
    } catch {
      continue;
    }
    for (const linea of texto.split(/\r?\n/)) {
      if (!linea || linea.trim().startsWith('#')) continue;
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let valor = m[2];
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      process.env[m[1]] = valor;
    }
  }
}

// Puente de desarrollo: sirve las funciones de api/ bajo `vite dev` para poder
// probar el flujo completo localmente (con las claves en .env.local) SIN
// `vercel dev`. Solo en desarrollo (`apply: 'serve'`); en produccion las
// funciones las sirve Vercel nativamente, sin pasar por aqui.
function apiDev() {
  return {
    name: 'api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) return next();

        // Resuelve el nombre de la funcion (api/<nombre>.js) de forma segura.
        const nombre = url
          .split('?')[0]
          .replace(/^\/api\//, '')
          .replace(/[^a-zA-Z0-9_-]/g, '');
        if (!nombre) return next();

        try {
          const modulo = await server.ssrLoadModule(`/api/${nombre}.js`);
          if (!modulo || typeof modulo.default !== 'function') return next();

          // Adapta la respuesta al estilo Vercel/Express que usan los handlers.
          if (typeof res.status !== 'function') {
            res.status = (codigo) => {
              res.statusCode = codigo;
              return res;
            };
          }
          if (typeof res.send !== 'function') {
            res.send = (cuerpo) => {
              res.end(cuerpo);
              return res;
            };
          }

          await modulo.default(req, res);
        } catch (err) {
          server.config.logger.error(
            `[api-dev] error en /api/${nombre}: ${err?.stack || err?.message || err}`
          );
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Error interno en la funcion de desarrollo' }));
          }
        }
      });
    },
  };
}

// Configuracion de Vite. El build (produccion) es solo cliente y no depende de
// la carpeta api/.
export default defineConfig(() => {
  cargarEnvArchivos();

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiDev(),
      VitePWA({
        registerType: 'autoUpdate',
        // Manifest minimo. Iconos vacios a proposito.
        // TODO: agregar iconos (192x192 y 512x512) antes del despliegue a produccion.
        manifest: {
          name: 'Sintonia (provisional)',
          short_name: 'Sintonia',
          display: 'standalone',
          theme_color: '#1c2321',
          background_color: '#12100e',
          icons: [], // TODO: iconos pendientes
        },
      }),
    ],
  };
});
