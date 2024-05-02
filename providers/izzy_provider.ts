/**
 * @izzy/route
 *
 * (c) IzzyJs - 2024
 * For the full license information, please view the LICENSE file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import type { SerializedRoute } from '../src/types/manifest.js'
import { serializeRoute } from '../src/serialize_route.js'

declare global {
  namespace globalThis {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    var __izzy__: {
      routes: SerializedRoute[]
      current: string
    }
  }
}

export default class IzzyRouteProvider {
  constructor(protected app: ApplicationService) {}

  async ready() {
    const router = await this.app.container.make('router')

    const routes = router.toJSON() || {}
    const domains = Object.keys(routes)

    let routesJSON: { domain: string; routes: SerializedRoute[] }[] = []

    for (let domain of domains) {
      const domainRoutes = await Promise.all(routes[domain].map(serializeRoute))

      routesJSON.push({
        domain,
        routes: domainRoutes,
      })
    }

    const exists = routesJSON.find((route) => route.domain === 'root')

    if (exists) {
      this.#registerSsrRoutes(exists.routes)
      await this.#registerEdgePlugin(exists.routes)
    }
  }

  /**
   * Registers edge plugin when edge is installed
   */
  async #registerEdgePlugin(routes: SerializedRoute[]) {
    if (!this.app.usingEdgeJS) return

    const edgeExports = await import('edge.js')
    const { edgePluginIzzy: edgePluginBise } = await import('../src/plugins/edge.js')
    edgeExports.default.use(edgePluginBise(routes))
  }

  #registerSsrRoutes(routes: SerializedRoute[]) {
    globalThis.__izzy__ = {
      routes: routes,
      current: '',
    }
  }
}
