import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Zenvy Browser',
    executableName: 'zenvy-browser',
    appBundleId: 'com.zenvy.browser',
    extraResource: ['resources'],
    // Include node_modules that need to be available at runtime
    asar: {
      unpack: '*.{node,dll}'
    }
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'zenvy_browser'
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDMG({
      name: 'Zenvy Browser'
    }),
    new MakerDeb({
      options: {
        name: 'zenvy-browser',
        productName: 'Zenvy Browser',
        categories: ['Utility']
      }
    }),
    new MakerRpm({
      options: {
        name: 'zenvy-browser',
        productName: 'Zenvy Browser',
        categories: ['Utility']
      }
    })
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main'
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    })
  ]
};

export default config;
