import { fileURLToPath } from 'node:url'
import { createStore } from './store.mjs'

export default function localApi() {
  let store
  return {
    name: 'portal-local-api',
    configureServer(server) {
      store = createStore(fileURLToPath(new URL('../data', import.meta.url)), 'portal-nacional-oficial.sqlite')
      server.httpServer?.once('close', () => store.close())
      server.middlewares.use('/api', async (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        const send = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)) }
        const host = req.headers.host
        if (!/^127\.0\.0\.1:5173$/.test(host ?? '') || (req.headers.origin && req.headers.origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'Acceso local únicamente.' })
        try {
          if (req.method === 'GET' && req.url === '/state') return send(200, store.all())
          if (req.method === 'POST' && req.url === '/restore') {
            if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Se requiere JSON.' })
            let body = ''
            for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 20000000) return send(413, { error: 'Archivo demasiado grande.' }) }
            return send(200, store.restore(JSON.parse(body)))
          }
          if (req.method !== 'POST' || !/^\/records\/[a-z]+$/.test(req.url ?? '')) return send(404, { error: 'Ruta no encontrada.' })
          if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Se requiere JSON.' })
          let body = ''
          for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 2000000) return send(413, { error: 'Archivo demasiado grande.' }) }
          return send(200, store.save(req.url.split('/').pop(), JSON.parse(body)))
        } catch (error) { return send(400, { error: error.message || 'No se pudo guardar.' }) }
      })
    },
  }
}
