/*
 * polynode-boilerplate-api-rest
 *
 * Released under MIT license. Copyright 2019 Jorge Duarte Rodriguez <info@malagadev.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
 * to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies
 * or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * $Id:$
 *
 * @flow
 * @format
 *
 */

const awilix = require('awilix');

const validNamespaces = ['routes', 'models', 'controllers'];

module.exports = (container, { config }) => {
  const log = container.resolve('log');

  log.trace({ msg: 'DB Dependent injections executing...' });

  const getDependencyName = (modulePath, name) => {
    const splat = modulePath.split('/');
    let i = 2;
    const lasts = [];
    log.trace({ msg: 'getDependencyName start.' });
    do {
      const tNamespace = splat[splat.length - i];
      if (validNamespaces.indexOf(tNamespace) > -1) {
        log.trace({ msg: 'valid namespace: ' + tNamespace });
        const rootName = lasts.join('');
        const forceSingular = tNamespace === 'models' || tNamespace === 'controllers';

        const namespaceFirstChar = tNamespace.charAt(0).toUpperCase();
        const namespaceRestOfChars = tNamespace.substring(1);

        const moduleTypeName =
          namespaceFirstChar +
          (forceSingular
            ? namespaceRestOfChars.substr(0, namespaceRestOfChars.length - 1)
            : namespaceRestOfChars);

        const ret = rootName + name + moduleTypeName;

        log.trace({ msg: modulePath + ' resolves to: ' + ret });

        return ret;
      } else {
        lasts.push(tNamespace);
      }
      i += 1;
    } while (i <= 5);
    throw new Error('Cant determine dep name for: ' + modulePath);
  };

  return new Promise((resolve, reject) => {
    log.trace({ msg: '[polynode-boilerplate-api-rest] Promise starts.' });

    container.loadModules(
      [
        [
          config.MODELS_PATH + '/**/*.js',
          {
            register: awilix.asFunction,
            lifetime: awilix.Lifetime.SINGLETON,
          },
        ],
        config.CONTROLLERS_PATH + '/**/*.js',
        config.ROUTES_PATH + '/**/*.js',
      ],
      {
        formatName: (name, descriptor) => getDependencyName(descriptor.path, name),
        resolverOptions: {
          lifetime: awilix.Lifetime.SINGLETON,
          register: awilix.asFunction,
        },
      }
    );
    // @todo: simplemente cargar rutas sin dependencias..... (sin usar awilix)
    const routeModules = awilix.listModules([
      config.MODELS_PATH + '/**/*.js',
      config.ROUTES_PATH + '/**/*.js',
    ]);

    routeModules.forEach(({ path: modulePath, name }, idx: number) => {
      const isLast = idx === routeModules.length - 1;
      const depName = getDependencyName(modulePath, name);
      log.debug({ msg: 'Resolving module:  ' + depName });
      container.resolve(depName);
      if (isLast) {
        resolve(true);
      }
    });
  });
};
