const { spawn } = require('child_process')
const { join } = require('path')

const root = join(__dirname, '..')
const rendererUrl = 'http://127.0.0.1:5173'

function cleanEnv() {
  const env = { ...process.env, NODE_ENV: 'development' }
  delete env.ELECTRON_RUN_AS_NODE
  return env
}

async function buildMainProcess() {
  const { build } = await import('vite')

  await build({
    configFile: false,
    root,
    define: {
      MAIN_WINDOW_VITE_DEV_SERVER_URL: JSON.stringify(rendererUrl),
      MAIN_WINDOW_VITE_NAME: JSON.stringify('main_window')
    },
    build: {
      target: 'node18',
      outDir: join(root, '.vite', 'build'),
      emptyOutDir: false,
      lib: {
        entry: join(root, 'src', 'main', 'index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.js'
      },
      rollupOptions: {
        external: ['electron', 'path', 'fs', 'crypto', 'child_process', 'better-sqlite3']
      }
    }
  })

  await build({
    configFile: false,
    root,
    build: {
      target: 'node18',
      outDir: join(root, '.vite', 'build'),
      emptyOutDir: false,
      lib: {
        entry: join(root, 'src', 'preload', 'index.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js'
      },
      rollupOptions: {
        external: ['electron']
      }
    }
  })
}

async function startRenderer() {
  const { createServer } = await import('vite')
  const server = await createServer({
    configFile: join(root, 'vite.renderer.config.ts'),
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true
    }
  })

  await server.listen()
  server.printUrls()
  return server
}

async function main() {
  const env = cleanEnv()
  const server = await startRenderer()
  await buildMainProcess()

  const electronPath = require('electron')
  const electron = spawn(electronPath, ['.'], {
    cwd: root,
    env,
    stdio: 'inherit'
  })

  const shutdown = async (code = 0) => {
    electron.kill()
    await server.close()
    process.exit(code)
  }

  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  electron.on('exit', async (code) => {
    await server.close()
    process.exit(code ?? 0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
